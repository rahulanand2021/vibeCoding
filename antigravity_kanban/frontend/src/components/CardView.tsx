"use client";
import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '../types/kanban';
import styles from './CardView.module.css';

interface CardPresentationProps {
    card: Card;
    onEdit: (card: Card) => void;
    onDelete: (cardId: string) => void;
    style?: React.CSSProperties;
    className?: string;
    forwardRef?: React.Ref<HTMLDivElement>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listeners?: any;
}

export function CardPresentation({
    card,
    onEdit,
    onDelete,
    style,
    className,
    forwardRef,
    attributes,
    listeners,
}: CardPresentationProps) {
    return (
        <div
            ref={forwardRef}
            style={style}
            className={`${styles.card} ${className || ''}`}
            {...attributes}
            {...listeners}
        >
            <div className={styles.header}>
                <h3 className={styles.title}>{card.title}</h3>
                <div className={styles.actions}>
                    <button
                        className={styles.actionButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(card);
                        }}
                        title="Edit Card"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Pencil size={14} className={styles.editIcon} />
                    </button>
                    <button
                        className={styles.actionButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(card.id);
                        }}
                        title="Delete Card"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 size={14} className={styles.deleteIcon} />
                    </button>
                </div>
            </div>
            <p className={styles.details}>{card.details}</p>
        </div>
    );
}

interface CardViewProps {
    card: Card;
    onEdit: (card: Card) => void;
    onDelete: (cardId: string) => void;
    isOverlay?: boolean;
}

export function CardView({ card, onEdit, onDelete, isOverlay }: CardViewProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: card.id,
        data: {
            type: 'Card',
            card,
        },
    });

    if (isOverlay) {
        return <CardPresentation card={card} onEdit={onEdit} onDelete={onDelete} className={styles.dragging} />;
    }

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    return (
        <CardPresentation
            card={card}
            onEdit={onEdit}
            onDelete={onDelete}
            style={style}
            className={isDragging ? styles.dragging : ''}
            forwardRef={setNodeRef}
            attributes={attributes}
            listeners={listeners}
        />
    );
}
