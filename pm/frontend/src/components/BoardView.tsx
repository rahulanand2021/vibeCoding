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
import type { Board, Card, CardInput, CardPriority } from "@/lib/board";
import {
  addCard,
  addColumn as boardAddColumn,
  deleteCard,
  deleteColumn as boardDeleteColumn,
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
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<CardPriority | "">("");

  // Filtered view (only for display — operations always use full board state)
  const displayBoard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q && !priorityFilter) return board;
    return {
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => {
          if (priorityFilter && card.priority !== priorityFilter) return false;
          if (q) {
            const inTitle = card.title.toLowerCase().includes(q);
            const inDetails = card.details.toLowerCase().includes(q);
            const inLabels = card.labels?.some((l) => l.toLowerCase().includes(q));
            return inTitle || inDetails || inLabels;
          }
          return true;
        }),
      })),
    };
  }, [board, searchQuery, priorityFilter]);

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

  const handleAddColumn = () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    setBoard((prev) => {
      const newBoard = boardAddColumn(prev, trimmed);
      onBoardChange?.(newBoard, `Added column "${trimmed}"`, "add_column");
      return newBoard;
    });
    setNewColumnTitle("");
    setShowAddColumn(false);
  };

  const handleDeleteColumn = (columnId: string) => {
    const colTitle = board.columns.find((c) => c.id === columnId)?.title ?? columnId;
    if (!window.confirm(`Delete column "${colTitle}" and all its cards?`)) return;
    setBoard((prev) => {
      const newBoard = boardDeleteColumn(prev, columnId);
      onBoardChange?.(newBoard, `Deleted column "${colTitle}"`, "delete_column");
      return newBoard;
    });
  };

  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (priorityFilter ? 1 : 0);
  const filteredCardCount = displayBoard.columns.reduce((sum, col) => sum + col.cards.length, 0);
  const totalCardCount = board.columns.reduce((sum, col) => sum + col.cards.length, 0);

  return (
    <section className={styles.boardSection}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards…"
            aria-label="Search cards"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as CardPriority | "")}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {activeFilterCount > 0 && (
          <button
            type="button"
            className={styles.clearFilters}
            onClick={() => { setSearchQuery(""); setPriorityFilter(""); }}
            aria-label="Clear filters"
          >
            Clear ({filteredCardCount}/{totalCardCount})
          </button>
        )}
      </div>

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
          {displayBoard.columns.map((column) => (
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
                onDeleteColumn={handleDeleteColumn}
                canDelete={board.columns.length > 1}
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

      <div className={styles.addColumnArea}>
        {showAddColumn ? (
          <div className={styles.addColumnForm}>
            <input
              className={styles.addColumnInput}
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Column name"
              aria-label="New column name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") { setShowAddColumn(false); setNewColumnTitle(""); }
              }}
              autoFocus
            />
            <button type="button" className={styles.addColumnConfirm} onClick={handleAddColumn}>Add</button>
            <button type="button" className={styles.addColumnCancel} onClick={() => { setShowAddColumn(false); setNewColumnTitle(""); }}>Cancel</button>
          </div>
        ) : (
          <button type="button" className={styles.addColumnButton} onClick={() => setShowAddColumn(true)}>
            + Add column
          </button>
        )}
      </div>

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
