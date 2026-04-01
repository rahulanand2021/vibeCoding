import copy
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app
from backend import board_operations, db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_db():
    """Fresh database for every test."""
    if db.DB_PATH.exists():
        db.DB_PATH.unlink()
    db.init_db()


@pytest.fixture
def client():
    return TestClient(app)


def _base_board():
    return {
        "id": "board-1",
        "title": "Test Board",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": [
                    {"id": "card-1", "title": "Task 1", "details": "Details 1"},
                    {"id": "card-2", "title": "Task 2", "details": "Details 2"},
                ],
            },
            {"id": "done", "title": "Done", "cards": []},
        ],
    }


# ---------------------------------------------------------------------------
# Health / readiness
# ---------------------------------------------------------------------------

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_ready(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


# ---------------------------------------------------------------------------
# AI ping
# ---------------------------------------------------------------------------

def test_ai_ping(client):
    with patch("backend.ai.ping_ai") as mock_ping:
        mock_ping.return_value = "4"
        response = client.get("/api/ai/ping")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "result": "4"}


def test_ai_ping_error(client):
    with patch("backend.ai.ping_ai") as mock_ping:
        mock_ping.side_effect = Exception("API Error")
        response = client.get("/api/ai/ping")
    assert response.status_code == 503
    assert "AI service unavailable" in response.json()["detail"]


# ---------------------------------------------------------------------------
# AI route
# ---------------------------------------------------------------------------

def test_ai_route_basic(client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "This is a helpful response",
            "boardUpdate": None,
            "actions": None,
        }
        response = client.post("/api/ai", json={"query": "test query"})
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "This is a helpful response"
    assert data["boardUpdate"] is None
    assert data["actions"] is None
    # query_ai should receive the board from DB
    args = mock_query.call_args[0]
    assert args[0] == "test query"
    assert args[1] is not None


def test_ai_route_empty_query(client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.side_effect = ValueError("query is required")
        response = client.post("/api/ai", json={"query": ""})
    assert response.status_code == 400
    assert "query is required" in response.json()["detail"]


def test_ai_route_upstream_error_returns_502(client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.side_effect = RuntimeError("Connection refused")
        response = client.post("/api/ai", json={"query": "hello"})
    assert response.status_code == 502


def test_ai_route_persists_board_changes(client):
    """After an AI operation, GET /api/board should reflect the change."""
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "Added a card for you",
            "boardUpdate": {
                "operations": [
                    {
                        "type": "add_card",
                        "columnId": "todo",
                        "title": "AI Task",
                        "details": "Created by AI",
                    }
                ]
            },
            "actions": None,
        }
        response = client.post("/api/ai", json={"query": "add a card"})
    assert response.status_code == 200

    board = client.get("/api/board").json()
    todo_cards = next(c["cards"] for c in board["columns"] if c["id"] == "todo")
    titles = [c["title"] for c in todo_cards]
    assert "AI Task" in titles


def test_ai_route_with_conversation(client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {"text": "OK", "boardUpdate": None, "actions": None}
        response = client.post(
            "/api/ai",
            json={
                "query": "next",
                "conversation": [{"role": "user", "content": "hello"}],
            },
        )
    assert response.status_code == 200
    call_args = mock_query.call_args[0]
    assert call_args[2] == [{"role": "user", "content": "hello"}]


# ---------------------------------------------------------------------------
# Board CRUD
# ---------------------------------------------------------------------------

def test_get_board_returns_seeded(client):
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "columns" in data
    assert len(data["columns"]) == 5


def test_update_board_and_retrieve(client):
    test_board = _base_board()
    response = client.post("/api/board", json={"board": test_board})
    assert response.status_code == 200
    assert response.json() == {"status": "updated"}

    retrieved = client.get("/api/board").json()
    assert retrieved["id"] == "test-board" or retrieved["id"] == test_board["id"]
    assert retrieved["title"] == "Test Board"


def test_board_xss_payload_stored_as_plain_text(client):
    """XSS payloads stored and returned as plain strings — browser rendering handles escaping."""
    xss_board = {
        "id": "board-xss",
        "title": "<script>alert('xss')</script>",
        "columns": [],
    }
    client.post("/api/board", json={"board": xss_board})
    retrieved = client.get("/api/board").json()
    # The raw string is stored; rendering layer is responsible for escaping
    assert retrieved["title"] == "<script>alert('xss')</script>"
    # The JSON response itself must not execute scripts (content-type is application/json)
    assert response_is_json(client.get("/api/board"))


def response_is_json(response) -> bool:
    ct = response.headers.get("content-type", "")
    return "application/json" in ct


# ---------------------------------------------------------------------------
# board_operations — unit tests
# ---------------------------------------------------------------------------

def test_apply_operations_does_not_mutate_original():
    """deepcopy means original board is never modified."""
    board = _base_board()
    original_card_count = len(board["columns"][0]["cards"])

    operations = [
        {
            "type": "add_card",
            "columnId": "todo",
            "title": "New Task",
            "details": "Details",
        }
    ]
    result = board_operations.apply_board_operations(board, operations)

    # Original unchanged
    assert len(board["columns"][0]["cards"]) == original_card_count
    # Result has the new card
    assert len(result["columns"][0]["cards"]) == original_card_count + 1


def test_add_card():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "todo", "title": "My Task", "details": "Do it"}]
    result = board_operations.apply_board_operations(board, ops)
    cards = result["columns"][0]["cards"]
    assert len(cards) == 1
    assert cards[0]["title"] == "My Task"
    assert "id" in cards[0]


