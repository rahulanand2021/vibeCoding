import BoardView from "@/components/BoardView";
import { seededBoard } from "@/lib/board";
import styles from "./page.module.css";

export default function Home() {
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
          <h2 className={styles.headerCardTitle}>Today's focus</h2>
          <p className={styles.headerCardText}>
            Move one card to Done and celebrate progress. Small wins add up.
          </p>
        </div>
      </header>

      <BoardView initialBoard={seededBoard} />
    </main>
  );
}
