import { describe, it, expect } from 'vitest';
import { renameColumn, addCard, editCard, deleteCard, moveCard, Board } from '@/lib/boardState';

const sampleBoard: Board = {
  id: 'board1',
  title: 'Test Board',
  columns: [
    {
      id: 'col1',
      title: 'Column 1',
      cards: [
        { id: 'card1', title: 'Card 1', details: 'Details 1' },
        { id: 'card2', title: 'Card 2', details: 'Details 2' },
      ],
    },
    {
      id: 'col2',
      title: 'Column 2',
      cards: [],
    },
  ],
};

describe('Board State Helpers', () => {
  it('renames a column', () => {
    const result = renameColumn(sampleBoard, 'col1', 'New Title');
    expect(result.columns[0].title).toBe('New Title');
    expect(result.columns[1].title).toBe('Column 2');
  });

  it('throws error for empty column title', () => {
    expect(() => renameColumn(sampleBoard, 'col1', '')).toThrow('Column title cannot be empty');
    expect(() => renameColumn(sampleBoard, 'col1', '   ')).toThrow('Column title cannot be empty');
  });

  it('adds a card to a column', () => {
    const result = addCard(sampleBoard, 'col2', { title: 'New Card', details: 'New Details' });
    expect(result.columns[1].cards).toHaveLength(1);
    expect(result.columns[1].cards[0].title).toBe('New Card');
    expect(result.columns[1].cards[0].details).toBe('New Details');
  });

  it('throws error for empty card title or details', () => {
    expect(() => addCard(sampleBoard, 'col2', { title: '', details: 'Details' })).toThrow('Card title and details cannot be empty');
    expect(() => addCard(sampleBoard, 'col2', { title: 'Title', details: '' })).toThrow('Card title and details cannot be empty');
  });

  it('edits a card', () => {
    const result = editCard(sampleBoard, 'card1', { title: 'Updated Title' });
    expect(result.columns[0].cards[0].title).toBe('Updated Title');
    expect(result.columns[0].cards[0].details).toBe('Details 1');
  });

  it('throws error for empty updated title or details', () => {
    expect(() => editCard(sampleBoard, 'card1', { title: '' })).toThrow('Card title cannot be empty');
    expect(() => editCard(sampleBoard, 'card1', { details: '' })).toThrow('Card details cannot be empty');
  });

  it('deletes a card', () => {
    const result = deleteCard(sampleBoard, 'card1');
    expect(result.columns[0].cards).toHaveLength(1);
    expect(result.columns[0].cards[0].id).toBe('card2');
  });

  it('moves a card within the same column', () => {
    const result = moveCard(sampleBoard, 'card2', 'col1', 'col1', 0);
    expect(result.columns[0].cards[0].id).toBe('card2');
    expect(result.columns[0].cards[1].id).toBe('card1');
  });

  it('moves a card to another column', () => {
    const result = moveCard(sampleBoard, 'card1', 'col1', 'col2', 0);
    expect(result.columns[0].cards).toHaveLength(1);
    expect(result.columns[0].cards[0].id).toBe('card2');
    expect(result.columns[1].cards).toHaveLength(1);
    expect(result.columns[1].cards[0].id).toBe('card1');
  });
});