export interface Card {
    id: string;
    title: string;
    details: string;
}

export interface Column {
    id: string;
    title: string;
    cards: Card[];
}

export interface Board {
    id: string;
    title: string;
    columns: Column[];
}

export const INITIAL_BOARD: Board = {
    id: "board-1",
    title: "MVP Board",
    columns: [
        {
            id: "col-backlog",
            title: "Backlog",
            cards: [
                { id: "card-1", title: "Research Features", details: "Review user requirements" },
                { id: "card-2", title: "Architecture Design", details: "Plan component layout" },
            ]
        },
        {
            id: "col-todo",
            title: "To Do",
            cards: [
                { id: "card-3", title: "Implement Drag and Drop", details: "Use @dnd-kit to make cards draggable" }
            ]
        },
        { id: "col-in-progress", title: "In Progress", cards: [] },
        { id: "col-review", title: "Review", cards: [] },
        { id: "col-done", title: "Done", cards: [] },
    ]
};
