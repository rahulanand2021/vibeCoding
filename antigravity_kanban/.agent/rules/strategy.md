---
trigger: always_on
---

# Kanban Project (Current Rebuild Spec)

## Business Requirements

- Build an MVP Kanban-style project management web app with exactly one board.
- The board must contain fixed 5 columns by default: `Backlog`, `To Do`, `In Progress`, `Review`, `Done`.
- Column titles must be renameable inline from each column header.
- Cards must contain only:
  - title
  - details
- Users must be able to:
  - drag and drop cards within a column and across columns
  - add a new card to a column
  - edit an existing card (title + details)
  - delete an existing card with confirmation
- Keep scope intentionally minimal: no archive, no search, no filters, no auth, no persistence.
- The app must open with dummy data already populated.
- Prioritize polished, smooth, professional UI/UX despite simple feature scope.

## Interaction and UX Details

- Card actions must be icon-based controls in the top-right of each card:
  - edit icon: black
  - delete icon: red
  - icons placed close together
- Clicking edit icon opens a modal to edit card title and details.
- Clicking delete icon opens a custom in-app confirmation overlay (not browser `confirm`).
- Delete confirmation overlay must feel visually soft/soothing:
  - blurred/tinted backdrop
  - clean rounded dialog
  - clear `Keep` and `Delete` actions
- Add card uses a modal with `Cancel` and `Add card`.
- Maintain drag-and-drop usability while supporting icon button clicks (avoid accidental drag when clicking actions).

## Technical Details

- Use modern Next.js in subdirectory `frontend`.
- Use client-rendered implementation for board interactions.
- No backend/API and no local storage/database persistence.
- Keep state in memory using simple helper functions.
- Use popular libraries:
  - `@dnd-kit` for drag and drop
  - Testing stack with `vitest` + Testing Library + Playwright
- Keep architecture simple and readable.

## Data and State Rules

- Board state includes:
  - board id/title
  - array of columns
  - each column has id/title/cards
  - each card has id/title/details
- Provide state helpers for:
  - rename column
  - add card
  - edit card
  - delete card
  - move card
- Guard against empty/whitespace-only card title/details and column titles.
- Card IDs should be generated with `crypto.randomUUID()` when available.

## Color Scheme

- Accent Yellow: `#ecad0a` (accent lines/highlights)
- Blue Primary: `#209dd7` (links/key sections)
- Purple Secondary: `#753991` (primary actions such as submit/save/add)
- Dark Navy: `#032147` (headings and core text accents)
- Gray Text: `#888888` (supporting copy/labels)

## Testing and Quality Gates

- Unit/integration tests (Vitest + Testing Library) must validate:
  - rendering seeded board with 5 columns
  - renaming a column
  - adding and deleting a card (through custom confirmation dialog)
  - editing a card
  - state helper behavior for rename/add/edit/delete/move
- Playwright tests must validate:
  - board loads seeded data
  - column rename flow
  - add and delete flow with custom confirmation overlay
  - edit card flow
  - drag-and-drop move across columns
- Lint must pass with no errors.

## Strategy

1. Scaffold/update Next.js app in `frontend` and align dependencies/tooling.
2. Implement board UI, card/column interactions, and drag-and-drop behavior.
3. Implement modal-driven add/edit and custom overlay-driven delete confirmation.
4. Complete unit tests and end-to-end tests for all existing behaviors.
5. Run lint/tests, fix regressions, and ensure app starts with dummy data.

## Coding Standards

1. Use latest stable library versions and idiomatic patterns.
2. Keep implementation simple; avoid over-engineering and unnecessary abstraction.
3. Do not add extra features outside this spec.
4. Keep documentation concise and practical.
5. No emojis in project docs.
