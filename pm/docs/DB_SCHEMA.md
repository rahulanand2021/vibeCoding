# Database Schema for Kanban MVP

## Overview

We use SQLite for local persistence. The database is created automatically if it doesn't exist.

## Schema

### Tables

#### `users`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `username` TEXT UNIQUE NOT NULL
- `password_hash` TEXT (for future; MVP uses hardcoded auth)

#### `boards`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL (FOREIGN KEY to users.id)
- `board_json` TEXT NOT NULL (JSON string of the board data)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Constraints

- One board per user (enforced by UNIQUE on user_id)
- Board data stored as JSON for flexibility

### Example Board JSON Structure

```json
{
  "id": "board-1",
  "title": "Product Launch",
  "columns": [
    {
      "id": "backlog",
      "title": "Backlog",
      "cards": [
        {
          "id": "card-1",
          "title": "Collect user feedback",
          "details": "Gather early notes from the pilot team."
        }
      ]
    }
  ]
}
```

## Migration

Database is created on first run via SQLAlchemy or raw SQL in `backend/db.py`.

## Future Extensions

- Multiple boards per user
- Board sharing
- Real password hashing
- Audit logs