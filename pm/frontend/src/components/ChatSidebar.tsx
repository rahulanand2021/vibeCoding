"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ChatSidebar.module.css";

export type BoardOperationType =
  | "add_card"
  | "edit_card"
  | "delete_card"
  | "move_card"
  | "rename_column"
  | "add_column"
  | "delete_column"
  | "reorder_columns";

export interface BoardOperation {
  type: BoardOperationType;
  columnId?: string;
  cardId?: string;
  title?: string;
  details?: string;
  sourceColumnId?: string;
  destColumnId?: string;
  position?: number;
  columnIds?: string[];
  priority?: string;
  due_date?: string;
  labels?: string[];
}

export interface BoardUpdate {
  operations: BoardOperation[];
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  boardUpdate?: BoardUpdate;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  messages,
  onSendMessage,
}: ChatSidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} data-testid="chat-overlay">
      <div className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>AI Assistant</h3>
          </div>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close AI assistant">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                  <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h4>How can I help?</h4>
              <p>I can manage your Kanban board using natural language.</p>
              <ul>
                <li>Add a card to a column</li>
                <li>Move or edit existing cards</li>
                <li>Rename columns</li>
                <li>Suggest workflow improvements</li>
              </ul>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.isUser ? styles.userMessage : styles.aiMessage
              }`}
            >
              <div className={styles.messageContent}>
                <p>{message.text}</p>
                {message.boardUpdate && message.boardUpdate.operations.length > 0 && (
                  <div className={styles.boardUpdate}>
                    <small>Board updated:</small>
                    <ul>
                      {message.boardUpdate.operations.map((op, index) => (
                        <li key={index}>
                          {op.type === "add_card" && `Added "${op.title}" to ${op.columnId}`}
                          {op.type === "edit_card" && `Edited card ${op.cardId}`}
                          {op.type === "delete_card" && `Deleted card ${op.cardId}`}
                          {op.type === "move_card" && `Moved card ${op.cardId} to ${op.destColumnId}`}
                          {op.type === "rename_column" && `Renamed ${op.columnId} to "${op.title}"`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <small className={styles.timestamp}>
                {formatTime(message.timestamp)}
              </small>
            </div>
          ))}

          {isLoading && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.typing}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me to manage your board…"
            disabled={isLoading}
            className={styles.input}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={styles.sendButton}
            aria-label="Send message"
          >
            {isLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
