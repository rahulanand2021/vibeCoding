import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from . import ai, board_operations, db
from .auth import create_access_token, get_current_user, get_password_hash, verify_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

DEFAULT_BOARD_NAME = "My Board"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure default user exists with hashed password
    default_hash = get_password_hash("password")
    db.ensure_default_user(default_hash)

    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY is not set — AI endpoints will fail at runtime")
    if not db.check_connectivity():
        logger.error("Database connectivity check failed on startup")
    yield


app = FastAPI(title="Project Management API", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

frontend_out = Path(__file__).resolve().parent.parent / "frontend" / "out"

if (frontend_out / "_next").exists():
    app.mount("/_next", StaticFiles(directory=frontend_out / "_next"), name="next")
if (frontend_out / "static").exists():
    app.mount("/static", StaticFiles(directory=frontend_out / "static"), name="static")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    email: Optional[str] = Field(None, max_length=254)


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class BoardUpdate(BaseModel):
    board: Dict[str, Any]
    action: Optional[str] = None
    operation_type: Optional[str] = None


class CreateBoardRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class RenameBoardRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class AIRequest(BaseModel):
    query: str
    board: Optional[Dict[str, Any]] = None
    board_id: Optional[int] = None
    conversation: Optional[List[Dict[str, Any]]] = None


class AIResponse(BaseModel):
    text: str
    boardUpdate: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ---------------------------------------------------------------------------
# Seeded board template
# ---------------------------------------------------------------------------
def make_seeded_board(board_id_str: str = "board-1", title: str = "My Board") -> Dict[str, Any]:
    return {
        "id": board_id_str,
        "title": title,
        "columns": [
            {
                "id": "backlog",
                "title": "Backlog",
                "cards": [
                    {"id": "card-backlog-1", "title": "Collect user feedback", "details": "Gather early notes from the pilot team."},
                    {"id": "card-backlog-2", "title": "Define success metrics", "details": "Align on measurable outcomes."},
                ],
            },
            {
                "id": "todo",
                "title": "To Do",
                "cards": [
                    {"id": "card-todo-1", "title": "Draft onboarding flow", "details": "Outline key steps and required content."},
                    {"id": "card-todo-2", "title": "Plan usability session", "details": "Schedule 3 user interviews."},
                ],
            },
            {"id": "in-progress", "title": "In Progress", "cards": [
                {"id": "card-progress-1", "title": "Refine dashboard layout", "details": "Balance hierarchy and reduce visual noise."},
            ]},
            {"id": "review", "title": "Review", "cards": [
                {"id": "card-review-1", "title": "Design review", "details": "Share mockups and capture async feedback."},
            ]},
            {"id": "done", "title": "Done", "cards": [
                {"id": "card-done-1", "title": "Kickoff meeting", "details": "Align on goals, scope, and team roles."},
            ]},
        ],
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _summarise_ai_operation(op: Dict[str, Any]) -> str:
    op_type = op.get("type", "unknown")
    title = op.get("title", "")
    column_id = op.get("columnId", "")
    card_id = op.get("cardId", "")
    dest_column_id = op.get("destColumnId", "")

    if op_type == "add_card":
        return f'Added "{title}" to column {column_id}'
    if op_type == "edit_card":
        return f'Edited card "{title}"' if title else f"Edited card {card_id}"
    if op_type == "delete_card":
        return f"Deleted card {card_id}"
    if op_type == "move_card":
        return f"Moved card {card_id} to column {dest_column_id}"
    if op_type == "rename_column":
        return f'Renamed column {column_id} to "{title}"'
    if op_type == "add_column":
        return f'Added column "{title}"'
    if op_type == "delete_column":
        return f"Deleted column {column_id}"
    return f"AI operation: {op_type}"


def _ensure_user_has_board(user_id: int) -> int:
    """Ensure the user has at least one board; create default if not. Returns board_id."""
    board_id = db.get_board_id_for_user(user_id)
    if board_id is None:
        seeded = make_seeded_board()
        board_id = db.create_board(user_id, DEFAULT_BOARD_NAME, seeded, is_default=True)
    return board_id


# ---------------------------------------------------------------------------
# Health / readiness
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.get("/ready")
def ready() -> Dict[str, str]:
    if not db.check_connectivity():
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ready"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    """Register a new user account."""
    username = body.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be blank")
    password_hash = get_password_hash(body.password)
    try:
        user_id = db.create_user(username, password_hash, body.email)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Create initial default board
    seeded = make_seeded_board(title=DEFAULT_BOARD_NAME)
    db.create_board(user_id, DEFAULT_BOARD_NAME, seeded, is_default=True)

    token = create_access_token(user_id, username)
    return {"token": token, "username": username, "user_id": user_id}


@app.post("/api/auth/login")
def login(body: LoginRequest):
    """Authenticate and receive a JWT token."""
    username = body.username.strip().lower()
    user = db.get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = user.get("password_hash")
    if not password_hash:
        raise HTTPException(status_code=401, detail="Account has no password set")

    if not verify_password(body.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Ensure the user has at least one board
    _ensure_user_has_board(user["id"])

    token = create_access_token(user["id"], username)
    return {"token": token, "username": username, "user_id": user["id"]}


@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Return current user profile."""
    user = db.get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/api/auth/change-password")
def change_password(body: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Change the current user's password."""
    user = db.get_user(current_user["username"])
    if not user or not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_hash = get_password_hash(body.new_password)
    db.update_password(current_user["user_id"], new_hash)
    return {"status": "password updated"}


# ---------------------------------------------------------------------------
# Board management
# ---------------------------------------------------------------------------
@app.get("/api/boards")
def list_boards(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """List all boards for the current user."""
    user_id = current_user["user_id"]
    _ensure_user_has_board(user_id)
    boards = db.get_boards_for_user(user_id)
    return {"boards": boards}


@app.post("/api/boards", status_code=status.HTTP_201_CREATED)
def create_board(body: CreateBoardRequest, current_user: dict = Depends(get_current_user)):
    """Create a new board for the current user."""
    user_id = current_user["user_id"]
    name = body.name.strip()
    seeded = make_seeded_board(title=name)
    board_id = db.create_board(user_id, name, seeded, is_default=False)
    return {"board_id": board_id, "name": name}


@app.patch("/api/boards/{board_id}")
def rename_board(
    board_id: int,
    body: RenameBoardRequest,
    current_user: dict = Depends(get_current_user),
):
    """Rename a board."""
    user_id = current_user["user_id"]
    resolved = db.get_board_id_for_user(user_id, board_id)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Board not found")
    db.rename_board(user_id, board_id, body.name.strip())
    return {"status": "renamed"}


@app.delete("/api/boards/{board_id}")
def delete_board(board_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a board."""
    user_id = current_user["user_id"]
    resolved = db.get_board_id_for_user(user_id, board_id)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Board not found")
    try:
        db.delete_board(user_id, board_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "deleted"}


@app.post("/api/boards/{board_id}/set-default")
def set_default_board(board_id: int, current_user: dict = Depends(get_current_user)):
    """Set a board as the user's default."""
    user_id = current_user["user_id"]
    resolved = db.get_board_id_for_user(user_id, board_id)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Board not found")
    db.set_default_board(user_id, board_id)
    return {"status": "default set"}


# ---------------------------------------------------------------------------
# Board content
# ---------------------------------------------------------------------------
@app.get("/api/board")
def get_board(
    board_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user["user_id"]
    _ensure_user_has_board(user_id)
    board = db.get_board(user_id, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.post("/api/board")
def update_board(
    update: BoardUpdate,
    board_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, str]:
    user_id = current_user["user_id"]
    db.save_board(user_id, update.board, board_id)
    resolved_id = db.get_board_id_for_user(user_id, board_id)
    if update.action:
        op_type = update.operation_type or "manual"
        db.log_audit_event(user_id, "user", op_type, update.action, board_id=resolved_id)
    return {"status": "updated"}


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------
@app.get("/api/ai/ping")
def ping_ai_route() -> Dict[str, str]:
    try:
        result = ai.ping_ai()
        return {"status": "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")


@app.post("/api/ai", response_model=AIResponse)
@limiter.limit("20/minute")
def ai_route(
    request: Request,
    body: AIRequest,
    current_user: dict = Depends(get_current_user),
) -> AIResponse:
    user_id = current_user["user_id"]
    board_id = body.board_id

    _ensure_user_has_board(user_id)
    current_board = db.get_board(user_id, board_id)
    if not current_board:
        raise HTTPException(status_code=404, detail="Board not found")

    resolved_board_id = db.get_board_id_for_user(user_id, board_id)

    try:
        ai_result = ai.query_ai(body.query, current_board, body.conversation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logger.exception("Unexpected error in AI route")
        raise HTTPException(status_code=500, detail="Internal server error")

    if ai_result.get("boardUpdate") and ai_result["boardUpdate"].get("operations"):
        operations = ai_result["boardUpdate"]["operations"]
        updated_board = board_operations.apply_board_operations(current_board, operations)
        db.save_board(user_id, updated_board, resolved_board_id)
        for op in operations:
            op_type = op.get("type", "unknown")
            summary = _summarise_ai_operation(op)
            db.log_audit_event(user_id, "ai", op_type, summary, board_id=resolved_board_id)

    return AIResponse(
        text=ai_result.get("text", "I couldn't process your request."),
        boardUpdate=ai_result.get("boardUpdate"),
        actions=ai_result.get("actions"),
    )


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
@app.get("/api/audit")
def get_audit(
    limit: int = Query(100, ge=1, le=200),
    board_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user["user_id"]
    events = db.get_audit_log(user_id, limit=limit, board_id=board_id)
    return {"events": events}


# ---------------------------------------------------------------------------
# Frontend static serving
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
def root_frontend():
    if not frontend_out.exists():
        raise HTTPException(status_code=404, detail="Frontend not built")
    index_file = frontend_out / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not found")


@app.get("/{path:path}", include_in_schema=False)
def serve_frontend(path: str):
    if not frontend_out.exists():
        raise HTTPException(status_code=404, detail="Frontend not built")
    target = frontend_out / path
    if target.exists() and target.is_file():
        return FileResponse(target)
    index_file = frontend_out / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not found")
