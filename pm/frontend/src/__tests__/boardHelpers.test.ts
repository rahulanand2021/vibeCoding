import {
  addCard,
  deleteCard,
  editCard,
  moveCard,
  renameColumn,
  seededBoard,
} from "@/lib/board";

describe("board helpers", () => {
  it("renames a column", () => {
    const updated = renameColumn(seededBoard, "backlog", "Ideas");
    expect(updated.columns.find((column) => column.id === "backlog")?.title).toBe(
      "Ideas"
    );
  });

  it("adds a card", () => {
    const updated = addCard(seededBoard, "todo", {
      title: "New card",
      details: "Details",
    });
    const column = updated.columns.find((col) => col.id === "todo");
    expect(column?.cards.some((card) => card.title === "New card")).toBe(true);
  });

  it("edits a card", () => {
    const updated = editCard(seededBoard, "card-review-1", {
      title: "Review deck",
      details: "Update slides",
    });
    const column = updated.columns.find((col) => col.id === "review");
    expect(column?.cards.find((card) => card.id === "card-review-1")?.title).toBe(
      "Review deck"
    );
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
});
