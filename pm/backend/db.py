import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent / "kanban.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables, indexes, and run migrations if needed."""
    conn = _get_conn()
    cursor = conn.cursor()

    # Users table — add email column if migrating
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add email column to existing users table if not present (migration)
    cursor.execute("PRAGMA table_info(users)")
    user_cols = {row[1] for row in cursor.fetchall()}
    if "email" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
    if "created_at" not in user_cols:
        # SQLite doesn't allow non-constant DEFAULT in ALTER TABLE; use NULL default
        cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP")

    # Check if boards table needs migration (old schema had UNIQUE on user_id)
    cursor.execute("PRAGMA table_info(boards)")
    board_cols = {row[1] for row in cursor.fetchall()}

    if "name" not in board_cols:
        # Migrate: rebuild boards table without UNIQUE(user_id) constraint, add name/is_default
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS boards_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL DEFAULT 'My Board',
                board_json TEXT NOT NULL,
                is_default INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        # Copy existing data if boards table existed
        try:
            cursor.execute("""
                INSERT INTO boards_new (id, user_id, name, board_json, is_default, created_at, updated_at)
                SELECT id, user_id, 'My Board', board_json, 1, created_at, updated_at FROM boards
            """)
        except sqlite3.OperationalError:
            pass  # boards table may not have existed
        cursor.execute("DROP TABLE IF EXISTS boards")
        cursor.execute("ALTER TABLE boards_new RENAME TO boards")
    else:
        # Table already migrated; ensure it exists with current schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS boards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL DEFAULT 'My Board',
                board_json TEXT NOT NULL,
                is_default INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

    # Audit log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS board_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            board_id INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            summary TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (board_id) REFERENCES boards(id)
        )
    """)

    # Add board_id column to board_history if migrating
    cursor.execute("PRAGMA table_info(board_history)")
    hist_cols = {row[1] for row in cursor.fetchall()}
    if "board_id" not in hist_cols:
        cursor.execute("ALTER TABLE board_history ADD COLUMN board_id INTEGER REFERENCES boards(id)")

    # Indexes
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_user_ts ON board_history(user_id, timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_board ON board_history(board_id)")

    conn.commit()
    conn.close()
    logger.debug("Database initialised at %s", DB_PATH)


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

def get_user_id(username: str) -> Optional[int]:
    """Get user ID by username."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def get_user(username: str) -> Optional[Dict[str, Any]]:
    """Get full user record by username."""
    conn = _get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, email FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get full user record by ID."""
    conn = _get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(username: str, password_hash: str, email: Optional[str] = None) -> int:
    """Create a new user. Returns the new user ID. Raises ValueError if username taken."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)",
            (username, password_hash, email),
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise ValueError(f"Username '{username}' is already taken")
    finally:
        conn.close()
    return user_id


