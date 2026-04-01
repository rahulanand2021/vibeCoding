# Code Review Report — Kanban PM Application

**Date:** 2026-03-30
**Reviewer:** Claude Code (claude-sonnet-4-6)
**Scope:** Full repository — backend, frontend, infrastructure

---

## Executive Summary

This is a functional MVP combining Next.js 19 (frontend) with FastAPI (backend) and SQLite. While the core Kanban + AI chat flows work, there are **critical security vulnerabilities**, several **bug risks**, and meaningful **architecture limitations** that must be resolved before any production deployment.

---

## Severity Key

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Exploitable now; stop and fix before anything else |
| **HIGH** | Significant risk to security, correctness, or reliability |
| **MEDIUM** | Real problems but not immediately exploitable or breaking |
| **LOW** | Quality / maintainability debt |

---

## 1. Security

### 1.1 [LOW] No `.env.example` for Onboarding

**File:** `.env` / `.gitignore`

`.env` is correctly listed in `.gitignore` and will not be committed to git. However, there is no `.env.example` documenting which variables are required, making setup harder for new contributors or deployments.

**Actions:**
- Create `.env.example` with placeholder values:
  ```
  OPENAI_API_KEY=your-openai-key-here
  ```

---

### 1.2 [CRITICAL] Overly Permissive CORS

