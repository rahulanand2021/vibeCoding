from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import ai, board_operations, db

app = FastAPI(title="Kanban MVP backend")

frontend_out = Path(__file__).resolve().parent.parent / "frontend" / "out"

# Optional static mounts for Next export assets
if (frontend_out / "_next").exists():
    app.mount("/_next", StaticFiles(directory=frontend_out / "_next"), name="next")
if (frontend_out / "static").exists():
    app.mount("/static", StaticFiles(directory=frontend_out / "static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BoardUpdate(BaseModel):
    board: Dict[str, Any]


class AIRequest(BaseModel):
    query: str
    board: Optional[Dict[str, Any]] = None
    conversation: Optional[List[Dict[str, Any]]] = None


class AIResponse(BaseModel):
    text: str
    boardUpdate: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = None


# Seeded board data (mirroring frontend/src/lib/board.ts)
seeded_board = {
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


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.get("/api/ai/ping")
def ping_ai() -> Dict[str, str]:
    """Health check for AI connectivity with a simple 2+2 test."""
    try:
        result = ai.ping_ai()
        return {"status": "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")


@app.post("/api/ai", response_model=AIResponse)
def ai_route(request: AIRequest) -> AIResponse:
    """Query AI with optional board context and conversation history."""
    try:
        # Get current board for context
        user_id = db.get_user_id("user")
        current_board = None
        if user_id:
            current_board = db.get_board(user_id)
            if not current_board:
                # Use seeded board if none exists
                db.save_board(user_id, seeded_board)
                current_board = seeded_board
        
        # Query AI with structured response
        ai_result = ai.query_ai(request.query, current_board, request.conversation)
        
        # Apply board updates if any
        updated_board = current_board
        if ai_result.get("boardUpdate") and ai_result["boardUpdate"].get("operations"):
            operations = ai_result["boardUpdate"]["operations"]
            updated_board = board_operations.apply_board_operations(current_board, operations)
            
            # Persist the updated board
            if user_id and updated_board != current_board:
                db.save_board(user_id, updated_board)
        
        return AIResponse(
            text=ai_result.get("text", "I couldn't process your request."),
            boardUpdate=ai_result.get("boardUpdate"),
            actions=ai_result.get("actions")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")


@app.get("/api/board")
def get_board() -> Dict[str, Any]:
    # For MVP, hardcoded user "user"
    user_id = db.get_user_id("user")
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    board = db.get_board(user_id)
    if not board:
        # Return seeded board if none exists
        db.save_board(user_id, seeded_board)
        return seeded_board
    
    return board


@app.post("/api/board")
def update_board(update: BoardUpdate) -> Dict[str, str]:
    # For MVP, hardcoded user "user"
    user_id = db.get_user_id("user")
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.save_board(user_id, update.board)
    return {"status": "updated"}


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

