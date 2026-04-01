"use client";
import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import { Board, Card } from '../types/kanban';
import { INITIAL_BOARD } from '../types/kanban';
import { renameColumn, addCard, editCard, deleteCard, moveCard } from '../utils/boardState';
import { ColumnView } from './ColumnView';
import { CardView } from './CardView';
import { Modal } from './Modal';
import { ConfirmOverlay } from './ConfirmOverlay';
import styles from './BoardView.module.css';

export function BoardView() {
    const [board, setBoard] = useState<Board>(INITIAL_BOARD);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addColId, setAddColId] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

    const [activeCard, setActiveCard] = useState<Card | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'Card') {
            setActiveCard(active.data.current.card);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveCard(null);
        const { active, over } = event;
        if (!over) return;

        if (active.id === over.id) return;

        const activeCardId = active.id as string;
        const overData = over.data.current;

        let sourceColId = '';
        let targetColId = '';

        for (const col of board.columns) {
            if (col.cards.find(c => c.id === activeCardId)) {
                sourceColId = col.id;
            }
        }

        if (overData?.type === 'Column') {
            targetColId = over.id as string;
        } else if (overData?.type === 'Card') {
            for (const col of board.columns) {
                if (col.cards.find(c => c.id === over.id)) {
                    targetColId = col.id;
                }
            }
        } else {
            return;
        }

        if (!sourceColId || !targetColId) return;

        const targetCol = board.columns.find(c => c.id === targetColId);
        let newIndex = targetCol?.cards.length || 0;

        if (overData?.type === 'Card') {
            const dropIndex = targetCol!.cards.findIndex(c => c.id === over.id);
            // Determine if dragging below or above, but simpler logic is fine for MVP.
            newIndex = dropIndex;
        }

        setBoard(prev => moveCard(prev, activeCardId, sourceColId, targetColId, newIndex));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{board.title}</h1>
            </header>

            <main className={styles.boardScroll}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className={styles.columnsContainer}>
                        {board.columns.map(col => (
                            <ColumnView
                                key={col.id}
                                column={col}
                                onRename={(colId, newTitle) => setBoard(prev => renameColumn(prev, colId, newTitle))}
                                onAddCard={(colId) => {
                                    setAddColId(colId);
                                    setIsAddModalOpen(true);
                                }}
                                onEditCard={(card) => {
                                    setEditingCard(card);
                                    setIsEditModalOpen(true);
                                }}
                                onDeleteCard={(cardId) => {
                                    setDeletingCardId(cardId);
                                    setIsDeleteOpen(true);
                                }}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeCard ? (
                            <CardView
                                card={activeCard}
                                onEdit={() => { }}
                                onDelete={() => { }}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </main>

            {isAddModalOpen && (
                <Modal
                    isOpen={true}
                    title="Add New Card"
                    submitText="Create"
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setAddColId(null);
                    }}
                    onSubmit={(title, details) => {
                        if (addColId) {
                            setBoard(prev => addCard(prev, addColId, title, details));
                        }
                        setIsAddModalOpen(false);
                        setAddColId(null);
                    }}
                />
            )}

            {isEditModalOpen && (
                <Modal
                    isOpen={true}
                    title="Edit Card"
                    submitText="Save changes"
                    initialCardTitle={editingCard?.title}
                    initialCardDetails={editingCard?.details}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingCard(null);
                    }}
                    onSubmit={(title, details) => {
                        if (editingCard) {
                            setBoard(prev => editCard(prev, editingCard.id, title, details));
                        }
                        setIsEditModalOpen(false);
                        setEditingCard(null);
                    }}
                />
            )}

            <ConfirmOverlay
                isOpen={isDeleteOpen}
                title="Delete Card"
                message="Are you sure you want to delete this card? This action cannot be undone."
                onCancel={() => {
                    setIsDeleteOpen(false);
                    setDeletingCardId(null);
                }}
                onConfirm={() => {
                    if (deletingCardId) {
                        setBoard(prev => deleteCard(prev, deletingCardId));
                    }
                    setIsDeleteOpen(false);
                    setDeletingCardId(null);
                }}
            />
        </div>
    );
}
