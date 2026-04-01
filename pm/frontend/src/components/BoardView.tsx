"use client";

import { useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Board, Card, CardInput } from "@/lib/board";
import {
  addCard,
  deleteCard,
  editCard,
  findCardById,
  isBlankInput,
  moveCard,
  renameColumn,
} from "@/lib/board";
import Column from "./Column";
import CardItem from "./CardItem";
import AddCardModal from "./modals/AddCardModal";
import EditCardModal from "./modals/EditCardModal";
import DeleteConfirmDialog from "./modals/DeleteConfirmDialog";
import styles from "./BoardView.module.css";

const activationDistance = 8;

type BoardViewProps = {
  initialBoard: Board;
  onBoardChange?: (board: Board, action?: string, operationType?: string) => void;
};

export default function BoardView({ initialBoard, onBoardChange }: BoardViewProps) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [addColumnId, setAddColumnId] = useState<string | null>(null);
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: activationDistance },
    })
  );

  const editCardData = useMemo(() => {
    if (!editCardId) return null;
    return findCardById(board, editCardId);
  }, [board, editCardId]);

  const deleteCardData = useMemo(() => {
    if (!deleteCardId) return null;
    return findCardById(board, deleteCardId);
  }, [board, deleteCardId]);

  const addColumn = addColumnId
    ? board.columns.find((column) => column.id === addColumnId)
    : null;

  const handleRenameColumn = (columnId: string, nextTitle: string) => {
    setBoard((prev) => {
      const newBoard = renameColumn(prev, columnId, nextTitle);
      onBoardChange?.(newBoard, `Renamed column to "${nextTitle}"`, "rename_column");
      return newBoard;
    });
  };

  const handleAddCard = (columnId: string, input: CardInput) => {
    const colTitle = board.columns.find((c) => c.id === columnId)?.title ?? columnId;
    setBoard((prev) => {
      const newBoard = addCard(prev, columnId, input);
      onBoardChange?.(newBoard, `Added "${input.title}" to ${colTitle}`, "add_card");
      return newBoard;
    });
  };

  const handleEditCard = (cardId: string, input: CardInput) => {
    setBoard((prev) => {
      const newBoard = editCard(prev, cardId, input);
      onBoardChange?.(newBoard, `Edited "${input.title}"`, "edit_card");
      return newBoard;
    });
  };

  const handleDeleteCard = (cardId: string) => {
    const cardTitle = deleteCardData?.card.title ?? cardId;
    setBoard((prev) => {
      const newBoard = deleteCard(prev, cardId);
      onBoardChange?.(newBoard, `Deleted "${cardTitle}"`, "delete_card");
      return newBoard;
    });
  };

  return (
    <section className={styles.boardSection}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => {
          const found = findCardById(board, active.id as string);
          setDraggingCard(found?.card ?? null);
        }}
        onDragEnd={({ active, over }) => {
          setDraggingCard(null);

          if (!over) return;

          const activeColumnId = active.data.current?.columnId as string | undefined;
          if (!activeColumnId) return;

          const overType = over.data.current?.type as string | undefined;
          const overColumnId = over.data.current?.columnId as string | undefined;
          if (!overColumnId) return;

          const sourceColumn = board.columns.find((c) => c.id === activeColumnId);
          const destColumn = board.columns.find((c) => c.id === overColumnId);
          if (!sourceColumn || !destColumn) return;

          const sourceIndex = sourceColumn.cards.findIndex((c) => c.id === active.id);
          if (sourceIndex === -1) return;

          let destIndex = destColumn.cards.length;
          if (overType === "card") {
            const idx = destColumn.cards.findIndex((c) => c.id === over.id);
            if (idx !== -1) destIndex = idx;
          }

          if (activeColumnId === overColumnId && sourceIndex === destIndex) return;

          const cardTitle = sourceColumn.cards[sourceIndex]?.title ?? "";
          const moveAction =
            activeColumnId === overColumnId
              ? `Reordered "${cardTitle}" in ${destColumn.title}`
              : `Moved "${cardTitle}" to ${destColumn.title}`;

          setBoard((prev) => {
            const newBoard = moveCard(prev, activeColumnId, overColumnId, sourceIndex, destIndex);
            onBoardChange?.(newBoard, moveAction, "move_card");
            return newBoard;
          });
        }}
        onDragCancel={() => setDraggingCard(null)}
      >
        <div className={styles.columnsGrid}>
          {board.columns.map((column) => (
            <SortableContext
              key={column.id}
              items={column.cards.map((card) => card.id)}
              strategy={verticalListSortingStrategy}
            >
              <Column
                column={column}
                onRename={handleRenameColumn}
                onAddCard={() => setAddColumnId(column.id)}
                onEditCard={(cardId) => setEditCardId(cardId)}
                onDeleteCard={(cardId) => setDeleteCardId(cardId)}
              />
            </SortableContext>
          ))}
        </div>

        <DragOverlay dropAnimation={{
          duration: 180,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {draggingCard ? (
            <CardItem
              card={draggingCard}
              columnId=""
              onEdit={() => {}}
              onDelete={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {addColumn && (
        <AddCardModal
          columnTitle={addColumn.title}
          onClose={() => setAddColumnId(null)}
          onSubmit={(input) => {
            if (isBlankInput(input.title) || isBlankInput(input.details)) return false;
            handleAddCard(addColumn.id, input);
            setAddColumnId(null);
            return true;
          }}
        />
      )}

      {editCardData && (
        <EditCardModal
          card={editCardData.card}
          onClose={() => setEditCardId(null)}
          onSubmit={(input) => {
            if (isBlankInput(input.title) || isBlankInput(input.details)) return false;
            handleEditCard(editCardData.card.id, input);
            setEditCardId(null);
            return true;
          }}
        />
      )}

      {deleteCardData && (
        <DeleteConfirmDialog
          cardTitle={deleteCardData.card.title}
          onCancel={() => setDeleteCardId(null)}
          onConfirm={() => {
            handleDeleteCard(deleteCardData.card.id);
            setDeleteCardId(null);
          }}
        />
      )}
    </section>
  );
}
