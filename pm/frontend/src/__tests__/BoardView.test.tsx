import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardView from "@/components/BoardView";
import { seededBoard } from "@/lib/board";

describe("BoardView", () => {
  it("renders seeded board with five columns", () => {
    render(<BoardView initialBoard={seededBoard} />);

    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renames a column", async () => {
    const user = userEvent.setup();
    render(<BoardView initialBoard={seededBoard} />);

    await user.click(screen.getByRole("button", { name: "Backlog" }));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ideas{enter}");

    expect(screen.getByText("Ideas")).toBeInTheDocument();
  });

  it("adds and deletes a card with confirmation", async () => {
    const user = userEvent.setup();
    render(<BoardView initialBoard={seededBoard} />);

    const addButtons = screen.getAllByRole("button", { name: "Add card" });
    await user.click(addButtons[0]);

    await user.type(screen.getByLabelText("Card title"), "New task");
    await user.type(screen.getByLabelText("Card details"), "Details for new task");

    const modal = screen.getByRole("dialog");
    await user.click(within(modal).getByRole("button", { name: "Add card" }));

    const newCard = screen.getByText("New task").closest("article");
    expect(newCard).toBeInTheDocument();

    if (!newCard) {
      return;
    }

    await user.click(within(newCard).getByRole("button", { name: "Delete card" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.queryByText("New task")).not.toBeInTheDocument();
  });

  it("edits a card", async () => {
    const user = userEvent.setup();
    render(<BoardView initialBoard={seededBoard} />);

    const card = screen.getByText("Design review").closest("article");
    expect(card).toBeInTheDocument();

    if (!card) {
      return;
    }

    await user.click(within(card).getByRole("button", { name: "Edit card" }));
    const titleInput = screen.getByLabelText("Card title");
    await user.clear(titleInput);
    await user.type(titleInput, "Design critique");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Design critique")).toBeInTheDocument();
  });
});
