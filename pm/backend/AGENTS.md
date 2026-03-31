# Backend AGENTS

This service is currently minimal and designed to support the frontend MVP.

## FastAPI endpoints

- `GET /` health/info endpoint
- `GET /health` status check
- `POST /api/ai` accepts `query`, `board`, `conversation` and returns structured AI response shape
- `GET /api/board` returns the user's board (seeded if none exists)
- `POST /api/board` updates the user's board

## Database

- SQLite local DB (`backend/kanban.db`)
- Tables: `users`, `boards`
- Board stored as JSON per user
- Auto-created on startup

## Next steps

- Add user auth (hardcoded `user/password`).
- Add AI connector to OpenRouter / `openai/gpt-4o`.
