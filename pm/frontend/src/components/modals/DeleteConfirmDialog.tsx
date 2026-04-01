import styles from "./Modal.module.css";

type DeleteConfirmDialogProps = {
  cardTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmDialog({
  cardTitle,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <div className={`${styles.overlay} ${styles.overlaySoft}`} role="presentation">
      <div className={`${styles.modal} ${styles.modalCompact}`} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.modalKicker}>Delete card</p>
            <h2 className={styles.modalTitle}>Remove &ldquo;{cardTitle}&rdquo;?</h2>
          </div>
        </header>
        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            This action can&apos;t be undone. The card will disappear from the board.
          </p>
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={onCancel}>
              Keep
            </button>
            <button type="button" className={styles.dangerButton} onClick={onConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
