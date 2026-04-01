import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent / "kanban.db"


def init_db():
    """Create tables and indexes if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            board_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE (user_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS board_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            summary TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Indexes for fast lookups
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_user_ts ON board_history(user_id, timestamp)"
    )

    # Insert default user if not exists
    cursor.execute("INSERT OR IGNORE INTO users (username) VALUES (?)", ("user",))

    conn.commit()
    conn.close()
    logger.debug("Database initialised at %s", DB_PATH)


def get_user_id(username: str) -> Optional[int]:
    """Get user ID by username."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def get_board(user_id: int) -> Optional[Dict[str, Any]]:
    """Get board JSON for user."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT board_json FROM boards WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None


def save_board(user_id: int, board: Dict[str, Any]):
    """Save or update board for user."""
    board_json = json.dumps(board)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO boards (user_id, board_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            board_json = excluded.board_json,
            updated_at = CURRENT_TIMESTAMP
        """,
        (user_id, board_json),
    )
    conn.commit()
    conn.close()


def log_audit_event(user_id: int, source: str, operation_type: str, summary: str):
    """Append one entry to the audit log."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO board_history (user_id, source, operation_type, summary) VALUES (?, ?, ?, ?)",
        (user_id, source, operation_type, summary),
    )
    conn.commit()
    conn.close()


def get_audit_log(user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    """Return the most recent audit events for a user, newest first."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, timestamp, source, operation_type, summary
        FROM board_history
        WHERE user_id = ?
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
        """,
        (user_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def check_connectivity() -> bool:
    """Verify the database is reachable and the default user exists."""
    try:
        user_id = get_user_id("user")
        return user_id is not None
    except Exception as e:
        logger.error("DB connectivity check failed: %s", e)
        return False


# Initialize on import
init_db()
