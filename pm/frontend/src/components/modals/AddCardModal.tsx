import { useState, type FormEvent } from "react";
import type { CardInput } from "@/lib/board";
import styles from "./Modal.module.css";

type AddCardModalProps = {
  columnTitle: string;
  onClose: () => void;
  onSubmit: (input: CardInput) => boolean;
};

export default function AddCardModal({
  columnTitle,
  onClose,
  onSubmit,
}: AddCardModalProps) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const success = onSubmit({ title, details });
    if (!success) {
      setError("Title and details cannot be empty.");
      return;
    }
    setError(null);
  };

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.modalKicker}>Add a card</p>
            <h2 className={styles.modalTitle}>New card for {columnTitle}</h2>
          </div>
        </header>
        <form className={styles.modalBody} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={styles.input}
              placeholder="Add a short title"
              aria-label="Card title"
            />
          </label>
          <label className={styles.label}>
            Details
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className={styles.textarea}
              placeholder="Add supporting details"
              rows={4}
              aria-label="Card details"
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Add card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
