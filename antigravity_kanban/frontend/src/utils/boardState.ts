import { Board, Card } from '../types/kanban';

export function renameColumn(board: Board, columnId: string, newTitle: string): Board {
    if (!newTitle.trim()) return board;
    return {
        ...board,
        columns: board.columns.map(col =>
            col.id === columnId ? { ...col, title: newTitle.trim() } : col
        )
    };
}

export function addCard(board: Board, columnId: string, title: string, details: string): Board {
    if (!title.trim() || !details.trim()) return board;
    const newCard: Card = {
        id: crypto.randomUUID(),
        title: title.trim(),
        details: details.trim()
    };

    return {
        ...board,
        columns: board.columns.map(col =>
            col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
        )
    };
}

export function editCard(board: Board, cardId: string, newTitle: string, newDetails: string): Board {
    if (!newTitle.trim() || !newDetails.trim()) return board;
    return {
        ...board,
        columns: board.columns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
                card.id === cardId
                    ? { ...card, title: newTitle.trim(), details: newDetails.trim() }
                    : card
            )
        }))
    };
}

export function deleteCard(board: Board, cardId: string): Board {
    return {
        ...board,
        columns: board.columns.map(col => ({
            ...col,
            cards: col.cards.filter(card => card.id !== cardId)
        }))
    };
}

export function moveCard(board: Board, cardId: string, sourceColId: string, targetColId: string, newIndex: number): Board {
    const sourceCol = board.columns.find(c => c.id === sourceColId);
    if (!sourceCol) return board;

    const cardToMove = sourceCol.cards.find(c => c.id === cardId);
    if (!cardToMove) return board;

    const newColumns = board.columns.map(col => {
        if (col.id === sourceColId && col.id === targetColId) {
            const newCards = [...col.cards];
            const oldIndex = newCards.findIndex(c => c.id === cardId);
            newCards.splice(oldIndex, 1);
            newCards.splice(newIndex, 0, cardToMove!);
            return { ...col, cards: newCards };
        }

        if (col.id === sourceColId) {
            return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }

        if (col.id === targetColId) {
            const newCards = [...col.cards];
            newCards.splice(newIndex, 0, cardToMove!);
            return { ...col, cards: newCards };
        }

        return col;
    });

    return { ...board, columns: newColumns };
}