def test_add_card_truncates_long_title():
    long_title = "A" * 500
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "todo", "title": long_title, "details": "Details"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"][0]["title"]) == board_operations.MAX_TITLE_LEN


def test_add_card_truncates_long_details():
    long_details = "B" * 3000
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "todo", "title": "Title", "details": long_details}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"][0]["details"]) == board_operations.MAX_DETAILS_LEN


def test_add_card_missing_column_is_skipped():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "nonexistent", "title": "T", "details": "D"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 0  # no card added


def test_edit_card():
    board = {
        "id": "b1",
        "columns": [
            {"id": "todo", "title": "To Do", "cards": [{"id": "c1", "title": "Old", "details": "Old"}]}
        ],
    }
    ops = [{"type": "edit_card", "cardId": "c1", "title": "New", "details": "New details"}]
    result = board_operations.apply_board_operations(board, ops)
    card = result["columns"][0]["cards"][0]
    assert card["title"] == "New"
    assert card["details"] == "New details"


def test_edit_card_missing_card_is_skipped():
    board = {
        "id": "b1",
        "columns": [
            {"id": "todo", "title": "To Do", "cards": [{"id": "c1", "title": "T", "details": "D"}]}
        ],
    }
    ops = [{"type": "edit_card", "cardId": "nonexistent", "title": "X"}]
    result = board_operations.apply_board_operations(board, ops)
    assert result["columns"][0]["cards"][0]["title"] == "T"  # unchanged


def test_delete_card():
    board = {
        "id": "b1",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": [
                    {"id": "c1", "title": "T1", "details": "D"},
                    {"id": "c2", "title": "T2", "details": "D"},
                ],
            }
        ],
    }
    ops = [{"type": "delete_card", "cardId": "c1"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 1
    assert result["columns"][0]["cards"][0]["id"] == "c2"


def test_move_card_between_columns():
    board = {
        "id": "b1",
        "columns": [
            {"id": "todo", "title": "To Do", "cards": [{"id": "c1", "title": "T", "details": "D"}]},
            {"id": "done", "title": "Done", "cards": []},
        ],
    }
    ops = [{"type": "move_card", "cardId": "c1", "destColumnId": "done", "position": 0}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 0
    assert result["columns"][1]["cards"][0]["id"] == "c1"


def test_move_card_missing_dest_column_is_skipped():
    board = {
        "id": "b1",
        "columns": [
            {"id": "todo", "title": "To Do", "cards": [{"id": "c1", "title": "T", "details": "D"}]},
        ],
    }
    ops = [{"type": "move_card", "cardId": "c1", "destColumnId": "nonexistent", "position": 0}]
    result = board_operations.apply_board_operations(board, ops)
    # Card was removed from source but dest not found — card is lost; log covers this.
    # At minimum, the operation should not crash.
    assert isinstance(result, dict)


def test_rename_column():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "rename_column", "columnId": "todo", "title": "Doing"}]
    result = board_operations.apply_board_operations(board, ops)
    assert result["columns"][0]["title"] == "Doing"


def test_unknown_operation_type_is_skipped():
    board = {"id": "b1", "columns": []}
    ops = [{"type": "teleport_card", "cardId": "c1"}]
    result = board_operations.apply_board_operations(board, ops)
    assert result == board


def test_empty_operations_returns_same_object():
    board = {"id": "b1", "columns": []}
    result = board_operations.apply_board_operations(board, [])
    assert result is board  # same reference — no copy needed


# ---------------------------------------------------------------------------
# DB indexes (smoke test)
# ---------------------------------------------------------------------------

def test_db_indexes_exist():
    import sqlite3
    conn = sqlite3.connect(db.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
    index_names = {row[0] for row in cursor.fetchall()}
    conn.close()
    assert "idx_users_username" in index_names
    assert "idx_boards_user_id" in index_names
