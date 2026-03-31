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

export function renameColumn(board: Board, columnId: string, newTitle: string): Board {
  if (!newTitle.trim()) throw new Error('Column title cannot be empty');
  return {
    ...board,
    columns: board.columns.map(col =>
      col.id === columnId ? { ...col, title: newTitle.trim() } : col
    ),
  };
}

export function addCard(board: Board, columnId: string, cardData: Omit<Card, 'id'>): Board {
  if (!cardData.title.trim() || !cardData.details.trim()) throw new Error('Card title and details cannot be empty');
  const newCard: Card = {
    id: crypto.randomUUID(),
    title: cardData.title.trim(),
    details: cardData.details.trim(),
  };
  return {
    ...board,
    columns: board.columns.map(col =>
      col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
    ),
  };
}

export function editCard(board: Board, cardId: string, updates: Partial<Omit<Card, 'id'>>): Board {
  const trimmedUpdates = {
    title: updates.title?.trim(),
    details: updates.details?.trim(),
  };
  if (trimmedUpdates.title !== undefined && !trimmedUpdates.title) throw new Error('Card title cannot be empty');
  if (trimmedUpdates.details !== undefined && !trimmedUpdates.details) throw new Error('Card details cannot be empty');
  return {
    ...board,
    columns: board.columns.map(col => ({
      ...col,
      cards: col.cards.map(card =>
        card.id === cardId ? { ...card, ...trimmedUpdates } : card
      ),
    })),
  };
}

export function deleteCard(board: Board, cardId: string): Board {
  return {
    ...board,
    columns: board.columns.map(col => ({
      ...col,
      cards: col.cards.filter(card => card.id !== cardId),
    })),
  };
}

export function moveCard(
  board: Board,
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  newIndex: number
): Board {
  const fromColumn = board.columns.find(col => col.id === fromColumnId);
  if (!fromColumn) throw new Error('From column not found');
  const cardIndex = fromColumn.cards.findIndex(card => card.id === cardId);
  if (cardIndex === -1) throw new Error('Card not found');
  const card = fromColumn.cards[cardIndex];

  let newBoard = {
    ...board,
    columns: board.columns.map(col => ({
      ...col,
      cards: col.id === fromColumnId ? col.cards.filter(c => c.id !== cardId) : col.cards,
    })),
  };

  const toColumn = newBoard.columns.find(col => col.id === toColumnId);
  if (!toColumn) throw new Error('To column not found');
  const newCards = [...toColumn.cards];
  newCards.splice(newIndex, 0, card);

  newBoard = {
    ...newBoard,
    columns: newBoard.columns.map(col =>
      col.id === toColumnId ? { ...col, cards: newCards } : col
    ),
  };

  return newBoard;
}