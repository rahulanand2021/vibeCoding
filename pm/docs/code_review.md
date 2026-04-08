# Code Review: Kanban Flow PM

**Date:** 2026-04-02  
**Reviewer:** Claude Sonnet 4.6  
**Scope:** Full codebase — `pm/` directory  

---

## Summary

Kanban Flow PM is a well-structured MVP with a clear separation between a Next.js/React frontend, a FastAPI/SQLite backend, and an OpenAI GPT-4o AI layer. The foundations are solid, but the app has critical security issues that must be resolved before any production deployment.

---

## Architecture Overview

```
pm/
├── backend/          # FastAPI + SQLite + OpenAI integration
├── frontend/         # Next.js 16 (React 19), TypeScript, dnd-kit, CSS Modules
├── scripts/          # Docker Compose start/stop helpers
├── Dockerfile        # Two-stage build (Node → Python)
├── docker-compose.yml
└── docs/
```

**Stack:**
- Frontend: Next.js 16.2.1, React 19, TypeScript 5, dnd-kit, Vitest, Playwright
- Backend: FastAPI, Python 3.12, SQLite (JSON blob), OpenAI GPT-4o, slowapi
- DevOps: Docker multi-stage build, environment variable secrets

---

## Strengths

### 1. Clean Separation of Concerns
Backend routes (`main.py`), database persistence (`db.py`), AI integration (`ai.py`), and board logic (`board_operations.py`) are each in their own file with clear, focused responsibilities. The frontend mirrors this with `lib/board.ts` for pure state logic, separate components per UI concern, and modals in their own subdirectory.

### 2. Immutable Board Logic
Both `frontend/src/lib/board.ts` and `backend/board_operations.py` treat board state as immutable. Every operation returns a new board object. This makes logic easy to test and opens the door to undo/redo in the future.

### 3. Full Type Safety on the Frontend
TypeScript types exist for all core domain objects (`Board`, `Column`, `Card`, `ChatMessage`, `BoardOperation`). Pydantic models cover backend request/response validation.

### 4. Good Test Coverage for Core Logic
- Unit tests in `boardHelpers.test.ts` cover all board mutations
- Backend tests cover health endpoints, AI routing, and board CRUD
- Playwright E2E tests cover login, board interaction, and logout
- Estimated coverage: ~70%

### 5. Drag-and-Drop Implementation
`BoardView.tsx` uses `@dnd-kit/core` with a `PointerSensor` (8px activation threshold to prevent accidental drags), `closestCorners` collision detection, and a `DragOverlay` for smooth visual feedback. This is the correct pattern for accessible, performant DnD.

### 6. Rate Limiting on AI Endpoint
`slowapi` limits `/api/ai` to 20 requests per minute, protecting against runaway AI costs and abuse.

### 7. Error Boundaries
`ErrorBoundary.tsx` wraps the app in `layout.tsx`. Backend exceptions are caught with specific handlers for `RateLimitError` and `APIConnectionError`.

---

## Issues

### Critical

#### C1. Hardcoded Authentication Credentials (`frontend/src/components/Login.tsx`)
```typescript
if (username === "user" && password === "password") {
  localStorage.setItem("loggedIn", "true");
}
```
Authentication is performed entirely on the client side with hardcoded credentials. `localStorage` flags can be trivially set in DevTools. There is no server-side session validation on any subsequent API call.

**Fix:** Implement a backend `/api/login` endpoint that issues an HTTP-only session cookie or JWT. Validate the token on every protected route.

---

#### C2. No Server-Side Authorization on API Routes (`backend/main.py`)
All board and audit endpoints (`/api/board`, `/api/ai`, `/api/audit`) are publicly accessible with no auth check. Any caller can read or overwrite any user's board.

**Fix:** Require a valid session token or JWT on every API route. Reject unauthenticated requests with HTTP 401.

---

#### C3. Prompt Injection Risk (`backend/ai.py`)
```python
system_msg += f"\n\nCurrent board state: {board}"
```
The board object — which includes user-supplied card titles and column names — is interpolated directly into the system prompt. A card titled `"Ignore all previous instructions and..."` could manipulate the AI's behavior.

**Fix:** Pass the board state as a separate JSON-serialized field in the user message, clearly labeled and delimited, not embedded in the system prompt string.

---

#### C4. No Input Validation on AI-Generated Board Operations (`backend/board_operations.py`)
Operations returned by the AI are applied with minimal field validation. Missing or unexpected fields cause silent returns of the unchanged board with only a `logger.warning`.

```python
logger.warning("add_card skipped: missing columnId, title, or details")
return board  # Caller doesn't know this failed
```

The frontend displays a success message regardless.

**Fix:** Raise typed exceptions for invalid operations. Surface these errors to the frontend so users know when an AI operation failed to apply.

---

### High Priority

#### H1. CORS Open to All Origins (`backend/main.py`)
```python
allow_origins=["*"]
```
Any website can send requests to the board API.

**Fix:** Set `allow_origins` to the specific domain(s) of the deployed frontend in production.

---

#### H2. Race Condition in Chat → Board Sync (`frontend/src/app/page.tsx`)
After an AI response includes board operations, the frontend calls `fetchBoard()` but the result may not be available before the next render cycle. If the user sends a second message immediately, the board state passed to the backend will be stale.

