"use client";
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Column, Card } from '../types/kanban';
import { CardView } from './CardView';
import styles from './ColumnView.module.css';

interface ColumnViewProps {
    column: Column;
    onRename: (columnId: string, newTitle: string) => void;
    onAddCard: (columnId: string) => void;
    onEditCard: (card: Card) => void;
    onDeleteCard: (cardId: string) => void;
}

export function ColumnView({ column, onRename, onAddCard, onEditCard, onDeleteCard }: ColumnViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title);

    const { setNodeRef } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    });

    const handleTitleSubmit = () => {
        setIsEditing(false);
        if (editTitle.trim() !== column.title) {
            onRename(column.id, editTitle);
        } else {
            setEditTitle(column.title);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleTitleSubmit();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditTitle(column.title);
        }
    };

    return (
        <div className={styles.column} ref={setNodeRef}>
            <div className={styles.header}>
                {isEditing ? (
                    <input
                        autoFocus
                        className={styles.titleInput}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleTitleSubmit}
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <h2 className={styles.titleText} onClick={() => setIsEditing(true)}>
                        {column.title}
                    </h2>
                )}
            </div>

            <div className={styles.cardList}>
                <SortableContext
                    items={column.cards.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {column.cards.map((card) => (
                        <CardView
                            key={card.id}
                            card={card}
                            onEdit={onEditCard}
                            onDelete={onDeleteCard}
                        />
                    ))}
                </SortableContext>
            </div>

            <button className={styles.addButton} onClick={() => onAddCard(column.id)}>
                <Plus size={16} /> Add card
            </button>
        </div>
    );
}
