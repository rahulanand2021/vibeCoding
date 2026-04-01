"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@/lib/kanban/types";

type CardItemProps = {
  card: Card;
  onEdit: (cardId: string, title: string, details: string) => void;
  onDelete: (cardId: string) => void;
};

export function CardItem({ card, onEdit, onDelete }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
    });
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [nextTitle, setNextTitle] = useState(card.title);
  const [nextDetails, setNextDetails] = useState(card.details);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const openEdit = () => {
    setNextTitle(card.title);
    setNextDetails(card.details);
    setIsEditing(true);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nextTitle.trim() || !nextDetails.trim()) return;
    onEdit(card.id, nextTitle, nextDetails);
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    onDelete(card.id);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <>
      <article
        ref={setNodeRef}
        style={style}
        className={`kanban-card${isDragging ? " kanban-card-dragging" : ""}`}
        data-testid={`card-${card.id}`}
        {...attributes}
        {...listeners}
      >
        <h3>{card.title}</h3>
        <p>{card.details}</p>
        <div className="card-actions">
          <button
            type="button"
            className="card-edit-button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={openEdit}
            aria-label={`Edit ${card.title}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
            </svg>
          </button>
          <button
            type="button"
            className="card-delete-button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setIsDeleteConfirmOpen(true)}
            aria-label={`Delete ${card.title}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM6 9h2v8H6V9Z" />
            </svg>
          </button>
        </div>
      </article>

      {isEditing ? (
        <div className="modal-backdrop" onClick={() => setIsEditing(false)}>
          <div
            className="add-card-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit card"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="add-card-form" onSubmit={handleEditSubmit}>
              <input
                value={nextTitle}
                onChange={(event) => setNextTitle(event.target.value)}
                placeholder="Card title"
                aria-label="Edit card title"
                autoFocus
              />
              <textarea
                value={nextDetails}
                onChange={(event) => setNextDetails(event.target.value)}
                placeholder="Card details"
                aria-label="Edit card details"
                rows={3}
              />
              <div className="modal-actions">
                <button className="button-secondary" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="button-primary" type="submit">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div className="modal-backdrop modal-backdrop-soft" onClick={() => setIsDeleteConfirmOpen(false)}>
          <div
            className="delete-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete card confirmation"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Delete card?</h3>
            <p>
              This will remove <strong>{card.title}</strong> from the board.
            </p>
            <div className="modal-actions">
              <button className="button-secondary" type="button" onClick={() => setIsDeleteConfirmOpen(false)}>
                Keep
              </button>
              <button className="button-danger" type="button" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
