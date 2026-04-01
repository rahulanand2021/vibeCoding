import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ChatSidebar, { ChatMessage } from "@/components/ChatSidebar";

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockMessages: ChatMessage[] = [
  {
    id: "msg-1",
    text: "Hello AI",
    isUser: true,
    timestamp: new Date("2024-01-01T10:00:00"),
  },
  {
    id: "msg-2",
    text: "Hello! How can I help you with your Kanban board?",
    isUser: false,
    timestamp: new Date("2024-01-01T10:00:05"),
    boardUpdate: {
      operations: [
        {
          type: "add_card",
          columnId: "todo",
          title: "Test Card",
          details: "Test details",
        },
      ],
    },
  },
];

describe("ChatSidebar", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    messages: [] as ChatMessage[],
    onSendMessage: vi.fn(),
  };

  it("does not render when closed", () => {
    render(<ChatSidebar {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("AI Assistant")).not.toBeInTheDocument();
  });

  it("renders welcome message when no messages", () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByText("👋 Hi! I'm your AI assistant. I can help you manage your Kanban board.")).toBeInTheDocument();
  });

  it("renders messages correctly", () => {
    render(<ChatSidebar {...defaultProps} messages={mockMessages} />);

    expect(screen.getByText("Hello AI")).toBeInTheDocument();
    expect(screen.getByText("Hello! How can I help you with your Kanban board?")).toBeInTheDocument();
    expect(screen.getByText("📋 Board updated:")).toBeInTheDocument();
    expect(screen.getByText('Added "Test Card" to todo')).toBeInTheDocument();
  });

  it("shows loading state when typing", async () => {
    const user = userEvent.setup();
    const mockSendMessage = vi.fn(() => new Promise(() => {})); // Never resolves

    render(<ChatSidebar {...defaultProps} onSendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText("Ask me to manage your board...");
    const sendButton = screen.getByRole("button", { name: "Send" });

    await user.type(input, "Add a card");
    await user.click(sendButton);

    // Should show loading state
    expect(screen.getByRole("button", { name: "..." })).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument(); // Component still renders
  });

  it("sends message on form submit", async () => {
    const user = userEvent.setup();
    const mockSendMessage = vi.fn();

    render(<ChatSidebar {...defaultProps} onSendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText("Ask me to manage your board...");
    const sendButton = screen.getByRole("button", { name: "Send" });

    await user.type(input, "Add a new card");
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith("Add a new card");
  });

  it("prevents sending empty messages", async () => {
    const user = userEvent.setup();
    const mockSendMessage = vi.fn();

    render(<ChatSidebar {...defaultProps} onSendMessage={mockSendMessage} />);

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Ask me to manage your board..."), "   ");
    expect(sendButton).toBeDisabled();
  });

  it("closes sidebar when close button clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<ChatSidebar {...defaultProps} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: "×" });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("closes sidebar when overlay clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<ChatSidebar {...defaultProps} onClose={mockOnClose} />);

    const overlay = screen.getByTestId("chat-overlay");
    await user.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("formats timestamps correctly", () => {
    render(<ChatSidebar {...defaultProps} messages={mockMessages} />);

    // Should show time in format like "10:00 a.m." for both messages
    const timestamps = screen.getAllByText("10:00 a.m.");
    expect(timestamps).toHaveLength(2);
  });
});