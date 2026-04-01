"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { Column } from "@/components/Column";
import { seedBoard } from "@/lib/kanban/seed";
import { addCardToColumn, deleteCard, editCard, moveCard, renameColumn } from "@/lib/kanban/state";
import type { Board as BoardType, Card } from "@/lib/kanban/types";

const findCardLocation = (board: BoardType, cardId: string) => {
  for (const column of board.columns) {
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index >= 0) return { columnId: column.id, index };
  }
  return null;
};

const resolveOverColumn = (board: BoardType, overId: string | null) => {
  if (!overId) return null;
  const column = board.columns.find((entry) => entry.id === overId);
  if (column) return column.id;

  const overCardLocation = findCardLocation(board, overId);
  return overCardLocation ? overCardLocation.columnId : null;
};

const DragCardPreview = ({ card }: { card: Card }) => (
  <article className="kanban-card kanban-card-overlay">
    <h3>{card.title}</h3>
    <p>{card.details}</p>
  </article>
);

export function Board() {
  const [board, setBoard] = useState(seedBoard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    for (const column of board.columns) {
      const card = column.cards.find((entry) => entry.id === activeCardId);
      if (card) return card;
    }
    return null;
  }, [activeCardId, board.columns]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    setBoard((current) => {
      const activeLocation = findCardLocation(current, activeId);
      if (!activeLocation) return current;

      const overColumnId = resolveOverColumn(current, overId);
      if (!overColumnId) return current;

      const targetColumn = current.columns.find((column) => column.id === overColumnId);
      if (!targetColumn) return current;

      const overCardLocation = findCardLocation(current, overId);
      const targetIndex = overCardLocation ? overCardLocation.index : targetColumn.cards.length;
      if (activeLocation.columnId === overColumnId && activeLocation.index === targetIndex) return current;

      return moveCard(current, activeLocation.columnId, overColumnId, activeLocation.index, targetIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      setActiveCardId(null);
      return;
    }
    setActiveCardId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCardId(null)}
    >
      <div className="board-shell">
        <header className="board-header">
          <h1>{board.title}</h1>
          <p>Single-board Kanban MVP with smooth drag-and-drop workflow.</p>
        </header>

        <main className="board-columns">
          {board.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onRename={(columnId, title) => setBoard((current) => renameColumn(current, columnId, title))}
              onAddCard={(columnId, title, details) =>
                setBoard((current) => addCardToColumn(current, columnId, title, details))
              }
              onEditCard={(columnId, cardId, title, details) =>
                setBoard((current) => editCard(current, columnId, cardId, title, details))
              }
              onDeleteCard={(columnId, cardId) => setBoard((current) => deleteCard(current, columnId, cardId))}
            />
          ))}
        </main>
      </div>
      <DragOverlay>{activeCard ? <DragCardPreview card={activeCard} /> : null}</DragOverlay>
    </DndContext>
  );
}
