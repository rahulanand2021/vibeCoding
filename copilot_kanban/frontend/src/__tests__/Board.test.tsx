import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardProvider } from '@/contexts/BoardContext';
import Board from '@/components/Board';

describe('Board Integration', () => {
  it('renders seeded board with 5 columns', () => {
    render(
      <BoardProvider>
        <Board />
      </BoardProvider>
    );

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('allows renaming a column', async () => {
    const user = userEvent.setup();
    render(
      <BoardProvider>
        <Board />
      </BoardProvider>
    );

    const backlogHeader = screen.getByText('Backlog');
    await user.click(backlogHeader);

    const input = screen.getByDisplayValue('Backlog');
    await user.clear(input);
    await user.type(input, 'New Backlog');
    await user.keyboard('{Enter}');

    expect(screen.getByText('New Backlog')).toBeInTheDocument();
  });

  it('allows adding a card', async () => {
    const user = userEvent.setup();
    render(
      <BoardProvider>
        <Board />
      </BoardProvider>
    );

    const addButtons = screen.getAllByText('+ Add Card');
    const backlogAddButton = addButtons[0];
    await user.click(backlogAddButton);

    const titleInput = screen.getByLabelText('Title');
    const detailsInput = screen.getByLabelText('Details');
    const addButton = screen.getByText('Add Card');

    await user.type(titleInput, 'New Card');
    await user.type(detailsInput, 'New Details');
    await user.click(addButton);

    expect(screen.getByText('New Card')).toBeInTheDocument();
  });

  it('allows editing a card', async () => {
    const user = userEvent.setup();
    render(
      <BoardProvider>
        <Board />
      </BoardProvider>
    );

    const editButton = screen.getAllByText('✏️')[0];
    await user.click(editButton);

    const titleInput = screen.getByDisplayValue('Define project scope');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(screen.getByText('Updated Title')).toBeInTheDocument();
  });

  it('allows deleting a card with confirmation', async () => {
    const user = userEvent.setup();
    render(
      <BoardProvider>
        <Board />
      </BoardProvider>
    );

    const deleteButton = screen.getAllByText('🗑️')[0];
    await user.click(deleteButton);

    const deleteConfirmButton = screen.getByText('Delete');
    await user.click(deleteConfirmButton);

    expect(screen.queryByText('Define project scope')).not.toBeInTheDocument();
  });
});