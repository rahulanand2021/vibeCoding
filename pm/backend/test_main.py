"""Comprehensive test suite for the Project Management API."""
import copy
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.main import app
from backend import board_operations, db
from backend.auth import create_access_token, get_password_hash


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _safe_unlink(path):
    """Delete a file, ignoring errors (Windows can hold file locks briefly)."""
    try:
        import sqlite3 as _sqlite3
        if path.exists():
            # Checkpoint WAL to ensure no open journals remain
            conn = _sqlite3.connect(str(path))
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            conn.close()
        path.unlink(missing_ok=True)
        # Also remove WAL/SHM files if present
        path.with_suffix(".db-wal").unlink(missing_ok=True)
        path.with_suffix(".db-shm").unlink(missing_ok=True)
    except Exception:
        pass


@pytest.fixture(autouse=True)
def reset_db():
    """Fresh database for every test."""
    _safe_unlink(db.DB_PATH)
    db.init_db()
    yield
    _safe_unlink(db.DB_PATH)


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def auth_client(client):
    """Client with registered user and auth token."""
    response = client.post("/api/auth/register", json={
        "username": "testuser",
        "password": "password123",
    })
    assert response.status_code == 201
    token = response.json()["token"]

    class AuthClient:
        def __init__(self, c, t):
            self.client = c
            self.token = t
            self.headers = {"Authorization": f"Bearer {t}"}

        def get(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self.headers)
            return self.client.get(url, **kwargs)

        def post(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self.headers)
            return self.client.post(url, **kwargs)

        def patch(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self.headers)
            return self.client.patch(url, **kwargs)

        def delete(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self.headers)
            return self.client.delete(url, **kwargs)

    return AuthClient(client, token)


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
# Auth — registration
# ---------------------------------------------------------------------------

def test_register_success(client):
    response = client.post("/api/auth/register", json={
        "username": "alice",
        "password": "secure123",
        "email": "alice@example.com",
    })
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["username"] == "alice"
    assert "user_id" in data


def test_register_duplicate_username(client):
    client.post("/api/auth/register", json={"username": "alice", "password": "pass123"})
    response = client.post("/api/auth/register", json={"username": "alice", "password": "other123"})
    assert response.status_code == 409
    assert "already taken" in response.json()["detail"]


def test_register_username_too_short(client):
    response = client.post("/api/auth/register", json={"username": "ab", "password": "pass123"})
    assert response.status_code == 422


def test_register_password_too_short(client):
    response = client.post("/api/auth/register", json={"username": "validuser", "password": "abc"})
    assert response.status_code == 422


def test_register_creates_default_board(client):
    response = client.post("/api/auth/register", json={"username": "bob", "password": "pass1234"})
    assert response.status_code == 201
    token = response.json()["token"]
    boards_response = client.get("/api/boards", headers={"Authorization": f"Bearer {token}"})
    assert boards_response.status_code == 200
    boards = boards_response.json()["boards"]
    assert len(boards) >= 1


# ---------------------------------------------------------------------------
# Auth — login
# ---------------------------------------------------------------------------

def test_login_default_user(client):
    """The default 'user' account should be accessible after startup."""
    # Default user is set up in lifespan; but we need to trigger it.
    # Manually ensure default user for tests.
    from backend.auth import get_password_hash
    db.ensure_default_user(get_password_hash("password"))

    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["username"] == "user"


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={"username": "alice", "password": "correct"})
    response = client.post("/api/auth/login", json={"username": "alice", "password": "wrong"})
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post("/api/auth/login", json={"username": "ghost", "password": "pass"})
    assert response.status_code == 401


def test_login_returns_valid_token(client):
    client.post("/api/auth/register", json={"username": "charlie", "password": "pass1234"})
    response = client.post("/api/auth/login", json={"username": "charlie", "password": "pass1234"})
    assert response.status_code == 200
    token = response.json()["token"]
    # Use token to access protected endpoint
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "charlie"


