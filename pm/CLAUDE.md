# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Kanban board MVP with AI chat assistant. The backend (FastAPI/Python) serves both the REST API and the static Next.js frontend export from a single Docker container.

## Commands

### Backend (run from project root)
```bash
uvicorn backend.main:app --reload        # Dev server on port 8000
pytest backend/test_main.py              # Run backend tests
```

### Frontend (run from `frontend/`)
```bash
npm run dev           # Dev server on port 3000
npm run build         # Build Next.js app
npm run lint          # ESLint
npm test              # Vitest unit tests
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright E2E tests
```

### Docker
```bash
./scripts/start.sh    # docker-compose up -d
./scripts/stop.sh     # docker-compose down
```

The Dockerfile is a two-stage build: Node 20 Alpine builds the Next.js static export, then Python 3.12 Slim runs FastAPI and serves both the API and the static frontend.

## Architecture

```
User Browser → FastAPI (port 8000)
                 ├── GET/POST /api/board  ←→ SQLite (kanban.db)
                 ├── POST /api/ai         ←→ OpenAI GPT-4o
                 └── GET /               → serves Next.js static export
```

### Backend (`backend/`)

- **main.py** — FastAPI routes, CORS, static file serving for the Next.js export
- **db.py** — SQLite persistence; board stored as JSON in `boards.board_json`; default user is `"user"`
- **ai.py** — GPT-4o queries with structured JSON output enforced; receives board context + chat history; returns `{ text, boardUpdate?: { operations: [...] } }`
- **board_operations.py** — Pure functions to apply AI-returned operations (add_card, edit_card, delete_card, move_card, rename_column) to the board state

### Frontend (`frontend/src/`)

- **app/page.tsx** — Top-level state: login, board data, chat history; fetches board on login, saves on mutation, refreshes after AI changes
- **components/BoardView.tsx** — Kanban board with dnd-kit drag-drop, modal dialogs
- **components/ChatSidebar.tsx** — Sliding AI chat panel with message history
- **lib/board.ts** — Pure TypeScript board types (`Card`, `Column`, `Board`) and immutable mutation helpers
- **lib/ids.ts** — ID generation utilities

### Data Flow for AI Chat
1. User message sent to `POST /api/ai` with full board state + conversation history
2. Backend passes to GPT-4o with structured output schema
3. AI returns text + optional board operations array
4. Backend applies operations via `board_operations.py`, persists to SQLite
5. Frontend displays text response, then re-fetches board to reflect changes

## Key Decisions (from AGENTS.md)

- Single user MVP: hardcoded credentials (`user`/`password`), stored in localStorage
- Board stored as JSON blob in SQLite — flexible but no column-level queries
- AI model: GPT-4o via OpenAI SDK (key in `.env` as `OPENAI_API_KEY`)
- Frontend is a Next.js **static export** (`next build` → `out/`) — no SSR, no API routes
- CORS allows all origins (development convenience)
- No emojis in UI or code; keep code simple and evidence-based
