"use client";

import { useState, useEffect, useCallback } from "react";
import BoardView from "@/components/BoardView";
import Login from "@/components/Login";
import ChatSidebar, { ChatMessage } from "@/components/ChatSidebar";
import AuditLog from "@/components/AuditLog";
import BoardSelector from "@/components/BoardSelector";
import UserProfileModal from "@/components/modals/UserProfileModal";
import {
  fetchBoard,
  saveBoard,
  queryAi,
  listBoards,
  ApiError,
  BoardSummary,
} from "@/lib/api";
import { Board } from "@/lib/board";
import styles from "./page.module.css";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    if (token && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      const result = await listBoards();
      setBoards(result);
      return result;
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        handleLogout();
      }
      return [];
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBoard = useCallback(async (boardId?: number) => {
    setLoading(true);
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        handleLogout();
      } else {
        console.warn("Failed to fetch board:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoggedIn) return;
    loadBoards().then((loadedBoards) => {
      if (loadedBoards.length > 0) {
        const defaultBoard = loadedBoards.find((b) => b.is_default === 1) ?? loadedBoards[0];
        setActiveBoardId(defaultBoard.id);
        loadBoard(defaultBoard.id);
      }
    });
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectBoard = (boardId: number) => {
    setActiveBoardId(boardId);
    loadBoard(boardId);
    setChatMessages([]);
  };

  const handleBoardsChange = async () => {
    const updated = await loadBoards();
    if (activeBoardId && !updated.find((b) => b.id === activeBoardId)) {
      const fallback = updated[0];
      if (fallback) {
        setActiveBoardId(fallback.id);
        loadBoard(fallback.id);
      }
    }
  };

  const handleBoardChange = async (
    updatedBoard: Board,
    action?: string,
    operationType?: string
  ) => {
    setBoard(updatedBoard);
    try {
      await saveBoard(updatedBoard, action, operationType, activeBoardId ?? undefined);
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        handleLogout();
      } else {
        console.error("Error saving board:", err);
      }
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
      const data = await queryAi(
        message,
        board!,
        chatMessages.slice(-10).map((msg) => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.text,
        })),
        activeBoardId ?? undefined
      );

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        text: data.text || "I couldn't process your request.",
        isUser: false,
        timestamp: new Date(),
        boardUpdate: data.boardUpdate as import("@/components/ChatSidebar").BoardUpdate | undefined,
      };
      setChatMessages((prev) => [...prev, aiMessage]);

      if (data.boardUpdate?.operations && data.boardUpdate.operations.length > 0) {
        await loadBoard(activeBoardId ?? undefined);
      }
    } catch (err) {
      const text =
        err instanceof ApiError && err.isUnauthorized
          ? "Session expired. Please log in again."
          : "Sorry, I encountered an error processing your request.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          text,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      if (err instanceof ApiError && err.isUnauthorized) {
        handleLogout();
      }
    }
  };

  const handleLogin = (token: string, user: string) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
    setBoard(null);
    setBoards([]);
    setActiveBoardId(null);
  };

  const activeBoardName = boards.find((b) => b.id === activeBoardId)?.name;

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.appbar}>
        <div className={styles.brand}>
          <button
            className={styles.sidebarToggle}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle board list"
            title="Switch board"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className={styles.brandIcon}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.5"/>
              <rect x="7" y="1" width="4" height="11" rx="1.5" fill="currentColor"/>
              <rect x="13" y="1" width="4" height="7" rx="1.5" fill="currentColor" opacity="0.75"/>
            </svg>
          </div>
          <div>
            <p className={styles.brandTitle}>Kanban Flow</p>
            <p className={styles.brandSub}>{activeBoardName || "Project board"}</p>
          </div>
        </div>

        <nav className={styles.headerActions}>
          <button onClick={() => setChatOpen(true)} className={styles.chatButton} aria-label="Open AI assistant">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.btnLabel}>AI Assistant</span>
          </button>

          <button onClick={() => setAuditOpen(true)} className={styles.auditButton} aria-label="View activity log">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className={styles.btnLabel}>Activity</span>
          </button>

          <div className={styles.divider} aria-hidden="true" />

          <button
            className={styles.userLabel}
            onClick={() => setProfileOpen(true)}
            title={`${username} — click to manage account`}
            aria-label="Account settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {username}
          </button>

          <button onClick={handleLogout} className={styles.logoutButton} aria-label="Log out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className={styles.btnLabel}>Logout</span>
          </button>
        </nav>
      </header>

      <div className={styles.layout}>
        {/* Board sidebar */}
        {sidebarOpen && (
          <>
            <aside className={styles.boardSidebar} aria-label="Board navigation">
              <BoardSelector
                boards={boards}
                activeBoardId={activeBoardId}
                onSelect={(id) => {
                  handleSelectBoard(id);
                  setSidebarOpen(false);
                }}
                onBoardsChange={handleBoardsChange}
              />
            </aside>
            <div
              className={styles.sidebarOverlay}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          </>
        )}

        <main className={styles.boardCanvas}>
          {loading && (
            <p className={styles.loadingState}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
              </svg>
              Loading board…
            </p>
          )}
          {board && !loading && (
            <BoardView initialBoard={board} onBoardChange={handleBoardChange} />
          )}
        </main>
      </div>

      <ChatSidebar
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSendMessage={sendMessage}
      />

      <AuditLog
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        boardId={activeBoardId ?? undefined}
      />

      {profileOpen && (
        <UserProfileModal username={username} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
