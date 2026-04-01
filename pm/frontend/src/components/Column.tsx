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
};

export default function Column({
  column,
  onRename,
  onAddCard,
  onEditCard,
  onDeleteCard,
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
          >
            <h3 className={styles.columnTitle}>{column.title}</h3>
          </button>
        )}
        <button type="button" className={styles.addCardButton} onClick={onAddCard}>
          Add card
        </button>
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