# ---------------------------------------------------------------------------
# Auth — protected endpoints require auth
# ---------------------------------------------------------------------------

def test_board_endpoint_requires_auth(client):
    response = client.get("/api/board")
    assert response.status_code == 401


def test_boards_list_requires_auth(client):
    response = client.get("/api/boards")
    assert response.status_code == 401


def test_audit_requires_auth(client):
    response = client.get("/api/audit")
    assert response.status_code == 401


def test_ai_requires_auth(client):
    response = client.post("/api/ai", json={"query": "hello"})
    assert response.status_code == 401


def test_invalid_token_rejected(client):
    response = client.get("/api/board", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Auth — change password
# ---------------------------------------------------------------------------

def test_change_password(auth_client):
    response = auth_client.post("/api/auth/change-password", json={
        "current_password": "password123",
        "new_password": "newpass456",
    })
    assert response.status_code == 200

    # Old token still works (token doesn't invalidate on password change in this impl)
    # But logging in with new password should work
    me = auth_client.get("/api/auth/me")
    assert me.status_code == 200


def test_change_password_wrong_current(auth_client):
    response = auth_client.post("/api/auth/change-password", json={
        "current_password": "wrongpassword",
        "new_password": "newpass456",
    })
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Board management — multiple boards
# ---------------------------------------------------------------------------

def test_list_boards_returns_default(auth_client):
    response = auth_client.get("/api/boards")
    assert response.status_code == 200
    boards = response.json()["boards"]
    assert len(boards) >= 1
    assert any(b["is_default"] == 1 for b in boards)


def test_create_board(auth_client):
    response = auth_client.post("/api/boards", json={"name": "Sprint 1"})
    assert response.status_code == 201
    data = response.json()
    assert "board_id" in data
    assert data["name"] == "Sprint 1"

    boards = auth_client.get("/api/boards").json()["boards"]
    assert len(boards) >= 2
    names = [b["name"] for b in boards]
    assert "Sprint 1" in names


def test_rename_board(auth_client):
    create_resp = auth_client.post("/api/boards", json={"name": "Old Name"})
    board_id = create_resp.json()["board_id"]

    rename_resp = auth_client.patch(f"/api/boards/{board_id}", json={"name": "New Name"})
    assert rename_resp.status_code == 200

    boards = auth_client.get("/api/boards").json()["boards"]
    names = [b["name"] for b in boards]
    assert "New Name" in names
    assert "Old Name" not in names


def test_delete_board(auth_client):
    # Create a second board so we have 2
    create_resp = auth_client.post("/api/boards", json={"name": "Temp Board"})
    board_id = create_resp.json()["board_id"]

    delete_resp = auth_client.delete(f"/api/boards/{board_id}")
    assert delete_resp.status_code == 200

    boards = auth_client.get("/api/boards").json()["boards"]
    ids = [b["id"] for b in boards]
    assert board_id not in ids


def test_delete_last_board_fails(auth_client):
    boards = auth_client.get("/api/boards").json()["boards"]
    # Ensure only 1 board
    while len(boards) > 1:
        auth_client.delete(f"/api/boards/{boards[-1]['id']}")
        boards = auth_client.get("/api/boards").json()["boards"]

    last_id = boards[0]["id"]
    response = auth_client.delete(f"/api/boards/{last_id}")
    assert response.status_code == 400
    assert "last board" in response.json()["detail"]


def test_set_default_board(auth_client):
    create_resp = auth_client.post("/api/boards", json={"name": "Second Board"})
    board_id = create_resp.json()["board_id"]

    response = auth_client.post(f"/api/boards/{board_id}/set-default")
    assert response.status_code == 200

    boards = auth_client.get("/api/boards").json()["boards"]
    defaults = [b for b in boards if b["is_default"] == 1]
    assert len(defaults) == 1
    assert defaults[0]["id"] == board_id


def test_board_isolation_between_users(client):
    """Boards from one user are not visible to another."""
    reg1 = client.post("/api/auth/register", json={"username": "user1", "password": "pass1234"})
    reg2 = client.post("/api/auth/register", json={"username": "user2", "password": "pass1234"})
    token1 = reg1.json()["token"]
    token2 = reg2.json()["token"]

    # User1 creates a board
    client.post("/api/boards", json={"name": "User1 Secret"}, headers={"Authorization": f"Bearer {token1}"})

    # User2 can't see user1's boards
    boards2 = client.get("/api/boards", headers={"Authorization": f"Bearer {token2}"}).json()["boards"]
    names = [b["name"] for b in boards2]
    assert "User1 Secret" not in names


# ---------------------------------------------------------------------------
# Board content CRUD
# ---------------------------------------------------------------------------

def test_get_board_returns_seeded(auth_client):
    response = auth_client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert "columns" in data
    assert len(data["columns"]) == 5


def test_update_board_and_retrieve(auth_client):
    test_board = _base_board()
    response = auth_client.post("/api/board", json={"board": test_board})
    assert response.status_code == 200
    assert response.json() == {"status": "updated"}

    retrieved = auth_client.get("/api/board").json()
    assert retrieved["title"] == "Test Board"
    assert len(retrieved["columns"]) == 2


def test_board_specific_by_id(auth_client):
    create_resp = auth_client.post("/api/boards", json={"name": "Sprint 2"})
    board_id = create_resp.json()["board_id"]

    custom_board = _base_board()
    custom_board["title"] = "Sprint 2 Board"
    auth_client.post(f"/api/board?board_id={board_id}", json={"board": custom_board})

    retrieved = auth_client.get(f"/api/board?board_id={board_id}").json()
    assert retrieved["title"] == "Sprint 2 Board"

    # Default board is unaffected
    default = auth_client.get("/api/board").json()
    assert default["title"] != "Sprint 2 Board"


def test_board_xss_payload_stored_as_plain_text(auth_client):
    xss_board = {
        "id": "board-xss",
        "title": "<script>alert('xss')</script>",
        "columns": [],
    }
    auth_client.post("/api/board", json={"board": xss_board})
    retrieved = auth_client.get("/api/board").json()
    assert retrieved["title"] == "<script>alert('xss')</script>"
    # Response Content-Type must be JSON (no HTML execution)
    response = auth_client.get("/api/board")
    assert "application/json" in response.headers.get("content-type", "")


def test_update_board_logs_audit(auth_client):
    test_board = _base_board()
    auth_client.post("/api/board", json={
        "board": test_board,
        "action": "Renamed column todo to Backlog",
        "operation_type": "rename_column",
    })
    audit = auth_client.get("/api/audit").json()
    assert len(audit["events"]) >= 1
    assert any(e["operation_type"] == "rename_column" for e in audit["events"])


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

def test_audit_log_empty_initially(auth_client):
    response = auth_client.get("/api/audit")
    assert response.status_code == 200
    assert response.json()["events"] == []


def test_audit_log_filtered_by_board(auth_client):
    create_resp = auth_client.post("/api/boards", json={"name": "Board B"})
    board_b_id = create_resp.json()["board_id"]

    # Log event on default board
    boards = auth_client.get("/api/boards").json()["boards"]
    default_id = next(b["id"] for b in boards if b["is_default"] == 1)
    default_board = auth_client.get(f"/api/board?board_id={default_id}").json()
    auth_client.post(f"/api/board?board_id={default_id}", json={
        "board": default_board,
        "action": "Default board action",
        "operation_type": "rename_column",
    })

    # Filter by board B
    audit_b = auth_client.get(f"/api/audit?board_id={board_b_id}").json()
    assert audit_b["events"] == []


# ---------------------------------------------------------------------------
# AI routes
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


def test_ai_route_basic(auth_client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "This is a helpful response",
            "boardUpdate": None,
            "actions": None,
        }
        response = auth_client.post("/api/ai", json={"query": "test query"})
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "This is a helpful response"


def test_ai_route_empty_query_value_error(auth_client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.side_effect = ValueError("query is required")
        response = auth_client.post("/api/ai", json={"query": ""})
    assert response.status_code == 400


def test_ai_route_upstream_error_returns_502(auth_client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.side_effect = RuntimeError("Connection refused")
        response = auth_client.post("/api/ai", json={"query": "hello"})
    assert response.status_code == 502


def test_ai_route_persists_board_changes(auth_client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "Added a card for you",
            "boardUpdate": {
                "operations": [
                    {"type": "add_card", "columnId": "todo", "title": "AI Task", "details": "Created by AI"}
                ]
            },
            "actions": None,
        }
        response = auth_client.post("/api/ai", json={"query": "add a card"})
    assert response.status_code == 200

    board = auth_client.get("/api/board").json()
    todo_cards = next(c["cards"] for c in board["columns"] if c["id"] == "todo")
    titles = [c["title"] for c in todo_cards]
    assert "AI Task" in titles


def test_ai_route_with_conversation(auth_client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {"text": "OK", "boardUpdate": None, "actions": None}
        response = auth_client.post(
            "/api/ai",
            json={
                "query": "next",
                "conversation": [{"role": "user", "content": "hello"}],
            },
        )
    assert response.status_code == 200
    call_args = mock_query.call_args[0]
    assert call_args[2] == [{"role": "user", "content": "hello"}]


def test_ai_logs_audit_events(auth_client):
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "Done",
            "boardUpdate": {
                "operations": [
                    {"type": "add_card", "columnId": "todo", "title": "Log Test", "details": "D"}
                ]
            },
            "actions": None,
        }
        auth_client.post("/api/ai", json={"query": "add card"})

    audit = auth_client.get("/api/audit").json()
    assert any(e["source"] == "ai" for e in audit["events"])


# ---------------------------------------------------------------------------
# board_operations — unit tests
# ---------------------------------------------------------------------------

def _simple_board():
    return {
        "id": "b1",
        "title": "Test",
        "columns": [
            {"id": "todo", "title": "To Do", "cards": [
                {"id": "c1", "title": "Task 1", "details": "D1"},
                {"id": "c2", "title": "Task 2", "details": "D2"},
            ]},
            {"id": "done", "title": "Done", "cards": []},
        ],
    }


def test_apply_operations_does_not_mutate_original():
    board = _simple_board()
    original_count = len(board["columns"][0]["cards"])
    ops = [{"type": "add_card", "columnId": "todo", "title": "New", "details": "D"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(board["columns"][0]["cards"]) == original_count
    assert len(result["columns"][0]["cards"]) == original_count + 1


def test_add_card():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "todo", "title": "My Task", "details": "Do it"}]
    result = board_operations.apply_board_operations(board, ops)
    cards = result["columns"][0]["cards"]
    assert len(cards) == 1
    assert cards[0]["title"] == "My Task"
    assert "id" in cards[0]


def test_add_card_with_priority_and_labels():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{
        "type": "add_card", "columnId": "todo", "title": "Featured Task",
        "details": "Important", "priority": "high", "labels": ["urgent", "backend"],
    }]
    result = board_operations.apply_board_operations(board, ops)
    card = result["columns"][0]["cards"][0]
    assert card["priority"] == "high"
    assert card["labels"] == ["urgent", "backend"]


def test_add_card_truncates_long_title():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "todo", "title": "A" * 500, "details": "D"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"][0]["title"]) == board_operations.MAX_TITLE_LEN


def test_add_card_truncates_long_details():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "todo", "title": "T", "details": "B" * 3000}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"][0]["details"]) == board_operations.MAX_DETAILS_LEN


def test_add_card_missing_column_is_skipped():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [{"type": "add_card", "columnId": "nonexistent", "title": "T", "details": "D"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 0


def test_edit_card():
    board = _simple_board()
    ops = [{"type": "edit_card", "cardId": "c1", "title": "Updated", "details": "New details"}]
    result = board_operations.apply_board_operations(board, ops)
    card = result["columns"][0]["cards"][0]
    assert card["title"] == "Updated"
    assert card["details"] == "New details"


def test_edit_card_missing_card_is_skipped():
    board = _simple_board()
    ops = [{"type": "edit_card", "cardId": "nonexistent", "title": "X"}]
    result = board_operations.apply_board_operations(board, ops)
    assert result["columns"][0]["cards"][0]["title"] == "Task 1"


def test_delete_card():
    board = _simple_board()
    ops = [{"type": "delete_card", "cardId": "c1"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 1
    assert result["columns"][0]["cards"][0]["id"] == "c2"


def test_move_card_between_columns():
    board = _simple_board()
    ops = [{"type": "move_card", "cardId": "c1", "destColumnId": "done", "position": 0}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 1
    assert result["columns"][1]["cards"][0]["id"] == "c1"


def test_move_card_missing_dest_column_does_not_crash():
    board = _simple_board()
    ops = [{"type": "move_card", "cardId": "c1", "destColumnId": "nonexistent", "position": 0}]
    result = board_operations.apply_board_operations(board, ops)
    assert isinstance(result, dict)


def test_rename_column():
    board = _simple_board()
    ops = [{"type": "rename_column", "columnId": "todo", "title": "Backlog"}]
    result = board_operations.apply_board_operations(board, ops)
    assert result["columns"][0]["title"] == "Backlog"


def test_add_column():
    board = _simple_board()
    ops = [{"type": "add_column", "title": "QA"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"]) == 3
    titles = [c["title"] for c in result["columns"]]
    assert "QA" in titles


def test_add_column_with_explicit_id():
    board = _simple_board()
    ops = [{"type": "add_column", "title": "Review", "columnId": "review"}]
    result = board_operations.apply_board_operations(board, ops)
    col = next(c for c in result["columns"] if c["title"] == "Review")
    assert col["id"] == "review"
    assert col["cards"] == []


def test_delete_column():
    board = _simple_board()
    ops = [{"type": "delete_column", "columnId": "done"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"]) == 1
    assert result["columns"][0]["id"] == "todo"


def test_delete_last_column_is_skipped():
    board = {"id": "b1", "columns": [{"id": "only", "title": "Only", "cards": []}]}
    ops = [{"type": "delete_column", "columnId": "only"}]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"]) == 1  # Not deleted


def test_reorder_columns():
    board = _simple_board()
    # Reorder: done first, then todo
    ops = [{"type": "reorder_columns", "columnIds": ["done", "todo"]}]
    result = board_operations.apply_board_operations(board, ops)
    assert result["columns"][0]["id"] == "done"
    assert result["columns"][1]["id"] == "todo"


def test_unknown_operation_type_is_skipped():
    board = {"id": "b1", "columns": []}
    ops = [{"type": "teleport_card", "cardId": "c1"}]
    result = board_operations.apply_board_operations(board, ops)
    assert result == board


def test_empty_operations_returns_same_object():
    board = {"id": "b1", "columns": []}
    result = board_operations.apply_board_operations(board, [])
    assert result is board


def test_multiple_operations_applied_in_order():
    board = {"id": "b1", "columns": [{"id": "todo", "title": "To Do", "cards": []}]}
    ops = [
        {"type": "add_card", "columnId": "todo", "title": "Card A", "details": "D"},
        {"type": "add_card", "columnId": "todo", "title": "Card B", "details": "D"},
        {"type": "add_column", "title": "Done"},
    ]
    result = board_operations.apply_board_operations(board, ops)
    assert len(result["columns"][0]["cards"]) == 2
    assert len(result["columns"]) == 2


# ---------------------------------------------------------------------------
# DB — user management
# ---------------------------------------------------------------------------

def test_create_user():
    from backend.auth import get_password_hash
    user_id = db.create_user("newuser", get_password_hash("pass"))
    assert isinstance(user_id, int)
    assert user_id > 0


def test_create_duplicate_user_raises():
    from backend.auth import get_password_hash
    db.create_user("dupuser", get_password_hash("pass"))
    with pytest.raises(ValueError, match="already taken"):
        db.create_user("dupuser", get_password_hash("other"))


def test_get_user_returns_password_hash():
    from backend.auth import get_password_hash, verify_password
    h = get_password_hash("mypassword")
    db.create_user("hashtest", h)
    user = db.get_user("hashtest")
    assert user is not None
    assert verify_password("mypassword", user["password_hash"])


def test_update_password():
    from backend.auth import get_password_hash, verify_password
    user_id = db.create_user("pwtest", get_password_hash("old"))
    new_hash = get_password_hash("new_secure_pass")
    db.update_password(user_id, new_hash)
    user = db.get_user("pwtest")
    assert verify_password("new_secure_pass", user["password_hash"])
    assert not verify_password("old", user["password_hash"])


# ---------------------------------------------------------------------------
# DB — multi-board management
# ---------------------------------------------------------------------------

def test_create_multiple_boards():
    from backend.auth import get_password_hash
    user_id = db.create_user("multiboard", get_password_hash("pass"))
    b1 = db.create_board(user_id, "Board 1", {"id": "b1", "columns": []}, is_default=True)
    b2 = db.create_board(user_id, "Board 2", {"id": "b2", "columns": []})
    b3 = db.create_board(user_id, "Board 3", {"id": "b3", "columns": []})
    boards = db.get_boards_for_user(user_id)
    assert len(boards) == 3
    ids = [b["id"] for b in boards]
    assert b1 in ids and b2 in ids and b3 in ids


def test_get_specific_board_by_id():
    from backend.auth import get_password_hash
    user_id = db.create_user("brd_fetch", get_password_hash("pass"))
    b1_id = db.create_board(user_id, "Board 1", {"id": "b1", "title": "Board 1", "columns": []})
    b2_id = db.create_board(user_id, "Board 2", {"id": "b2", "title": "Board 2", "columns": []})

    board_1 = db.get_board(user_id, b1_id)
    board_2 = db.get_board(user_id, b2_id)
    assert board_1["id"] == "b1"
    assert board_2["id"] == "b2"


def test_delete_board():
    from backend.auth import get_password_hash
    user_id = db.create_user("del_test", get_password_hash("pass"))
    b1 = db.create_board(user_id, "Board 1", {"id": "b1", "columns": []}, is_default=True)
    b2 = db.create_board(user_id, "Board 2", {"id": "b2", "columns": []})
    db.delete_board(user_id, b2)
    boards = db.get_boards_for_user(user_id)
    assert len(boards) == 1
    assert boards[0]["id"] == b1


def test_cannot_delete_last_board():
    from backend.auth import get_password_hash
    user_id = db.create_user("last_brd", get_password_hash("pass"))
    b1 = db.create_board(user_id, "Only Board", {"id": "b1", "columns": []}, is_default=True)
    with pytest.raises(ValueError, match="last board"):
        db.delete_board(user_id, b1)


def test_rename_board():
    from backend.auth import get_password_hash
    user_id = db.create_user("rename_usr", get_password_hash("pass"))
    b_id = db.create_board(user_id, "Old Name", {"id": "b", "columns": []})
    db.rename_board(user_id, b_id, "New Name")
    boards = db.get_boards_for_user(user_id)
    board = next(b for b in boards if b["id"] == b_id)
    assert board["name"] == "New Name"


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
    assert "idx_history_user_ts" in index_names
