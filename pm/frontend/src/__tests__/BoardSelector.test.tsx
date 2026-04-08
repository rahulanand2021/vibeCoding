import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import BoardSelector from "@/components/BoardSelector";
import type { BoardSummary } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  createBoard: vi.fn(),
  renameBoard: vi.fn(),
  deleteBoard: vi.fn(),
  setDefaultBoard: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
    }
  },
}));

import { createBoard, renameBoard, deleteBoard, setDefaultBoard } from "@/lib/api";
const mockCreate = vi.mocked(createBoard);
const mockRename = vi.mocked(renameBoard);
const mockDelete = vi.mocked(deleteBoard);
const mockSetDefault = vi.mocked(setDefaultBoard);

const mockBoards: BoardSummary[] = [
  { id: 1, name: "My Board", is_default: 1, created_at: "2024-01-01T00:00:00", updated_at: "2024-01-01T00:00:00" },
  { id: 2, name: "Sprint 1", is_default: 0, created_at: "2024-01-02T00:00:00", updated_at: "2024-01-02T00:00:00" },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Suppress window.confirm
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("BoardSelector", () => {
  const defaultProps = {
    boards: mockBoards,
    activeBoardId: 1,
    onSelect: vi.fn(),
    onBoardsChange: vi.fn(),
  };

  it("renders all boards", () => {
    render(<BoardSelector {...defaultProps} />);
    expect(screen.getByText("My Board")).toBeInTheDocument();
    expect(screen.getByText("Sprint 1")).toBeInTheDocument();
  });

  it("marks active board visually", () => {
    render(<BoardSelector {...defaultProps} />);
    const listItems = screen.getAllByRole("option");
    expect(listItems[0]).toHaveAttribute("aria-selected", "true");
    expect(listItems[1]).toHaveAttribute("aria-selected", "false");
  });

  it("shows 'default' badge on default board", () => {
    render(<BoardSelector {...defaultProps} />);
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("calls onSelect when board is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<BoardSelector {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByText("Sprint 1"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("opens create form when New button clicked", async () => {
    const user = userEvent.setup();
    render(<BoardSelector {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /create new board/i }));
    expect(screen.getByPlaceholderText(/board name/i)).toBeInTheDocument();
  });

  it("creates a new board", async () => {
    const user = userEvent.setup();
    const onBoardsChange = vi.fn();
    const onSelect = vi.fn();
    mockCreate.mockResolvedValue({ board_id: 3, name: "Sprint 2" });

    render(<BoardSelector {...defaultProps} onBoardsChange={onBoardsChange} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /create new board/i }));
    await user.type(screen.getByPlaceholderText(/board name/i), "Sprint 2");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("Sprint 2");
      expect(onBoardsChange).toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(3);
    });
  });

  it("cancels create form", async () => {
    const user = userEvent.setup();
    render(<BoardSelector {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /create new board/i }));
    expect(screen.getByPlaceholderText(/board name/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByPlaceholderText(/board name/i)).not.toBeInTheDocument();
  });

  it("renames a board", async () => {
    const user = userEvent.setup();
    const onBoardsChange = vi.fn();
    mockRename.mockResolvedValue(undefined);

    render(<BoardSelector {...defaultProps} onBoardsChange={onBoardsChange} />);

    const editButtons = screen.getAllByTitle("Rename board");
    await user.click(editButtons[0]); // click rename on "My Board"

    const input = screen.getByDisplayValue("My Board");
    await user.clear(input);
    await user.type(input, "Renamed Board");
    // Submit via Enter to avoid onBlur canceling before button click registers
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockRename).toHaveBeenCalledWith(1, "Renamed Board");
      expect(onBoardsChange).toHaveBeenCalled();
    });
  });

  it("deletes a board", async () => {
    const user = userEvent.setup();
    const onBoardsChange = vi.fn();
    mockDelete.mockResolvedValue(undefined);

    render(<BoardSelector {...defaultProps} onBoardsChange={onBoardsChange} />);

    const deleteButtons = screen.getAllByTitle("Delete board");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(onBoardsChange).toHaveBeenCalled();
    });
  });

  it("does not show delete button when only one board", () => {
    render(<BoardSelector {...defaultProps} boards={[mockBoards[0]]} />);
    expect(screen.queryByTitle("Delete board")).not.toBeInTheDocument();
  });

  it("sets default board", async () => {
    const user = userEvent.setup();
    const onBoardsChange = vi.fn();
    mockSetDefault.mockResolvedValue(undefined);

    render(<BoardSelector {...defaultProps} onBoardsChange={onBoardsChange} />);

    const setDefaultButtons = screen.getAllByTitle("Set as default");
    await user.click(setDefaultButtons[0]);

    await waitFor(() => {
      expect(mockSetDefault).toHaveBeenCalled();
      expect(onBoardsChange).toHaveBeenCalled();
    });
  });

  it("does not show set-default button for default board", () => {
    render(<BoardSelector {...defaultProps} />);
    // The default board (id=1) should not have set-default button
    // Sprint 1 (id=2) should have it
    expect(screen.getByTitle("Set as default")).toBeInTheDocument();
  });
});
