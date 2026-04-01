import { generateId } from "./ids";

export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type Board = {
  id: string;
  title: string;
  columns: Column[];
};

export type CardInput = {
  title: string;
  details: string;
};

export type CardUpdates = Partial<CardInput>;

const seededColumns: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    cards: [
      {
        id: "card-backlog-1",
        title: "Collect user feedback",
        details: "Gather early notes from the pilot team and shortlist themes.",
      },
      {
        id: "card-backlog-2",
        title: "Define success metrics",
        details: "Align on measurable outcomes for launch readiness.",
      },
    ],
  },
  {
    id: "todo",
    title: "To Do",
    cards: [
      {
        id: "card-todo-1",
        title: "Draft onboarding flow",
        details: "Outline key steps and required content.",
      },
      {
        id: "card-todo-2",
        title: "Plan usability session",
        details: "Schedule 3 user interviews with focused tasks.",
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    cards: [
      {
        id: "card-progress-1",
        title: "Refine dashboard layout",
        details: "Balance hierarchy and reduce visual noise.",
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    cards: [
      {
        id: "card-review-1",
        title: "Design review",
        details: "Share mockups and capture async feedback.",
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      {
        id: "card-done-1",
        title: "Kickoff meeting",
        details: "Align on goals, scope, and team roles.",
      },
    ],
  },
];

export const seededBoard: Board = {
  id: "board-1",
  title: "Product Launch",
  columns: seededColumns,
};

const isBlank = (value?: string) => !value || value.trim().length === 0;

export function renameColumn(board: Board, columnId: string, newTitle: string): Board {
  if (isBlank(newTitle)) {
    return board;
  }

  const trimmed = newTitle.trim();
  const columns = board.columns.map((column) =>
    column.id === columnId ? { ...column, title: trimmed } : column
  );

  return { ...board, columns };
}

export function addCard(board: Board, columnId: string, input: CardInput): Board {
  if (isBlank(input.title) || isBlank(input.details)) {
    return board;
  }

  const newCard: Card = {
    id: generateId(),
    title: input.title.trim(),
    details: input.details.trim(),
  };

  const columns = board.columns.map((column) =>
    column.id === columnId
      ? { ...column, cards: [...column.cards, newCard] }
      : column
  );

  return { ...board, columns };
}

export function editCard(board: Board, cardId: string, updates: CardUpdates): Board {
  const columns = board.columns.map((column) => {
    const cards = column.cards.map((card) => {
      if (card.id !== cardId) {
        return card;
      }

      const nextTitle =
        updates.title === undefined || isBlank(updates.title)
          ? card.title
          : updates.title.trim();
      const nextDetails =
        updates.details === undefined || isBlank(updates.details)
          ? card.details
          : updates.details.trim();

      return { ...card, title: nextTitle, details: nextDetails };
    });

    return { ...column, cards };
  });

  return { ...board, columns };
}

export function deleteCard(board: Board, cardId: string): Board {
  const columns = board.columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => card.id !== cardId),
  }));

  return { ...board, columns };
}

export function moveCard(
  board: Board,
  sourceColumnId: string,
  destColumnId: string,
  sourceIndex: number,
  destIndex: number
): Board {
  if (sourceIndex < 0 || destIndex < 0) {
    return board;
  }

  const sourceColumn = board.columns.find((column) => column.id === sourceColumnId);
  const destColumn = board.columns.find((column) => column.id === destColumnId);

  if (!sourceColumn || !destColumn) {
    return board;
  }

  if (sourceIndex >= sourceColumn.cards.length) {
    return board;
  }

  const movingCard = sourceColumn.cards[sourceIndex];

  const nextColumns = board.columns.map((column) => {
    if (column.id === sourceColumnId && column.id === destColumnId) {
      const nextCards = [...column.cards];
      nextCards.splice(sourceIndex, 1);
      const adjustedIndex = destIndex > sourceIndex ? destIndex - 1 : destIndex;
      nextCards.splice(
        Math.min(Math.max(adjustedIndex, 0), nextCards.length),
        0,
        movingCard
      );
      return { ...column, cards: nextCards };
    }

    if (column.id === sourceColumnId) {
      const nextCards = [...column.cards];
      nextCards.splice(sourceIndex, 1);
      return { ...column, cards: nextCards };
    }

    if (column.id === destColumnId) {
      const nextCards = [...column.cards];
      const insertIndex = Math.min(Math.max(destIndex, 0), nextCards.length);
      nextCards.splice(insertIndex, 0, movingCard);
      return { ...column, cards: nextCards };
    }

    return column;
  });

  return { ...board, columns: nextColumns };
}

export function findCardById(
  board: Board,
  cardId: string
): { card: Card; columnId: string } | null {
  for (const column of board.columns) {
    const match = column.cards.find((card) => card.id === cardId);
    if (match) {
      return { card: match, columnId: column.id };
    }
  }

  return null;
}

export function isBlankInput(value: string): boolean {
  return isBlank(value);
}
