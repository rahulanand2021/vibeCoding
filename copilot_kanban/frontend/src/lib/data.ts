import { Board } from './boardState';

export const seededBoard: Board = {
  id: 'kanban-board',
  title: 'Kanban Board',
  columns: [
    {
      id: 'backlog',
      title: 'Backlog',
      cards: [
        {
          id: crypto.randomUUID(),
          title: 'Define project scope',
          details: 'Outline the features and requirements for the MVP.',
        },
        {
          id: crypto.randomUUID(),
          title: 'Research technologies',
          details: 'Investigate Next.js, @dnd-kit, and testing frameworks.',
        },
      ],
    },
    {
      id: 'to-do',
      title: 'To Do',
      cards: [
        {
          id: crypto.randomUUID(),
          title: 'Set up project structure',
          details: 'Create directories and initialize Next.js app.',
        },
      ],
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      cards: [
        {
          id: crypto.randomUUID(),
          title: 'Implement board state',
          details: 'Define types and create state helper functions.',
        },
      ],
    },
    {
      id: 'review',
      title: 'Review',
      cards: [],
    },
    {
      id: 'done',
      title: 'Done',
      cards: [
        {
          id: crypto.randomUUID(),
          title: 'Plan the implementation',
          details: 'Create a detailed plan for building the app.',
        },
      ],
    },
  ],
};