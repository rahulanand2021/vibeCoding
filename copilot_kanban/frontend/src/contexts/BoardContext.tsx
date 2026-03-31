'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Board, renameColumn, addCard, editCard, deleteCard, moveCard } from '@/lib/boardState';
import { seededBoard } from '@/lib/data';

type BoardContextType = {
  board: Board;
  renameColumn: (columnId: string, newTitle: string) => void;
  addCard: (columnId: string, cardData: { title: string; details: string }) => void;
  editCard: (cardId: string, updates: Partial<{ title: string; details: string }>) => void;
  deleteCard: (cardId: string) => void;
  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
};

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board>(seededBoard);

  const handleRenameColumn = (columnId: string, newTitle: string) => {
    setBoard(prev => renameColumn(prev, columnId, newTitle));
  };

  const handleAddCard = (columnId: string, cardData: { title: string; details: string }) => {
    setBoard(prev => addCard(prev, columnId, cardData));
  };

  const handleEditCard = (cardId: string, updates: Partial<{ title: string; details: string }>) => {
    setBoard(prev => editCard(prev, cardId, updates));
  };

  const handleDeleteCard = (cardId: string) => {
    setBoard(prev => deleteCard(prev, cardId));
  };

  const handleMoveCard = (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    setBoard(prev => moveCard(prev, cardId, fromColumnId, toColumnId, newIndex));
  };

  return (
    <BoardContext.Provider
      value={{
        board,
        renameColumn: handleRenameColumn,
        addCard: handleAddCard,
        editCard: handleEditCard,
        deleteCard: handleDeleteCard,
        moveCard: handleMoveCard,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoard must be used within BoardProvider');
  return context;
}