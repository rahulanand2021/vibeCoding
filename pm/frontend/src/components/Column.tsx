import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Column as ColumnType } from "@/lib/board";
import CardItem from "./CardItem";
import styles from "./Column.module.css";

type ColumnProps = {
  column: ColumnType;
  onRename: (columnId: string, title: string) => void;
  onAddCard: () => void;
  onEditCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  canDelete?: boolean;
};

export default function Column({
  column,
  onRename,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onDeleteColumn,
  canDelete = false,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  // Sync external title changes (e.g. AI rename) into local draft state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftTitle(column.title);
  }, [column.title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed.length > 0 && trimmed !== column.title) {
      onRename(column.id, trimmed);
    } else {
      setDraftTitle(column.title);
    }
    setIsEditing(false);
  };

  return (
    <section
      className={`${styles.column} ${isOver ? styles.columnOver : ""}`}
      data-testid={`column-${column.id}`}
    >
      <header className={styles.columnHeader}>
        <div className={styles.columnTitleWrap}>
          {isEditing ? (
            <input
              ref={inputRef}
              className={styles.columnInput}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitTitle();
                }
                if (event.key === "Escape") {
                  setDraftTitle(column.title);
                  setIsEditing(false);
                }
              }}
              aria-label="Column title"
            />
          ) : (
            <button
              type="button"
              className={styles.columnTitleButton}
              onClick={() => setIsEditing(true)}
              title="Click to rename"
            >
              <h3 className={styles.columnTitle}>{column.title}</h3>
            </button>
          )}
          {!isEditing && (
            <span className={styles.cardCount}>{column.cards.length}</span>
          )}
        </div>

        <div className={styles.columnHeaderActions}>
          <button
            type="button"
            className={styles.addCardButton}
            onClick={onAddCard}
            aria-label={`Add card to ${column.title}`}
            title="Add card"
          >
            +
          </button>
          {canDelete && onDeleteColumn && (
            <button
              type="button"
              className={styles.deleteColumnButton}
              onClick={() => onDeleteColumn(column.id)}
              aria-label={`Delete column ${column.title}`}
              title="Delete column"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M6 7h12l-1 13H7L6 7zm4-3h4l1 2H9l1-2z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={styles.cardList}
        data-testid={`column-drop-${column.id}`}
      >
        {column.cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            columnId={column.id}
            onEdit={() => onEditCard(card.id)}
            onDelete={() => onDeleteCard(card.id)}
          />
        ))}
      </div>
    </section>
  );
}
