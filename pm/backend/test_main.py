import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app
from backend import board_operations


@pytest.fixture(autouse=True)
def reset_db():
    from backend import db
    from pathlib import Path

    if db.DB_PATH.exists():
        db.DB_PATH.unlink()
    db.init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_ai_ping(client):
    """Test AI ping endpoint with mocked OpenAI call."""
    with patch("backend.ai.ping_ai") as mock_ping:
        mock_ping.return_value = "4"
        response = client.get("/api/ai/ping")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["result"] == "4"


def test_ai_ping_error(client):
    """Test AI ping endpoint when service is unavailable."""
    with patch("backend.ai.ping_ai") as mock_ping:
        mock_ping.side_effect = Exception("API Error")
        response = client.get("/api/ai/ping")
        assert response.status_code == 503
        assert "AI service unavailable" in response.json()["detail"]


def test_ai_route(client):
    """Test AI route with mocked OpenAI call."""
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "This is a helpful response",
            "boardUpdate": None,
            "actions": None
        }
        response = client.post("/api/ai", json={"query": "test query"})
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "This is a helpful response"
        assert "boardUpdate" in data
        assert "actions" in data
        mock_query.assert_called_once()
        args = mock_query.call_args[0]
        assert args[0] == "test query"  # query
        assert args[1] is not None  # board should be passed
        assert args[2] is None  # conversation


def test_ai_route_with_board(client):
    """Test AI route with board context."""
    board = {"id": "test-board", "columns": []}
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.return_value = {
            "text": "Updated response",
            "boardUpdate": None,
            "actions": None
        }
        response = client.post(
            "/api/ai",
            json={"query": "test", "board": board}
        )
        assert response.status_code == 200
        mock_query.assert_called_once()
        args = mock_query.call_args[0]
        assert args[0] == "test"
        # Should use the board from DB, not the one passed in the request
        assert args[1] is not None  # board from DB


def test_ai_route_empty_query(client):
    """Test AI route with empty query."""
    with patch("backend.ai.query_ai") as mock_query:
        mock_query.side_effect = ValueError("query is required")
        response = client.post("/api/ai", json={"query": ""})
        assert response.status_code == 400
        assert "query is required" in response.json()["detail"]


def test_get_board(client):
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "title" in data
    assert "columns" in data
    assert len(data["columns"]) == 5  # seeded board has 5 columns


def test_update_board(client):
    test_board = {
        "id": "test-board",
        "title": "Test Board",
        "columns": [
            {
                "id": "test-col",
                "title": "Test Column",
                "cards": [
                    {
                        "id": "test-card",
                        "title": "Test Card",
                        "details": "Test details",
                    }
                ],
            }
        ],
    }
    response = client.post("/api/board", json={"board": test_board})
    assert response.status_code == 200
    assert response.json() == {"status": "updated"}

    # Verify it was saved
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-board"
    assert data["title"] == "Test Board"


def test_apply_board_operations_add_card():
    """Test adding a card via board operations."""
    board = {
        "id": "board-1",
        "title": "Test Board",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": []
            }
        ]
    }
    
    operations = [
        {
            "type": "add_card",
            "columnId": "todo",
            "title": "New Task",
            "details": "Task details"
        }
    ]
    
    result = board_operations.apply_board_operations(board, operations)
    
    assert len(result["columns"][0]["cards"]) == 1
    card = result["columns"][0]["cards"][0]
    assert card["title"] == "New Task"
    assert card["details"] == "Task details"
    assert "id" in card


def test_apply_board_operations_edit_card():
    """Test editing a card via board operations."""
    board = {
        "id": "board-1",
        "title": "Test Board",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": [
                    {
                        "id": "card-1",
                        "title": "Old Title",
                        "details": "Old details"
                    }
                ]
            }
        ]
    }
    
    operations = [
        {
            "type": "edit_card",
            "cardId": "card-1",
            "title": "New Title",
            "details": "New details"
        }
    ]
    
    result = board_operations.apply_board_operations(board, operations)
    
    card = result["columns"][0]["cards"][0]
    assert card["title"] == "New Title"
    assert card["details"] == "New details"


def test_apply_board_operations_delete_card():
    """Test deleting a card via board operations."""
    board = {
        "id": "board-1",
        "title": "Test Board",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": [
                    {
                        "id": "card-1",
                        "title": "Task 1",
                        "details": "Details 1"
                    },
                    {
                        "id": "card-2",
                        "title": "Task 2",
                        "details": "Details 2"
                    }
                ]
            }
        ]
    }
    
    operations = [
        {
            "type": "delete_card",
            "cardId": "card-1"
        }
    ]
    
    result = board_operations.apply_board_operations(board, operations)
    
    assert len(result["columns"][0]["cards"]) == 1
    assert result["columns"][0]["cards"][0]["id"] == "card-2"


def test_apply_board_operations_move_card():
    """Test moving a card between columns."""
    board = {
        "id": "board-1",
        "title": "Test Board",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": [
                    {
                        "id": "card-1",
                        "title": "Task 1",
                        "details": "Details 1"
                    }
                ]
            },
            {
                "id": "done",
                "title": "Done",
                "cards": []
            }
        ]
    }
    
    operations = [
        {
            "type": "move_card",
            "cardId": "card-1",
            "destColumnId": "done",
            "position": 0
        }
    ]
    
    result = board_operations.apply_board_operations(board, operations)
    
    assert len(result["columns"][0]["cards"]) == 0  # todo column empty
    assert len(result["columns"][1]["cards"]) == 1  # done column has card
    assert result["columns"][1]["cards"][0]["id"] == "card-1"


def test_apply_board_operations_rename_column():
    """Test renaming a column via board operations."""
    board = {
        "id": "board-1",
        "title": "Test Board",
        "columns": [
            {
                "id": "todo",
                "title": "To Do",
                "cards": []
            }
        ]
    }
    
    operations = [
        {
            "type": "rename_column",
            "columnId": "todo",
            "title": "In Progress"
        }
    ]
    
    result = board_operations.apply_board_operations(board, operations)
    
    assert result["columns"][0]["title"] == "In Progress"