def update_password(user_id: int, new_password_hash: str):
    """Update the password hash for a user."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id))
    conn.commit()
    conn.close()


def ensure_default_user(password_hash: str):
    """Ensure the default 'user' account exists with a proper password hash."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE username = 'user'")
    row = cursor.fetchone()
    if not row:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES ('user', ?)",
            (password_hash,),
        )
    elif row[1] is None:
        # Migrate: set password hash on existing account
        cursor.execute("UPDATE users SET password_hash = ? WHERE username = 'user'", (password_hash,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Board management
# ---------------------------------------------------------------------------

def get_boards_for_user(user_id: int) -> List[Dict[str, Any]]:
    """Return all boards for a user (metadata only, no board_json)."""
    conn = _get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, is_default, created_at, updated_at FROM boards WHERE user_id = ? ORDER BY is_default DESC, created_at ASC",
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_board(user_id: int, board_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Get board JSON. If board_id is None, returns the default board."""
    conn = _get_conn()
    cursor = conn.cursor()
    if board_id is not None:
        cursor.execute(
            "SELECT board_json FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user_id),
        )
    else:
        cursor.execute(
            "SELECT board_json FROM boards WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1",
            (user_id,),
        )
    row = cursor.fetchone()
    conn.close()
    return json.loads(row[0]) if row else None


def get_board_id_for_user(user_id: int, board_id: Optional[int] = None) -> Optional[int]:
    """Resolve board_id for a user. If board_id is None, returns default board ID."""
    conn = _get_conn()
    cursor = conn.cursor()
    if board_id is not None:
        cursor.execute("SELECT id FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id))
    else:
        cursor.execute(
            "SELECT id FROM boards WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1",
            (user_id,),
        )
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def create_board(user_id: int, name: str, board_data: Dict[str, Any], is_default: bool = False) -> int:
    """Create a new board for a user. Returns the new board ID."""
    board_json = json.dumps(board_data)
    conn = _get_conn()
    cursor = conn.cursor()
    if is_default:
        # Unset any existing default
        cursor.execute("UPDATE boards SET is_default = 0 WHERE user_id = ?", (user_id,))
    cursor.execute(
        "INSERT INTO boards (user_id, name, board_json, is_default) VALUES (?, ?, ?, ?)",
        (user_id, name, board_json, 1 if is_default else 0),
    )
    conn.commit()
    board_id = cursor.lastrowid
    conn.close()
    return board_id


def save_board(user_id: int, board: Dict[str, Any], board_id: Optional[int] = None):
    """Save or create the board for user. If board_id is None, updates default board."""
    board_json = json.dumps(board)
    conn = _get_conn()
    cursor = conn.cursor()
    if board_id is not None:
        cursor.execute(
            "UPDATE boards SET board_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (board_json, board_id, user_id),
        )
    else:
        # Upsert default board
        cursor.execute(
            "SELECT id FROM boards WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE boards SET board_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (board_json, row[0]),
            )
        else:
            cursor.execute(
                "INSERT INTO boards (user_id, name, board_json, is_default) VALUES (?, 'My Board', ?, 1)",
                (user_id, board_json),
            )
    conn.commit()
    conn.close()


def rename_board(user_id: int, board_id: int, new_name: str):
    """Rename a board."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE boards SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        (new_name, board_id, user_id),
    )
    conn.commit()
    conn.close()


def delete_board(user_id: int, board_id: int):
    """Delete a board and its history. Cannot delete the last board."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM boards WHERE user_id = ?", (user_id,))
    count = cursor.fetchone()[0]
    if count <= 1:
        conn.close()
        raise ValueError("Cannot delete the last board")
    cursor.execute("DELETE FROM board_history WHERE board_id = ?", (board_id,))
    cursor.execute("DELETE FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id))
    conn.commit()
    conn.close()


def set_default_board(user_id: int, board_id: int):
    """Set a board as the default for a user."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE boards SET is_default = 0 WHERE user_id = ?", (user_id,))
    cursor.execute(
        "UPDATE boards SET is_default = 1 WHERE id = ? AND user_id = ?",
        (board_id, user_id),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

def log_audit_event(
    user_id: int,
    source: str,
    operation_type: str,
    summary: str,
    board_id: Optional[int] = None,
):
    """Append one entry to the audit log."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO board_history (user_id, board_id, source, operation_type, summary) VALUES (?, ?, ?, ?, ?)",
        (user_id, board_id, source, operation_type, summary),
    )
    conn.commit()
    conn.close()


def get_audit_log(
    user_id: int,
    limit: int = 100,
    board_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return the most recent audit events, optionally filtered by board."""
    conn = _get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if board_id is not None:
        cursor.execute(
            """
            SELECT id, board_id, timestamp, source, operation_type, summary
            FROM board_history
            WHERE user_id = ? AND board_id = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (user_id, board_id, limit),
        )
    else:
        cursor.execute(
            """
            SELECT id, board_id, timestamp, source, operation_type, summary
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


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def check_connectivity() -> bool:
    """Verify the database is reachable."""
    try:
        conn = _get_conn()
        conn.execute("SELECT 1")
        conn.close()
        return True
    except Exception as e:
        logger.error("DB connectivity check failed: %s", e)
        return False


# Initialize on import
init_db()
