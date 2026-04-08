"use client";

import { useState } from "react";
import { login, register, ApiError } from "@/lib/api";
import styles from "./Login.module.css";

interface LoginProps {
  onLogin: (token: string, username: string) => void;
}

type Mode = "login" | "register";

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login(username.trim(), password)
          : await register(username.trim(), password, email.trim() || undefined);

      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username);
      onLogin(result.token, result.username);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Invalid username or password.");
        } else if (err.status === 409) {
          setError("Username is already taken. Please choose another.");
        } else {
          setError(err.detail || "An error occurred. Please try again.");
        }
      } else {
        setError("Cannot connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setEmail("");
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginBrand}>
          <div className={styles.loginBrandIcon}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.5"/>
              <rect x="7" y="1" width="4" height="11" rx="1.5" fill="currentColor"/>
              <rect x="13" y="1" width="4" height="7" rx="1.5" fill="currentColor" opacity="0.75"/>
            </svg>
          </div>
          <h1 className={styles.loginBrandTitle}>Kanban Flow</h1>
        </div>

        <p className={styles.loginHeading}>
          {mode === "login" ? "Sign in to your workspace" : "Create your account"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === "login" ? "Enter username" : "Choose a username"}
              autoComplete="username"
              required
              minLength={mode === "register" ? 3 : 1}
              maxLength={50}
            />
          </div>

          {mode === "register" && (
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email (optional)</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "login" ? "Enter password" : "At least 6 characters"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 6 : 1}
            />
          </div>

          {mode === "register" && (
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className={styles.loginSwitchText}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button type="button" onClick={switchMode} className={styles.loginSwitchLink}>
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>

        {mode === "login" && (
          <p className={styles.loginHint}>
            Demo: <code>user</code> / <code>password</code>
          </p>
        )}
      </div>
    </div>
  );
}
