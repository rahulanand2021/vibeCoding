"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AuditLog.module.css";

export interface AuditEvent {
  id: number;
  timestamp: string;
  source: "user" | "ai";
  operation_type: string;
  summary: string;
}

type AuditLogProps = {
  isOpen: boolean;
  onClose: () => void;
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

export default function AuditLog({ isOpen, onClose }: AuditLogProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/audit?limit=100")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h3>Activity Log</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close activity log">
            ×
          </button>
        </header>

        <div className={styles.list} ref={listRef}>
          {loading && <p className={styles.empty}>Loading...</p>}
          {!loading && events.length === 0 && (
            <p className={styles.empty}>No activity recorded yet. Start editing the board!</p>
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
