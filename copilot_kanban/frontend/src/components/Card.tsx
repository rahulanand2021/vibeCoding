'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoard } from '@/contexts/BoardContext';
import EditCardModal from './EditCardModal';
import DeleteConfirmation from './DeleteConfirmation';

interface CardProps {
  card: {
    id: string;
    title: string;
    details: string;
  };
}

export default function Card({ card }: CardProps) {
  const { deleteCard, editCard } = useBoard();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{card.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{card.details}</p>
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={handleEdit}
            className="text-black hover:bg-gray-200 p-1 rounded"
            onPointerDown={(e) => e.stopPropagation()}
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:bg-gray-200 p-1 rounded"
            onPointerDown={(e) => e.stopPropagation()}
          >
            🗑️
          </button>
        </div>
      </div>
      <EditCardModal
        isOpen={showEditModal}
        card={card}
        onEdit={(title, details) => editCard(card.id, { title, details })}
        onCancel={() => setShowEditModal(false)}
      />
      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onConfirm={() => {
          deleteCard(card.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}