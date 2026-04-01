import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { Card } from "@/lib/board";
import styles from "./CardItem.module.css";

type CardItemProps = {
  card: Card;
  columnId: string;
  onEdit: () => void;
  onDelete: () => void;
  isOverlay?: boolean;
};

export default function CardItem({ card, columnId, onEdit, onDelete, isOverlay }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { type: "card", columnId },
      disabled: isOverlay,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  // Overlay: floating card following the cursor — looks lifted
  if (isOverlay) {
    return (
      <article className={`${styles.card} ${styles.overlay}`}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{card.title}</h4>
        </div>
        <p className={styles.cardDetails}>{card.details}</p>
      </article>
    );
  }

  // Ghost: placeholder left at the source slot while dragging
  if (isDragging) {
    return (
      <article
        ref={setNodeRef}
        style={style}
        className={styles.ghost}
        {...attributes}
        {...listeners}
      />
    );
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={styles.card}
      data-card-title={card.title}
      {...attributes}
      {...listeners}
    >
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{card.title}</h4>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onEdit}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Edit card"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M4 16.75V20h3.25L17.81 9.44l-3.25-3.25L4 16.75z" fill="currentColor" />
              <path
                d="M20.71 5.63a1 1 0 0 0 0-1.41l-2.93-2.93a1 1 0 0 0-1.41 0l-1.86 1.86 4.34 4.34 1.86-1.86z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.deleteButton}`}
            onClick={onDelete}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Delete card"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M6 7h12l-1 13H7L6 7zm4-3h4l1 2H9l1-2z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      <p className={styles.cardDetails}>{card.details}</p>
    </article>
  );
}
