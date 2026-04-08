import { useState, type FormEvent } from "react";
import { changePassword, ApiError } from "@/lib/api";
import styles from "./Modal.module.css";

type UserProfileModalProps = {
  username: string;
  onClose: () => void;
};

export default function UserProfileModal({ username, onClose }: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Current password is incorrect.");
      } else {
        setError("Failed to change password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="User profile">
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.modalKicker}>Account</p>
            <h2 className={styles.modalTitle}>{username}</h2>
          </div>
        </header>

        <form className={styles.modalBody} onSubmit={handleSubmit}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--dark-navy)" }}>
            Change password
          </p>
          <label className={styles.label}>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
              aria-label="Current password"
            />
          </label>
          <label className={styles.label}>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              aria-label="New password"
            />
          </label>
          <label className={styles.label}>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              aria-label="Confirm new password"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {success && (
            <p style={{ margin: 0, color: "#15803d", fontSize: "0.875rem" }}>
              Password changed successfully.
            </p>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Close
            </button>
            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
