import type { Board, Card, Column } from "@/lib/kanban/types";

const cloneColumns = (columns: Column[]) =>
  columns.map((column) => ({ ...column, cards: [...column.cards] }));

export const renameColumn = (
  board: Board,
  columnId: string,
  title: string,
): Board => {
  const nextTitle = title.trim();
  if (!nextTitle) return board;

  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === columnId ? { ...column, title: nextTitle } : column,
    ),
  };
};

export const addCardToColumn = (
  board: Board,
  columnId: string,
  title: string,
  details: string,
): Board => {
  const cleanTitle = title.trim();
  const cleanDetails = details.trim();
  if (!cleanTitle || !cleanDetails) return board;

  const card: Card = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    title: cleanTitle,
    details: cleanDetails,
  };

  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === columnId
        ? { ...column, cards: [...column.cards, card] }
        : column,
    ),
  };
};

export const deleteCard = (board: Board, columnId: string, cardId: string): Board => {
  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === columnId
        ? {
            ...column,
            cards: column.cards.filter((card) => card.id !== cardId),
          }
        : column,
    ),
  };
};

export const editCard = (
  board: Board,
  columnId: string,
  cardId: string,
  title: string,
  details: string,
): Board => {
  const cleanTitle = title.trim();
  const cleanDetails = details.trim();
  if (!cleanTitle || !cleanDetails) return board;

  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === columnId
        ? {
            ...column,
            cards: column.cards.map((card) =>
              card.id === cardId ? { ...card, title: cleanTitle, details: cleanDetails } : card,
            ),
          }
        : column,
    ),
  };
};

export const moveCard = (
  board: Board,
  fromColumnId: string,
  toColumnId: string,
  fromIndex: number,
  toIndex: number,
): Board => {
  const columns = cloneColumns(board.columns);
  const sourceColumn = columns.find((column) => column.id === fromColumnId);
  const targetColumn = columns.find((column) => column.id === toColumnId);

  if (!sourceColumn || !targetColumn) return board;
  if (fromIndex < 0 || fromIndex >= sourceColumn.cards.length) return board;

  const [movedCard] = sourceColumn.cards.splice(fromIndex, 1);
  if (!movedCard) return board;

  const boundedIndex = Math.max(0, Math.min(toIndex, targetColumn.cards.length));
  targetColumn.cards.splice(boundedIndex, 0, movedCard);

  return { ...board, columns };
};
