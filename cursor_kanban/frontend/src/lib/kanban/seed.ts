import type { Board } from "@/lib/kanban/types";

export const seedBoard: Board = {
  id: "board-1",
  title: "Product Launch Board",
  columns: [
    {
      id: "column-backlog",
      title: "Backlog",
      cards: [
        {
          id: "card-1",
          title: "Draft launch narrative",
          details: "Write core story, value proposition, and positioning notes.",
        },
      ],
    },
    {
      id: "column-todo",
      title: "To Do",
      cards: [
        {
          id: "card-2",
          title: "Finalize landing page copy",
          details: "Align hero, social proof, and call-to-action language.",
        },
      ],
    },
    {
      id: "column-progress",
      title: "In Progress",
      cards: [
        {
          id: "card-3",
          title: "Design announcement assets",
          details: "Prepare visuals for email and social media channels.",
        },
      ],
    },
    {
      id: "column-review",
      title: "Review",
      cards: [
        {
          id: "card-4",
          title: "QA launch checklist",
          details: "Validate links, forms, and responsive behavior.",
        },
      ],
    },
    {
      id: "column-done",
      title: "Done",
      cards: [
        {
          id: "card-5",
          title: "Kickoff alignment meeting",
          details: "Collected requirements and confirmed ownership.",
        },
      ],
    },
  ],
};
