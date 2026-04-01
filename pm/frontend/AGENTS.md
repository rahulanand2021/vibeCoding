<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## frontend AGENTS overview

Current app is a simple Next.js 14+ app with client-side Kanban state and login protection.

### Key functionality

- `src/app/page.tsx`: conditionally renders `Login` or board based on localStorage auth.
- `src/components/Login.tsx`: hardcoded login form (user/password).
- `src/components/BoardView.tsx`: interactive board using `@dnd-kit/core` for drag-drop, with modals for add/edit/delete.
- `src/lib/board.ts`: pure board logic (rename column, add/edit/delete/move card, seed data).
- `src/components/Column.tsx`, `CardItem.tsx`, and modal dialogs implement UI and actions.
- No backend data persistence yet; every session starts with `seededBoard`.
- Auth: client-side only, using localStorage "loggedIn" flag.

### Testing

- Unit tests in `src/__tests__/boardHelpers.test.ts` and `BoardView.test.tsx` validate board operations and component behavior.
- E2E test `e2e/kanban.spec.ts` covers login, logout, and main Kanban interactions.

### Goals for integration work

- Replace local state with API calls to backend `GET /api/board` & `POST /api/board` (APIs are ready).
- Add AI chat sidebar, as per project plan.
- Move auth to backend (session/cookie based).

