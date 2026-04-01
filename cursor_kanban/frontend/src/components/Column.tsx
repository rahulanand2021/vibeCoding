"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Column as ColumnType } from "@/lib/kanban/types";
import { AddCardForm } from "@/components/AddCardForm";
import { CardItem } from "@/components/CardItem";

type ColumnProps = {
  column: ColumnType;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onEditCard: (columnId: string, cardId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export function Column({ column, onRename, onAddCard, onEditCard, onDeleteCard }: ColumnProps) {
  const [nextTitle, setNextTitle] = useState(column.title);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { setNodeRef } = useDroppable({ id: column.id });

  const handleRename = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRename(column.id, nextTitle);
    setIsEditingTitle(false);
  };

  const showEditControls = isHeaderHovered || isEditingTitle;

  return (
    <section className="kanban-column" data-testid={`column-${column.id}`}>
      <div
        className="column-header"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {showEditControls ? (
          <form className="rename-column-form" onSubmit={handleRename}>
            <input
              value={nextTitle}
              onChange={(event) => setNextTitle(event.target.value)}
              aria-label={`Column title for ${column.title}`}
              onFocus={() => setIsEditingTitle(true)}
              onBlur={() => setIsEditingTitle(false)}
            />
            <button type="submit" className="button-secondary">
              Rename
            </button>
          </form>
        ) : (
          <h2 className="column-title" aria-label={`Column ${column.title}`}>
            {column.title}
          </h2>
        )}
      </div>

      <SortableContext items={column.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="column-cards" ref={setNodeRef}>
          {column.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onEdit={(cardId, title, details) => onEditCard(column.id, cardId, title, details)}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </div>
      </SortableContext>

      <AddCardForm onAddCard={(title, details) => onAddCard(column.id, title, details)} />
    </section>
  );
}
