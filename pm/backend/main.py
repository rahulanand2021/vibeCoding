import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from . import ai, board_operations, db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY is not set — AI endpoints will fail at runtime")
    if not db.check_connectivity():
        logger.error("Database connectivity check failed on startup")
    yield
    # Shutdown (nothing to do)


app = FastAPI(title="Kanban MVP backend", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

frontend_out = Path(__file__).resolve().parent.parent / "frontend" / "out"

# Optional static mounts for Next export assets
if (frontend_out / "_next").exists():
    app.mount("/_next", StaticFiles(directory=frontend_out / "_next"), name="next")
if (frontend_out / "static").exists():
    app.mount("/static", StaticFiles(directory=frontend_out / "static"), name="static")

# ---------------------------------------------------------------------------
# CORS — credentials not used (localStorage auth), so allow_credentials omitted
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class BoardUpdate(BaseModel):
    board: Dict[str, Any]
    action: Optional[str] = None
    operation_type: Optional[str] = None


class AIRequest(BaseModel):
    query: str
    board: Optional[Dict[str, Any]] = None
    conversation: Optional[List[Dict[str, Any]]] = None


class AIResponse(BaseModel):
    text: str
    boardUpdate: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# ---------------------------------------------------------------------------
# Seeded board data (canonical definition — mirrors frontend/src/lib/board.ts)
# ---------------------------------------------------------------------------
seeded_board: Dict[str, Any] = {
    "id": "board-1",
    "title": "Product Launch",
    "columns": [
        {
            "id": "backlog",
            "title": "Backlog",
            "cards": [
                {
                    "id": "card-backlog-1",
                    "title": "Collect user feedback",
                    "details": "Gather early notes from the pilot team and shortlist themes.",
                },
                {
                    "id": "card-backlog-2",
                    "title": "Define success metrics",
                    "details": "Align on measurable outcomes for launch readiness.",
                },
            ],
        },
        {
            "id": "todo",
            "title": "To Do",
            "cards": [
                {
                    "id": "card-todo-1",
                    "title": "Draft onboarding flow",
                    "details": "Outline key steps and required content.",
                },
                {
                    "id": "card-todo-2",
                    "title": "Plan usability session",
                    "details": "Schedule 3 user interviews with focused tasks.",
                },
            ],
        },
        {
            "id": "in-progress",
            "title": "In Progress",
            "cards": [
                {
                    "id": "card-progress-1",
                    "title": "Refine dashboard layout",
                    "details": "Balance hierarchy and reduce visual noise.",
                },
            ],
        },
        {
            "id": "review",
            "title": "Review",
            "cards": [
                {
                    "id": "card-review-1",
                    "title": "Design review",
                    "details": "Share mockups and capture async feedback.",
                },
            ],
        },
        {
            "id": "done",
            "title": "Done",
            "cards": [
                {
                    "id": "card-done-1",
                    "title": "Kickoff meeting",
                    "details": "Align on goals, scope, and team roles.",
                },
            ],
        },
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _summarise_ai_operation(op: Dict[str, Any]) -> str:
    """Return a human-readable sentence for one AI board operation."""
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
    return f"AI operation: {op_type}"


# ---------------------------------------------------------------------------
# Health / readiness
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.get("/ready")
def ready() -> Dict[str, str]:
    """Readiness probe: verifies DB is reachable."""
    if not db.check_connectivity():
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ready"}


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------
@app.get("/api/ai/ping")
def ping_ai_route() -> Dict[str, str]:
    """Health check for AI connectivity."""
    try:
        result = ai.ping_ai()
        return {"status": "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")


@app.post("/api/ai", response_model=AIResponse)
@limiter.limit("20/minute")
def ai_route(request: Request, body: AIRequest) -> AIResponse:
    """Query AI with optional board context and conversation history."""
    user_id = db.get_user_id("user")
    if not user_id:
        raise HTTPException(status_code=500, detail="Default user missing from database")

    current_board = db.get_board(user_id)
    if not current_board:
        db.save_board(user_id, seeded_board)
        current_board = seeded_board

    try:
        ai_result = ai.query_ai(body.query, current_board, body.conversation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in AI route")
        raise HTTPException(status_code=500, detail="Internal server error")

    if ai_result.get("boardUpdate") and ai_result["boardUpdate"].get("operations"):
        operations = ai_result["boardUpdate"]["operations"]
        updated_board = board_operations.apply_board_operations(current_board, operations)
        db.save_board(user_id, updated_board)
        for op in operations:
            op_type = op.get("type", "unknown")
            summary = _summarise_ai_operation(op)
            db.log_audit_event(user_id, "ai", op_type, summary)

    return AIResponse(
        text=ai_result.get("text", "I couldn't process your request."),
        boardUpdate=ai_result.get("boardUpdate"),
        actions=ai_result.get("actions"),
    )


# ---------------------------------------------------------------------------
# Board
# ---------------------------------------------------------------------------
@app.get("/api/board")
def get_board() -> Dict[str, Any]:
    user_id = db.get_user_id("user")
    if not user_id:
        raise HTTPException(status_code=500, detail="Default user missing from database")

    board = db.get_board(user_id)
    if not board:
        db.save_board(user_id, seeded_board)
        return seeded_board

    return board


@app.post("/api/board")
def update_board(update: BoardUpdate) -> Dict[str, str]:
    user_id = db.get_user_id("user")
    if not user_id:
        raise HTTPException(status_code=500, detail="Default user missing from database")

    db.save_board(user_id, update.board)
    if update.action:
        op_type = update.operation_type or "manual"
        db.log_audit_event(user_id, "user", op_type, update.action)
    return {"status": "updated"}


@app.get("/api/audit")
def get_audit(limit: int = 100) -> Dict[str, Any]:
    """Return the audit log for the current user."""
    user_id = db.get_user_id("user")
    if not user_id:
        raise HTTPException(status_code=500, detail="Default user missing from database")
    events = db.get_audit_log(user_id, limit=min(limit, 200))
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
