'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBoard } from '@/contexts/BoardContext';
import Card from './Card';
import AddCardModal from './AddCardModal';

interface ColumnProps {
  column: {
    id: string;
    title: string;
    cards: Array<{
      id: string;
      title: string;
      details: string;
    }>;
  };
}

export default function Column({ column }: ColumnProps) {
  const { renameColumn, addCard } = useBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.title);
  const [showAddModal, setShowAddModal] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const handleSave = () => {
    if (editValue.trim()) {
      renameColumn(column.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(column.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md w-80 min-h-[400px] flex flex-col" data-column={column.id}>
      <div className="p-4 border-b border-[#ecad0a] bg-[#032147] text-white">
        {isEditing ? (
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="text-lg font-semibold bg-white text-[#032147] border-none outline-none w-full rounded px-2 py-1"
            autoFocus
          />
        ) : (
          <h2
            className="text-lg font-semibold cursor-pointer hover:bg-[#209dd7] hover:text-white px-2 py-1 rounded"
            onClick={() => setIsEditing(true)}
          >
            {column.title}
          </h2>
        )}
      </div>
      <div ref={setNodeRef} className="flex-1 p-4">
        <SortableContext items={column.cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full mt-2 p-2 border-2 border-dashed border-[#209dd7] rounded bg-[#e8f4ff] text-[#032147] font-semibold hover:bg-[#d3ebff] hover:border-[#032147]"
        >
          + Add Card
        </button>
      </div>
      <AddCardModal
        isOpen={showAddModal}
        onAdd={(title, details) => {
          addCard(column.id, { title, details });
          setShowAddModal(false);
        }}
        onCancel={() => setShowAddModal(false)}
      />
    </div>
  );
}