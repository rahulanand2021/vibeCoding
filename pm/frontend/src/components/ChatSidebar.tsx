"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ChatSidebar.module.css";

export type BoardOperationType =
  | "add_card"
  | "edit_card"
  | "delete_card"
  | "move_card"
  | "rename_column";

export interface BoardOperation {
  type: BoardOperationType;
  columnId?: string;
  cardId?: string;
  title?: string;
  details?: string;
  sourceColumnId?: string;
  destColumnId?: string;
  position?: number;
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
          <h3>AI Assistant</h3>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <p>👋 Hi! I&apos;m your AI assistant. I can help you manage your Kanban board.</p>
              <p>Try asking me to:</p>
              <ul>
                <li>Add a new card to a column</li>
                <li>Edit or move existing cards</li>
                <li>Rename columns</li>
                <li>Get suggestions for your workflow</li>
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
                    <small>📋 Board updated:</small>
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
            placeholder="Ask me to manage your board..."
            disabled={isLoading}
            className={styles.input}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={styles.sendButton}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
