# High level steps for project

## Part 1: Plan (DONE)

- [x] Enrich this document with detailed implementation checklist for every part.
- [x] Add test cases and success criteria for each part.
- [x] Create `frontend/AGENTS.md` describing existing frontend code.
- [ ] Get user approval of the plan before proceeding.

Success criteria:
- Project roadmap has explicit substeps for Parts 2..10.
- Expectation of tests and definitions are documented.
- No unknown requirement gaps remain.

## Part 2: Scaffolding

- [ ] Create backend FastAPI app in `backend/`.
  - `backend/main.py` with root endpoint returning JSON.
  - `backend/.env` config reference (not committed secrets).
  - `backend/AGENTS.md` with backend scope details.
- [ ] Create Docker files:
  - `Dockerfile` at root or backend that builds Python app.
  - `docker-compose.yml` (optional) for combined frontend/backend.
- [ ] Create scripts:
  - `scripts/start.ps1`, `scripts/start.sh` to run app.
  - `scripts/stop.ps1`, `scripts/stop.sh` to stop / cleanup.
- [ ] Validate static HTML response at `/`.
- [ ] Add health check endpoint `/health`.

Tests:
- Run `uvicorn backend.main:app --reload` and `curl http://localhost:8000` returns expected text.
- `curl http://localhost:8000/health` returns status.

## Part 3: Add in Frontend

- [ ] Build and export NextJS frontend to static assets.
- [ ] Serve static build from FastAPI using `StaticFiles`.
- [ ] Validate `/` returns Kanban UI with seeded data.

Tests:
- Playwright test `e2e/kanban.spec.ts` should pass against `/`.
- Unit tests in `frontend/src/__tests__` run and pass.

## Part 4: Add fake user sign in experience (DONE)

- [x] Add login page in frontend.
- [x] Add client-side auth state (cookie/localStorage session).
- [x] Require login before board view.
- [x] Add logout.

Tests:
- UI flow: invalid creds blocked, valid creds allowed.
- Protected route redirect at unauthenticated access.

## Part 5: Database modeling (DONE)

- [x] Design SQLite schema for users and board JSON.
- [x] Add DB migration / creation code if not exists.
- [x] Document schema in `docs/DB_SCHEMA.md`.

Success criteria:
- Schema supports one board per user and is extensible.
- Board columns/cards stored as JSON.

## Part 6: Backend APIs (DONE)

- [x] Add REST API routes:
  - `GET /api/board` (user board)
  - `POST /api/board` (replace board)
  - `PATCH /api/board` (partial updates)
- [x] Add AI endpoint `POST /api/ai`.
- [x] Add auth barrier (simple token/cookie check for user user/password hardcoded).

Tests:
- Unit tests of endpoints using `pytest`.
- Endpoints reflect DB values and allow updates.

## Part 7: Frontend + Backend integration

- [ ] Replace local BoardView state with backend data fetch/save.
- [ ] Enforce optimistic updates and refresh after mutations.
- [ ] Persist board updates in DB and restore on refresh.

Tests:
- E2E: create/persist/drag/drop card and reload.

## Part 8: AI connectivity

- [ ] Implement backend OpenAI/OpenRouter adapter.
- [ ] Add health test endpoint maybe `GET /api/ai/ping` with 2+2 prompt.

Tests:
- Mocked test for OpenAI call.
- Live test may be skipped if key missing.

## Part 9: AI structured outputs

- [ ] Define structured response format:
  - `text`, `boardUpdate` (optional), `actions`.
- [ ] Backend passes current board + user query to AI.
- [ ] Apply board updates when AI returns actionable update.
- [ ] Persist updated board in DB.

Tests:
- Unit tests around response parsing and board patches.
- E2E flow for AI-to-board change.

## Part 10: AI chat UI

- [ ] Add sidebar chat UI in NextJS.
- [ ] Send chat messages to `/api/ai` sequentially with history.
- [ ] Display AI text + suggested board changes.
- [ ] Apply board updates from AI and refresh UI.

Tests:
- Component tests for chat message flow.
- E2E AI chat scenario.
