import {
  addCard,
  addColumn,
  deleteCard,
  deleteColumn,
  editCard,
  findCardById,
  isBlankInput,
  moveCard,
  renameColumn,
  seededBoard,
  Board,
} from "@/lib/board";

describe("board helpers — existing operations", () => {
  it("renames a column", () => {
    const updated = renameColumn(seededBoard, "backlog", "Ideas");
    expect(updated.columns.find((column) => column.id === "backlog")?.title).toBe("Ideas");
  });

  it("does not mutate original board on rename", () => {
    renameColumn(seededBoard, "backlog", "Ideas");
    expect(seededBoard.columns.find((c) => c.id === "backlog")?.title).toBe("Backlog");
  });

  it("ignores blank rename", () => {
    const updated = renameColumn(seededBoard, "backlog", "   ");
    expect(updated.columns.find((c) => c.id === "backlog")?.title).toBe("Backlog");
  });

  it("adds a card", () => {
    const updated = addCard(seededBoard, "todo", { title: "New card", details: "Details" });
    const column = updated.columns.find((col) => col.id === "todo");
    expect(column?.cards.some((card) => card.title === "New card")).toBe(true);
  });

  it("adds a card with priority and labels", () => {
    const updated = addCard(seededBoard, "todo", {
      title: "Priority task",
      details: "Urgent",
      priority: "high",
      labels: ["backend", "critical"],
    });
    const card = updated.columns.find((c) => c.id === "todo")?.cards.find((c) => c.title === "Priority task");
    expect(card?.priority).toBe("high");
    expect(card?.labels).toEqual(["backend", "critical"]);
  });

  it("does not add card with blank title", () => {
    const original = seededBoard.columns.find((c) => c.id === "todo")?.cards.length ?? 0;
    const updated = addCard(seededBoard, "todo", { title: "  ", details: "Details" });
    expect(updated.columns.find((c) => c.id === "todo")?.cards.length).toBe(original);
  });

  it("edits a card", () => {
    const updated = editCard(seededBoard, "card-review-1", {
      title: "Review deck",
      details: "Update slides",
    });
    const column = updated.columns.find((col) => col.id === "review");
    expect(column?.cards.find((card) => card.id === "card-review-1")?.title).toBe("Review deck");
  });

  it("does not mutate original on editCard", () => {
    editCard(seededBoard, "card-review-1", { title: "Changed" });
    expect(seededBoard.columns.find((c) => c.id === "review")?.cards[0].title).toBe("Design review");
  });

  it("deletes a card", () => {
    const updated = deleteCard(seededBoard, "card-done-1");
    const column = updated.columns.find((col) => col.id === "done");
    expect(column?.cards.find((card) => card.id === "card-done-1")).toBeUndefined();
  });

  it("moves a card across columns", () => {
    const updated = moveCard(seededBoard, "todo", "in-progress", 0, 1);
    const sourceColumn = updated.columns.find((col) => col.id === "todo");
    const destColumn = updated.columns.find((col) => col.id === "in-progress");
    expect(sourceColumn?.cards.find((card) => card.id === "card-todo-1")).toBeUndefined();
    expect(destColumn?.cards.find((card) => card.id === "card-todo-1")).toBeDefined();
  });

  it("ignores moveCard with out-of-bounds sourceIndex", () => {
    const updated = moveCard(seededBoard, "todo", "done", 100, 0);
    expect(updated).toBe(seededBoard);
  });

  it("finds a card by id", () => {
    const result = findCardById(seededBoard, "card-review-1");
    expect(result).not.toBeNull();
    expect(result?.card.title).toBe("Design review");
    expect(result?.columnId).toBe("review");
  });

  it("returns null for unknown card id", () => {
    expect(findCardById(seededBoard, "nonexistent-id")).toBeNull();
  });
});

describe("board helpers — addColumn", () => {
  it("adds a new column", () => {
    const updated = addColumn(seededBoard, "QA");
    expect(updated.columns.length).toBe(seededBoard.columns.length + 1);
    const newCol = updated.columns.find((c) => c.title === "QA");
    expect(newCol).toBeDefined();
    expect(newCol?.cards).toEqual([]);
  });

  it("new column gets a unique id", () => {
    const updated = addColumn(seededBoard, "QA");
    const newCol = updated.columns.find((c) => c.title === "QA");
    expect(newCol?.id).toBeTruthy();
    const existingIds = seededBoard.columns.map((c) => c.id);
    expect(existingIds).not.toContain(newCol?.id);
  });

  it("ignores blank column title", () => {
    const updated = addColumn(seededBoard, "  ");
    expect(updated).toBe(seededBoard);
  });

  it("does not mutate original board", () => {
    const original = seededBoard.columns.length;
    addColumn(seededBoard, "New Col");
    expect(seededBoard.columns.length).toBe(original);
  });
});

describe("board helpers — deleteColumn", () => {
  it("deletes a column", () => {
    const updated = deleteColumn(seededBoard, "done");
    expect(updated.columns.find((c) => c.id === "done")).toBeUndefined();
    expect(updated.columns.length).toBe(seededBoard.columns.length - 1);
  });

  it("does not delete the last column", () => {
    const singleCol: Board = {
      id: "b",
      title: "Board",
      columns: [{ id: "only", title: "Only", cards: [] }],
    };
    const updated = deleteColumn(singleCol, "only");
    expect(updated.columns.length).toBe(1);
  });

  it("does not mutate original board", () => {
    const original = seededBoard.columns.length;
    deleteColumn(seededBoard, "done");
    expect(seededBoard.columns.length).toBe(original);
  });

  it("returns same board if column not found", () => {
    const updated = deleteColumn(seededBoard, "nonexistent");
    expect(updated.columns.length).toBe(seededBoard.columns.length);
  });
});

describe("isBlankInput", () => {
  it("returns true for empty string", () => expect(isBlankInput("")).toBe(true));
  it("returns true for whitespace", () => expect(isBlankInput("   ")).toBe(true));
  it("returns false for non-empty string", () => expect(isBlankInput("hello")).toBe(false));
});
