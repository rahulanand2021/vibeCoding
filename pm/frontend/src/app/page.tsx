"use client";

import { useState, useEffect } from "react";
import BoardView from "@/components/BoardView";
import Login from "@/components/Login";
import ChatSidebar, { ChatMessage } from "@/components/ChatSidebar";
import AuditLog from "@/components/AuditLog";
import { seededBoard, Board } from "@/lib/board";
import styles from "./page.module.css";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn") === "true";
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      fetchBoard();
    }
  }, []);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/board");
      if (response.ok) {
        const data = await response.json();
        setBoard(data);
      } else {
        console.warn("Failed to fetch board, using seeded data");
        setBoard(seededBoard);
      }
    } catch (error) {
      console.warn("Could not reach board API, using seeded data:", error);
      setBoard(seededBoard);
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = async (updatedBoard: Board, action?: string, operationType?: string) => {
    try {
      const response = await fetch("/api/board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ board: updatedBoard, action, operation_type: operationType }),
      });
      if (!response.ok) {
        console.error("Failed to save board");
      }
    } catch (error) {
      console.error("Error saving board:", error);
    }
  };

  const sendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: message,
      isUser: true,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message,
          board: board,
          conversation: chatMessages.slice(-10).map((msg) => ({
            role: msg.isUser ? "user" : "assistant",
            content: msg.text,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const aiMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          text: data.text || "I couldn't process your request.",
          isUser: false,
          timestamp: new Date(),
          boardUpdate: data.boardUpdate,
        };
        setChatMessages((prev) => [...prev, aiMessage]);

        if (data.boardUpdate?.operations?.length > 0) {
          await fetchBoard();
        }
      } else {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          text: "Sorry, I encountered an error processing your request.",
          isUser: false,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        text: "Sorry, I couldn't connect to the AI service.",
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    fetchBoard();
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    setIsLoggedIn(false);
    setBoard(null);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Single board, zero clutter</p>
          <h1 className={styles.title}>Kanban Flow</h1>
          <p className={styles.subtitle}>
            Keep momentum visible with a clean, focused board built for real-time clarity.
          </p>
        </div>
        <div className={styles.headerCard}>
          <h2 className={styles.headerCardTitle}>Today&apos;s focus</h2>
          <p className={styles.headerCardText}>
            Move one card to Done and celebrate progress. Small wins add up.
          </p>
          <div className={styles.headerActions}>
            <button onClick={() => setChatOpen(true)} className={styles.chatButton}>
              💬 AI Assistant
            </button>
            <button onClick={() => setAuditOpen(true)} className={styles.auditButton}>
              Activity
            </button>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {loading && <p>Loading board...</p>}
      {board && !loading && <BoardView initialBoard={board} onBoardChange={saveBoard} />}

      <ChatSidebar
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSendMessage={sendMessage}
      />

      <AuditLog isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
    </main>
  );
}