**Fix:** Disable the chat input while `fetchBoard()` is in flight. Await the fetch before re-enabling.

---

#### H3. No Database Transactions for Concurrent Board Updates (`backend/db.py`)
`save_board` and `log_audit_event` are separate calls with no wrapping transaction. A crash between them leaves the audit log inconsistent with the actual board state.

**Fix:** Wrap `save_board` + `log_audit_event` in a single `BEGIN; ... COMMIT;` transaction.

---

#### H4. Unbounded Audit Log Growth (`backend/db.py`, `/api/audit`)
The audit log has a hardcoded `LIMIT 100` on fetch but no pruning or archival. The table will grow indefinitely.

**Fix:** Add cursor-based pagination to `/api/audit` and a configurable retention policy (e.g., delete events older than 90 days).

---

### Medium Priority

#### M1. Column Rename Race Condition (`frontend/src/components/Column.tsx`)
A fast double-click during rename can trigger multiple concurrent save calls. The last one wins, which may not be the intended value.

**Fix:** Debounce the rename save call and disable the input while a save is in flight.

---

#### M2. No Optimistic Locking for Concurrent Board Edits
Two sessions open simultaneously will silently overwrite each other. The last `POST /api/board` wins.

**Fix:** Add a `version` (integer) field to the board. Reject updates where the submitted version doesn't match the current DB version and return HTTP 409 Conflict.

---

#### M3. Empty/Invalid Board Response Not Handled (`frontend/src/app/page.tsx`)
If `/api/board` returns an empty object or a malformed response, the frontend attempts to use it as a `Board` without shape validation, which can cause runtime crashes.

**Fix:** Validate the response shape against the expected `Board` type before calling `setBoard`. Fall back to the seeded board on failure and show a user-visible error.

---

#### M4. No Loading/Error Differentiation in ChatSidebar (`frontend/src/components/ChatSidebar.tsx`)
While waiting for an AI response, the sidebar shows `...`. There is no visual difference between "waiting", "network error", and "rate limited".

**Fix:** Track a separate `error` state. Show distinct messages for timeout, rate limit, and generic errors.

---

### Low Priority

#### L1. Emojis in ChatSidebar Violate Project Guidelines
`ChatSidebar.tsx` uses `👋`, `📋`, `💬` in assistant messages. The project CLAUDE.md specifies no emojis.

**Fix:** Remove emoji characters from the default chat messages.

---

#### L2. Console Errors Not Reported to Backend
All frontend `catch` blocks call `console.error`. There is no error reporting endpoint, so production errors are invisible unless a user opens DevTools.

**Fix:** Add a `/api/error` endpoint and send unhandled errors there. Or integrate a monitoring service.

---

#### L3. No API Versioning
Routes are `/api/board`, `/api/ai`, `/api/audit` with no version prefix. Any breaking change will require coordinated frontend/backend deployments.

**Fix:** Prefix routes with `/api/v1/` so future versions can coexist during rolling deployments.

---

#### L4. Minimal Loading State on Initial Board Fetch
```tsx
{loading && <p>Loading board...</p>}
```
This is a plain text line with no visual treatment.

**Fix:** Use a skeleton loader or spinner that matches the board layout to reduce layout shift.

---

## Test Coverage Gaps

| Area | Status |
|------|--------|
| Board helper unit tests | Good |
| Backend route unit tests | Good (AI mocked) |
| E2E (Playwright) | Good |
| Auth rejection (no token) | Missing |
| Concurrent edit conflict | Missing |
| AI operation validation errors | Missing |
| Audit log pagination | Missing |
| Board response shape validation | Missing |

---

## Security Summary

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | Critical | Hardcoded client-side credentials |
| Authorization | Critical | No server-side auth checks on any route |
| Input validation | Partial | Frontend validates blank inputs; AI output not deeply validated |
| Prompt injection | Critical | Board content interpolated into system prompt |
| CORS | Weak | Open to all origins |
| Rate limiting | Good | 20 req/min on `/api/ai` |
| Secret management | Good | Env vars, not hardcoded in Dockerfile |
| Data encryption | None | SQLite unencrypted at rest |

---

## Recommended Fixes by Priority

1. Implement real backend authentication with HTTP-only session cookies or JWT
2. Add server-side auth middleware to all API routes
3. Fix prompt injection by isolating user-supplied board content from the system prompt
4. Raise typed exceptions for invalid AI operations and surface them to the frontend
5. Restrict CORS to known frontend domain(s) in production
6. Wrap board save + audit log write in a single database transaction
7. Disable chat input while board fetch is in flight (fix race condition)
8. Add cursor-based pagination and retention policy for audit log
9. Add optimistic locking (`version` field) to prevent silent concurrent overwrites
10. Add integration tests for auth rejection, concurrent edits, and AI error paths

---

## Conclusion

This is a well-built MVP with good architectural instincts: pure board logic, clean component boundaries, proper drag-and-drop, and structured AI integration. The code is readable and testable. The main risks are all security-related — the auth model is not production-safe, and prompt injection is a real vulnerability. Address the Critical and High items before any deployment beyond localhost.
