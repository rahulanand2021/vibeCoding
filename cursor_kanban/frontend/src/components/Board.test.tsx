import { fireEvent, render, screen } from "@testing-library/react";
import { Board } from "@/components/Board";

describe("Board", () => {
  it("renders 5 columns from dummy data", () => {
    render(<Board />);
    const columnTitles = screen.getAllByRole("heading", { level: 2 });
    expect(columnTitles).toHaveLength(5);
  });

  it("renames a column", () => {
    render(<Board />);
    const backlogColumn = screen.getByTestId("column-column-backlog");
    const header = backlogColumn.querySelector(".column-header");
    expect(header).not.toBeNull();
    fireEvent.mouseEnter(header!);
    const input = screen.getByLabelText("Column title for Backlog");
    fireEvent.change(input, { target: { value: "Ideas" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]!);
    expect(screen.getByDisplayValue("Ideas")).toBeInTheDocument();
  });

  it("adds and deletes a card", () => {
    render(<Board />);
    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]!);
    fireEvent.change(screen.getAllByLabelText("Card title")[0]!, {
      target: { value: "Test card" },
    });
    fireEvent.change(screen.getAllByLabelText("Card details")[0]!, {
      target: { value: "Test details" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Add card" })[0]!);

    expect(screen.getByText("Test card")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Test card" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Test card")).not.toBeInTheDocument();
  });

  it("edits a card", () => {
    render(<Board />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Draft launch narrative" }));
    fireEvent.change(screen.getByLabelText("Edit card title"), {
      target: { value: "Refined launch narrative" },
    });
    fireEvent.change(screen.getByLabelText("Edit card details"), {
      target: { value: "Sync with design and product marketing." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("heading", { name: "Refined launch narrative" })).toBeInTheDocument();
    expect(screen.getByText("Sync with design and product marketing.")).toBeInTheDocument();
  });
});