**File:** `backend/main.py` lines 22–28

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    ...
)
```

`allow_origins=["*"]` with `allow_credentials=True` is an invalid combination per the CORS spec and enables CSRF-style attacks.

**Actions:**
- Replace `"*"` with an explicit list of allowed origins (e.g. `["http://localhost:3000"]` for dev, your domain for prod)
- Restrict `allow_methods` and `allow_headers` to only what is needed

---

### 1.3 [HIGH] Hardcoded Credentials in Frontend

**File:** `frontend/src/components/Login.tsx` lines 17–18

```typescript
if (username === "user" && password === "password") {
```

Authentication logic is entirely client-side and bypassable via DevTools. There is no server-side session validation.

**Actions:**
- Move credential verification to the backend with a proper `POST /api/auth/login` endpoint
- Issue a signed JWT on success; require it on all subsequent API calls
- Remove the hardcoded check from the frontend entirely

---

### 1.4 [HIGH] No Authorization on Any API Endpoint

**File:** `backend/main.py` lines 174–199

All endpoints use `db.get_user_id("user")` — a hardcoded string. Any HTTP client can read or overwrite the board with no authentication.

**Actions:**
- Add a `get_current_user` dependency that validates a JWT from the `Authorization` header
- Inject `user_id` from the token, not from a hardcoded string
- Return 401 for unauthenticated requests

---

### 1.5 [HIGH] LocalStorage Auth State Vulnerable to XSS

**File:** `frontend/src/app/page.tsx` lines 18–19

```typescript
const loggedIn = localStorage.getItem("loggedIn") === "true";
```

A single XSS vector anywhere in the app can read or set this flag. LocalStorage is not a secure session store.

**Actions:**
- Replace with HTTP-only, Secure cookies set by the backend on login
- Add a `Content-Security-Policy` header to mitigate XSS
- Sanitize all user-supplied content before rendering

---

### 1.6 [HIGH] No Input Validation or Length Limits

**File:** `backend/board_operations.py` lines 39–59

Card titles and details from AI-generated operations pass through with no length limits, HTML escaping, or sanitization, which could enable stored XSS or DoS via oversized payloads.

**Actions:**
- Enforce max length (e.g. title ≤ 255 chars, details ≤ 2000 chars)
- HTML-escape all text fields before storage: `from html import escape`

---

### 1.7 [MEDIUM] No Rate Limiting on `/api/ai`

**File:** `backend/main.py` line 136

The AI endpoint has no rate limiting. Spamming it causes runaway OpenAI charges and denies service to real users.

**Actions:**
- Add `slowapi` (or similar) with a per-IP or per-user limit (e.g. 10 req/min)

---

### 1.8 [MEDIUM] Full Board State Sent to OpenAI

**File:** `backend/ai.py` line 74

```python
system_msg += f"\n\nCurrent board state: {board}"
```

All card content is sent to a third-party API on every request, with no anonymization.

**Actions:**
- Limit the board context to structure-only (column titles + card counts) unless the user's message clearly requires card details
- Document the data sharing in a privacy notice

---

### 1.9 [HIGH] `.env` Copied into Docker Image

**File:** `Dockerfile` line 18

```dockerfile
COPY .env /app/.env
```

Secrets baked into an image layer are extractable by anyone who pulls the image.

**Actions:**
- Remove the `COPY .env` line
- Pass secrets at runtime via `docker-compose.yml` `environment:` block or Docker secrets

---

## 2. Bug Risks

### 2.1 [HIGH] Shallow Copy in `apply_board_operations`

**File:** `backend/board_operations.py` lines 10–36

```python
updated_board = board.copy()
updated_board["columns"] = [col.copy() for col in ...]
for col in updated_board["columns"]:
    col["cards"] = [card.copy() for card in ...]
```

`dict.copy()` is a shallow copy. Any nested dict inside a card (e.g. a future `metadata` field) would still reference the original object, causing silent mutation.

**Actions:**
- Replace with `copy.deepcopy(board)`

---

### 2.2 [HIGH] Race Condition on Concurrent AI Requests

**File:** `frontend/src/app/page.tsx` lines 102–106

If two AI requests overlap, the second board fetch can overwrite changes from the first.

**Actions:**
- Add an optimistic version/etag field to the board
- Backend should reject `POST /api/board` if the submitted version is stale (return 409 Conflict)

---

### 2.3 [HIGH] Unstructured AI Response Fallback

**File:** `backend/ai.py` lines 92–109

The `except json.JSONDecodeError` branch returns a dict that is never validated against the expected schema, so callers may receive unexpected shapes.

**Actions:**
- Validate the parsed AI response against a Pydantic model before returning it
- Log the raw content on parse failure for debugging

---

### 2.4 [MEDIUM] Silent No-op When Column Not Found

**File:** `backend/board_operations.py` lines 39–59

If the AI references a non-existent column ID, `_add_card` silently returns the board unchanged. The caller gets no indication the operation failed.

**Actions:**
- Raise a `ValueError` when the target column is not found; catch and log it in the caller

---

### 2.5 [MEDIUM] `--reload` in Production Dockerfile

**File:** `Dockerfile` CMD

```dockerfile
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

`--reload` watches the filesystem and adds overhead. It also exposes source paths in error messages.

**Actions:**
- Remove `--reload` from the production `CMD`
- Keep it only in a `docker-compose.dev.yml` override

---

## 3. Code Quality

### 3.1 [HIGH] No React Error Boundary

If any component throws, the entire app goes blank with no recovery path.

**Actions:**
- Add an `ErrorBoundary` class component wrapping the top-level layout
- Display a user-facing error message and a reload button

---

### 3.2 [MEDIUM] `any` Type on `boardUpdate`

**File:** `frontend/src/components/ChatSidebar.tsx` line 11

```typescript
boardUpdate?: any;
```

**Actions:**
- Define a typed `BoardUpdate` interface matching the backend schema
- Replace `any` with it throughout

---

### 3.3 [MEDIUM] Duplicate Seeded Board Definition

The default board is defined in both `backend/main.py` (lines 48–118) and `frontend/src/lib/board.ts` (lines 28–100). They can drift silently.

**Actions:**
- Keep one canonical definition (backend)
- Frontend falls back to fetching from `/api/board` on first load; no local seed needed

---

### 3.4 [MEDIUM] Inconsistent HTTP Error Codes

**File:** `backend/main.py` lines 137–171

Application bugs and AI service failures both return 503. This makes monitoring and client retry logic harder.

**Actions:**
- Use 400 for validation errors, 429 for rate limit, 502 for upstream AI failure, 500 for unexpected application errors
- Catch specific `openai.*Error` subclasses for accurate codes

---

### 3.5 [LOW] `console.error` for Non-Error Fallback

**File:** `frontend/src/app/page.tsx` line 38

```typescript
console.error("Failed to fetch board, using seeded data");
```

This pollutes error monitoring. Use `console.warn` for expected fallbacks.

---

### 3.6 [LOW] Dead Prop on ChatSidebar

**File:** `frontend/src/app/page.tsx` line 180

```typescript
onBoardUpdate={() => {}}  // Handled by fetchBoard refresh
```

The prop is a no-op. Remove it from both the component signature and call site.

---

## 4. Performance

### 4.1 [MEDIUM] Missing Database Indexes

**File:** `backend/db.py` lines 13–30

`SELECT id FROM users WHERE username = ?` performs a full table scan without an index.

**Actions:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
```

---

### 4.2 [MEDIUM] No Caching on Board Fetches

Every AI response triggers a full board refetch from the server.

**Actions:**
- Add `ETag` / `Last-Modified` headers on `GET /api/board`
- Frontend sends `If-None-Match`; backend returns 304 when unchanged
- This is a low-cost win that eliminates redundant payloads

---

### 4.3 [MEDIUM] Unnecessary Re-renders in Chat History

**File:** `frontend/src/components/ChatSidebar.tsx` lines 86–116

All past messages re-render on every new message.

**Actions:**
- Wrap the individual message component with `React.memo` keyed on `message.id`

---

### 4.4 [LOW] Full Board JSON in AI System Prompt

**File:** `backend/ai.py` line 74

Sending the complete board on every request increases token usage and latency.

**Actions:**
- For queries that don't require card details, send only column titles and card counts
- Only include full card data when the user's question clearly references card content

---

## 5. Testing Gaps

### 5.1 [HIGH] No Frontend Integration Tests

There are Vitest unit tests (board helpers) and Playwright E2E tests, but no integration tests covering the login → fetch → mutate → persist flow.

**Actions:**
- Add integration tests with mocked `fetch` that exercise the full page-level state machine

---

### 5.2 [MEDIUM] Backend Tests Don't Verify DB Persistence

**File:** `backend/test_main.py`

Tests mock `query_ai` but don't verify that the board was actually written to SQLite after an AI operation.

**Actions:**
- After `POST /api/ai`, immediately call `GET /api/board` and assert the change persisted

---

### 5.3 [MEDIUM] No Security Tests

No tests for SQL injection payloads, XSS content in card titles, or unauthenticated access to board endpoints.

**Actions:**
- Add tests that post XSS/SQLi payloads and assert they are stored/returned safely
- Add tests that call all endpoints without an auth header and assert 401

---

## 6. Architecture

### 6.1 [HIGH] Hardcoded Single-User Architecture

`"user"` is hardcoded throughout the backend. Any shared deployment exposes all data to all clients.

**Actions:**
- Implement proper multi-user support: JWT-based auth, `user_id` on all queries
- This is a prerequisite for most other security fixes

---

### 6.2 [MEDIUM] No Audit Trail

Board changes (especially AI-driven ones) leave no record of what changed, when, or why.

**Actions:**
- Add a `board_history` table or append-only event log recording each operation with timestamp and source (user vs AI)

---

### 6.3 [MEDIUM] No API Versioning

Frontend code depends directly on the JSON shape returned by the backend. Breaking changes require coordinated deploys.

**Actions:**
- Prefix all routes with `/api/v1/`
- Define request/response shapes as Pydantic models (most are already using Pydantic — extend this to all endpoints)

---

### 6.4 [MEDIUM] No Startup Environment Validation

**File:** `backend/ai.py` lines 9–11

Missing `OPENAI_API_KEY` is only detected when the first AI request is made, not at startup.

**Actions:**
- Use `pydantic-settings` `BaseSettings` to validate all required env vars at application startup; fail fast with a clear message

---

### 6.5 [LOW] No Health / Readiness Distinction

The `/health` endpoint returns 200 unconditionally. A broken DB would still pass a health check.

**Actions:**
- `/health` — lightweight liveness probe (always 200 if process is alive)
- `/ready` — readiness probe that verifies DB connectivity; returns 503 if unavailable

---

## 7. Dependency & Config Hygiene

### 7.1 [MEDIUM] Loose Dependency Version Constraints

**File:** `backend/requirements.txt`

All packages use `>=` constraints. Transitive updates can silently introduce breaking changes or vulnerabilities.

**Actions:**
- Pin to exact versions in production (`fastapi==0.120.3`, etc.)
- Use `pip-compile` or Poetry to generate a lock file

---

### 7.2 [LOW] Unpinned Python Base Image

**File:** `Dockerfile` line 11

```dockerfile
FROM python:3.12-slim
```

**Actions:**
- Pin to a specific patch: `python:3.12.4-slim`

---

### 7.3 [LOW] No Frontend `.env.example`

There is no documented list of frontend environment variables.

**Actions:**
- Create `frontend/.env.example` listing `NEXT_PUBLIC_API_URL` and any other vars with placeholder values

---

## 8. Remediation Roadmap

### Immediate (before any external access)
| # | Action |
|---|--------|
| 1 | Remove `COPY .env` from Dockerfile |
| 2 | Restrict CORS to specific origins |
| 3 | Remove `--reload` from production Dockerfile CMD |

### Short-term (1–2 weeks)
| # | Action |
|---|--------|
| 6 | Implement backend authentication (JWT) |
| 7 | Remove hardcoded frontend login check |
| 8 | Add input validation + length limits in `board_operations.py` |
| 9 | Add rate limiting on `/api/ai` |
| 10 | Add React Error Boundary |
| 11 | Replace shallow copy with `deepcopy` in `board_operations.py` |

### Medium-term (3–4 weeks)
| # | Action |
|---|--------|
| 12 | Add database indexes |
| 13 | Add `ETag`-based board caching |
| 14 | Add integration tests (frontend + backend) |
| 15 | Add security tests (XSS, unauthenticated access) |
| 16 | Replace `any` types with proper TypeScript interfaces |
| 17 | Add startup env validation via `pydantic-settings` |
| 18 | Pin dependency versions + generate lock file |

### Long-term (month 2+)
| # | Action |
|---|--------|
| 19 | Add audit / history log for board changes |
| 20 | Implement board versioning for conflict detection |
| 21 | Add API versioning (`/api/v1/`) |
| 22 | Add structured JSON logging + error tracking (e.g. Sentry) |
| 23 | Add readiness probe with real DB check |

---

## Issue Count Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 11 |
| MEDIUM | 16 |
| LOW | 8 |
| **Total** | **36** |
