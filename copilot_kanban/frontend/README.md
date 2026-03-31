# Kanban Board App

A minimal Kanban-style project management web app built with Next.js.

## Features

- One board with 5 fixed columns: Backlog, To Do, In Progress, Review, Done
- Drag and drop cards within and across columns
- Inline column renaming
- Add, edit, delete cards with modal dialogs
- Custom delete confirmation overlay
- Seeded with dummy data

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

- Unit and integration tests: `npm run test`
- End-to-end tests: `npm run e2e`

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- @dnd-kit for drag-and-drop
- Vitest for testing
- Playwright for e2e tests
