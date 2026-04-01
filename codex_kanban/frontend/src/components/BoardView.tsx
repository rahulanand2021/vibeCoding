"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Board, CardInput } from "@/lib/board";
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
import AddCardModal from "./modals/AddCardModal";
import EditCardModal from "./modals/EditCardModal";
import DeleteConfirmDialog from "./modals/DeleteConfirmDialog";
import styles from "./BoardView.module.css";

const activationDistance = 8;

type BoardViewProps = {
  initialBoard: Board;
};

export default function BoardView({ initialBoard }: BoardViewProps) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [addColumnId, setAddColumnId] = useState<string | null>(null);
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: activationDistance },
    })
  );

  const editCardData = useMemo(() => {
    if (!editCardId) {
      return null;
    }
    return findCardById(board, editCardId);
  }, [board, editCardId]);

  const deleteCardData = useMemo(() => {
    if (!deleteCardId) {
      return null;
    }
    return findCardById(board, deleteCardId);
  }, [board, deleteCardId]);

  const addColumn = addColumnId
    ? board.columns.find((column) => column.id === addColumnId)
    : null;

  const handleRenameColumn = (columnId: string, nextTitle: string) => {
    setBoard((prev) => renameColumn(prev, columnId, nextTitle));
  };

  const handleAddCard = (columnId: string, input: CardInput) => {
    setBoard((prev) => addCard(prev, columnId, input));
  };

  const handleEditCard = (cardId: string, input: CardInput) => {
    setBoard((prev) => editCard(prev, cardId, input));
  };

  const handleDeleteCard = (cardId: string) => {
    setBoard((prev) => deleteCard(prev, cardId));
  };

  return (
    <section className={styles.boardSection}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over) {
            return;
          }

          const activeColumnId = active.data.current?.columnId as string | undefined;
          if (!activeColumnId) {
            return;
          }

          const overType = over.data.current?.type as string | undefined;
          const overColumnId = over.data.current?.columnId as string | undefined;

          if (!overColumnId) {
            return;
          }

          const sourceColumn = board.columns.find(
            (column) => column.id === activeColumnId
          );
          const destColumn = board.columns.find(
            (column) => column.id === overColumnId
          );

          if (!sourceColumn || !destColumn) {
            return;
          }

          const sourceIndex = sourceColumn.cards.findIndex(
            (card) => card.id === active.id
          );
          if (sourceIndex === -1) {
            return;
          }

          let destIndex = destColumn.cards.length;
          if (overType === "card") {
            destIndex = destColumn.cards.findIndex((card) => card.id === over.id);
            if (destIndex === -1) {
              destIndex = destColumn.cards.length;
            }
          }

          if (
            activeColumnId === overColumnId &&
            sourceIndex === destIndex
          ) {
            return;
          }

          setBoard((prev) =>
            moveCard(prev, activeColumnId, overColumnId, sourceIndex, destIndex)
          );
        }}
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
      </DndContext>

      {addColumn && (
        <AddCardModal
          columnTitle={addColumn.title}
          onClose={() => setAddColumnId(null)}
          onSubmit={(input) => {
            if (isBlankInput(input.title) || isBlankInput(input.details)) {
              return false;
            }
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
            if (isBlankInput(input.title) || isBlankInput(input.details)) {
              return false;
            }
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
