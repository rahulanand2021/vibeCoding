import { describe, expect, it } from "vitest";
import { seedBoard } from "@/lib/kanban/seed";
import { addCardToColumn, deleteCard, editCard, moveCard, renameColumn } from "@/lib/kanban/state";

describe("kanban state helpers", () => {
  it("renames a column", () => {
    const next = renameColumn(seedBoard, "column-backlog", "Ideas");
    expect(next.columns[0]?.title).toBe("Ideas");
    expect(seedBoard.columns[0]?.title).toBe("Backlog");
  });

  it("adds a card to a column", () => {
    const next = addCardToColumn(seedBoard, "column-todo", "New task", "Details");
    const todoColumn = next.columns.find((column) => column.id === "column-todo");
    expect(todoColumn?.cards.at(-1)?.title).toBe("New task");
  });

  it("deletes a card from a column", () => {
    const next = deleteCard(seedBoard, "column-backlog", "card-1");
    const backlog = next.columns.find((column) => column.id === "column-backlog");
    expect(backlog?.cards).toHaveLength(0);
  });

  it("edits a card title and details", () => {
    const next = editCard(
      seedBoard,
      "column-todo",
      "card-2",
      "Refine launch narrative",
      "Share first draft with design and content.",
    );
    const todo = next.columns.find((column) => column.id === "column-todo");
    expect(todo?.cards[0]?.title).toBe("Refine launch narrative");
    expect(todo?.cards[0]?.details).toBe("Share first draft with design and content.");
  });

  it("moves card within same column and across columns", () => {
    const boardWithExtra = addCardToColumn(seedBoard, "column-backlog", "Second", "Move me");
    const intra = moveCard(boardWithExtra, "column-backlog", "column-backlog", 1, 0);
    const firstInBacklog = intra.columns.find((column) => column.id === "column-backlog")?.cards[0];
    expect(firstInBacklog?.title).toBe("Second");

    const inter = moveCard(intra, "column-backlog", "column-todo", 0, 0);
    const backlogAfter = inter.columns.find((column) => column.id === "column-backlog")?.cards;
    const todoAfter = inter.columns.find((column) => column.id === "column-todo")?.cards;
    expect(backlogAfter).toHaveLength(1);
    expect(todoAfter?.[0]?.title).toBe("Second");
  });
});
