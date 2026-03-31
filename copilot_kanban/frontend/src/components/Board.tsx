'use client';

import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, useDndContext } from '@dnd-kit/core';
import { useBoard } from '@/contexts/BoardContext';
import Column from './Column';


function DragOverlayCard({ cardId }: { cardId: string }) {
  const { board } = useBoard();
  for (const column of board.columns) {
    const card = column.cards.find(c => c.id === cardId);
    if (card) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 shadow-xl w-64 opacity-100">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{card.details}</p>
            </div>
          </div>
        </div>
      );
    }
  }
  return null;
}

function BoardContent() {
  const { board } = useBoard();
  const { active } = useDndContext();

  return (
    <div className="flex gap-4 p-4 min-h-screen bg-gray-100">
      {board.columns.map((column) => (
        <Column key={column.id} column={column} />
      ))}
      <DragOverlay>
        {active ? <DragOverlayCard cardId={active.id as string} /> : null}
      </DragOverlay>
    </div>
  );
}

export default function Board() {
  const { moveCard, board } = useBoard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the column of the over item
    let overColumnId = '';
    let overIndex = 0;

    const overColumn = board.columns.find(col => col.id === overId);
    if (overColumn) {
      overColumnId = overId;
      overIndex = overColumn.cards.length;
    } else {
      // Over is a card
      for (const column of board.columns) {
        const index = column.cards.findIndex(card => card.id === overId);
        if (index !== -1) {
          overColumnId = column.id;
          overIndex = index;
          break;
        }
      }
    }

    if (!overColumnId) return;

    // Find from column
    let fromColumnId = '';
    for (const column of board.columns) {
      if (column.cards.some(card => card.id === activeId)) {
        fromColumnId = column.id;
        break;
      }
    }

    if (fromColumnId && overColumnId) {
      moveCard(activeId, fromColumnId, overColumnId, overIndex);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <BoardContent />
    </DndContext>
  );
}