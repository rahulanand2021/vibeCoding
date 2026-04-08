"use client";

import { useEffect, useRef, useState } from "react";
import { getAuditLog, AuditEvent } from "@/lib/api";
import styles from "./AuditLog.module.css";

type AuditLogProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId?: number;
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function opLabel(operationType: string): string {
  return operationType.replace(/_/g, " ");
}

export default function AuditLog({ isOpen, onClose, boardId }: AuditLogProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getAuditLog(100, boardId)
      .then((data) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Activity Log</h3>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close activity log">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </header>

        <div className={styles.list} ref={listRef}>
          {loading && <p className={styles.empty}>Loading activity…</p>}
          {!loading && events.length === 0 && (
            <p className={styles.empty}>No activity recorded yet.<br/>Start editing the board to see changes here.</p>
          )}
          {!loading &&
            events.map((event) => (
              <div key={event.id} className={styles.event}>
                <div className={styles.eventMeta}>
                  <span className={`${styles.badge} ${event.source === "ai" ? styles.badgeAi : styles.badgeUser}`}>
                    {event.source === "ai" ? "AI" : "You"}
                  </span>
                  <span className={styles.opLabel}>{opLabel(event.operation_type)}</span>
                  <time className={styles.timestamp}>{formatTimestamp(event.timestamp)}</time>
                </div>
                <p className={styles.summary}>{event.summary}</p>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}
