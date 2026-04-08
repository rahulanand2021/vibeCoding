"use client";

import { useState } from "react";
import {
  BoardSummary,
  createBoard,
  renameBoard,
  deleteBoard,
  setDefaultBoard,
  ApiError,
} from "@/lib/api";
import styles from "./BoardSelector.module.css";

interface BoardSelectorProps {
  boards: BoardSummary[];
  activeBoardId: number | null;
  onSelect: (boardId: number) => void;
  onBoardsChange: () => void;
}

export default function BoardSelector({
  boards,
  activeBoardId,
  onSelect,
  onBoardsChange,
}: BoardSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBoardName.trim();
    if (!name) return;
    setLoading(true);
    setError("");
    try {
      const result = await createBoard(name);
      setCreating(false);
      setNewBoardName("");
      onBoardsChange();
      onSelect(result.board_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  const startRename = (board: BoardSummary) => {
    setRenamingId(board.id);
    setRenameValue(board.name);
    setError("");
  };

  const handleRename = async (boardId: number) => {
    const name = renameValue.trim();
    if (!name) return;
    setLoading(true);
    setError("");
    try {
      await renameBoard(boardId, name);
      setRenamingId(null);
      onBoardsChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to rename");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (boardId: number, name: string) => {
    if (!window.confirm(`Delete board "${name}"? This cannot be undone.`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteBoard(boardId);
      if (activeBoardId === boardId && boards.length > 1) {
        const remaining = boards.find((b) => b.id !== boardId);
        if (remaining) onSelect(remaining.id);
      }
      onBoardsChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete board");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (boardId: number) => {
    setLoading(true);
    try {
      await setDefaultBoard(boardId);
      onBoardsChange();
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>My Boards</span>
        <button
          className={styles.newBoardBtn}
          onClick={() => { setCreating(true); setError(""); }}
          disabled={creating}
          aria-label="Create new board"
          title="New board"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          New
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <ul className={styles.boardList} role="listbox" aria-label="Board list">
        {boards.map((board) => (
          <li
            key={board.id}
            className={`${styles.boardItem} ${board.id === activeBoardId ? styles.active : ""}`}
            role="option"
            aria-selected={board.id === activeBoardId}
          >
            {renamingId === board.id ? (
              <form
                className={styles.renameForm}
                onSubmit={(e) => { e.preventDefault(); handleRename(board.id); }}
              >
                <input
                  className={styles.renameInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  maxLength={100}
                  onBlur={() => setRenamingId(null)}
                />
                <button type="submit" className={styles.renameConfirm} disabled={loading}>
                  Save
                </button>
              </form>
            ) : (
              <>
                <button
                  className={styles.boardName}
                  onClick={() => onSelect(board.id)}
                  title={board.name}
                >
                  <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <rect x="1" y="1" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.5"/>
                    <rect x="7" y="1" width="4" height="11" rx="1.5" fill="currentColor"/>
                    <rect x="13" y="1" width="4" height="7" rx="1.5" fill="currentColor" opacity="0.75"/>
                  </svg>
                  <span>{board.name}</span>
                  {board.is_default === 1 && (
                    <span className={styles.defaultBadge} title="Default board">default</span>
                  )}
                </button>

                <div className={styles.boardActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => startRename(board)}
                    title="Rename board"
                    aria-label={`Rename ${board.name}`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  {board.is_default !== 1 && (
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleSetDefault(board.id)}
                      title="Set as default"
                      aria-label={`Set ${board.name} as default`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                  {boards.length > 1 && (
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDelete(board.id, board.name)}
                      title="Delete board"
                      aria-label={`Delete ${board.name}`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {creating && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            className={styles.createInput}
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="Board name…"
            autoFocus
            maxLength={100}
            required
          />
          <div className={styles.createActions}>
            <button type="submit" className={styles.createConfirm} disabled={loading}>
              Create
            </button>
            <button
              type="button"
              className={styles.createCancel}
              onClick={() => { setCreating(false); setNewBoardName(""); setError(""); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
