import { describe, it, expect } from 'vitest';
import { Board } from '../types/kanban';
import { renameColumn, addCard, editCard, deleteCard, moveCard } from './boardState';

const mockBoard: Board = {
    id: "test-board",
    title: "Test",
    columns: [
        {
            id: "col-1",
            title: "To Do",
            cards: [
                { id: "c-1", title: "Task 1", details: "Desc 1" },
                { id: "c-2", title: "Task 2", details: "Desc 2" }
            ]
        },
        {
            id: "col-2",
            title: "Done",
            cards: []
        }
    ]
};

describe('Board State Helpers', () => {
    it('renameColumn changes the title of the correct column', () => {
        const newBoard = renameColumn(mockBoard, "col-1", "In Progress");
        expect(newBoard.columns[0].title).toBe("In Progress");
        expect(newBoard.columns[1].title).toBe("Done"); // unmodified
    });

    it('addCard adds a card with trimmed text and random UUID', () => {
        const newBoard = addCard(mockBoard, "col-2", "  Task 3  ", "  Desc 3  ");
        expect(newBoard.columns[1].cards.length).toBe(1);
        expect(newBoard.columns[1].cards[0].title).toBe("Task 3");
        expect(newBoard.columns[1].cards[0].details).toBe("Desc 3");
        expect(newBoard.columns[1].cards[0].id).toBeTypeOf("string");
    });

    it('addCard ignores empty inputs', () => {
        const newBoard = addCard(mockBoard, "col-1", "   ", "   ");
        expect(newBoard).toBe(mockBoard); // Object identity remains same due to early return
    });

    it('editCard updates title and details', () => {
        const newBoard = editCard(mockBoard, "c-1", "Updated Task 1", "Updated Desc 1");
        expect(newBoard.columns[0].cards[0].title).toBe("Updated Task 1");
        expect(newBoard.columns[0].cards[0].details).toBe("Updated Desc 1");
    });

    it('deleteCard removes the card', () => {
        const newBoard = deleteCard(mockBoard, "c-1");
        expect(newBoard.columns[0].cards.length).toBe(1);
        expect(newBoard.columns[0].cards[0].id).toBe("c-2");
    });

    it('moveCard moves a card to another column at the precise index', () => {
        // move c-1 from col-1 to col-2
        const newBoard = moveCard(mockBoard, "c-1", "col-1", "col-2", 0);
        expect(newBoard.columns[0].cards.length).toBe(1);
        expect(newBoard.columns[0].cards[0].id).toBe("c-2");

        expect(newBoard.columns[1].cards.length).toBe(1);
        expect(newBoard.columns[1].cards[0].id).toBe("c-1");
    });

    it('moveCard reorders within the same column', () => {
        // move c-2 to index 0
        const newBoard = moveCard(mockBoard, "c-2", "col-1", "col-1", 0);
        expect(newBoard.columns[0].cards.length).toBe(2);
        expect(newBoard.columns[0].cards[0].id).toBe("c-2");
        expect(newBoard.columns[0].cards[1].id).toBe("c-1");
    });
});
