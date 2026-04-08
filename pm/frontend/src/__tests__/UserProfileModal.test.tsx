import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import UserProfileModal from "@/components/modals/UserProfileModal";

vi.mock("@/lib/api", () => ({
  changePassword: vi.fn(),
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

import { changePassword, ApiError } from "@/lib/api";
const mockChangePassword = vi.mocked(changePassword);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserProfileModal", () => {
  const defaultProps = {
    username: "alice",
    onClose: vi.fn(),
  };

  it("renders username", () => {
    render(<UserProfileModal {...defaultProps} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<UserProfileModal {...defaultProps} />);

    await user.type(screen.getByLabelText("Current password"), "oldpass");
    await user.type(screen.getByLabelText("New password"), "newpass1");
    await user.type(screen.getByLabelText("Confirm new password"), "newpass2");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows error when new password is too short", async () => {
    const user = userEvent.setup();
    render(<UserProfileModal {...defaultProps} />);

    await user.type(screen.getByLabelText("Current password"), "oldpass");
    await user.type(screen.getByLabelText("New password"), "abc");
    await user.type(screen.getByLabelText("Confirm new password"), "abc");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("calls changePassword with correct args on success", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockResolvedValue(undefined);
    render(<UserProfileModal {...defaultProps} />);

    await user.type(screen.getByLabelText("Current password"), "oldpass");
    await user.type(screen.getByLabelText("New password"), "newpassword");
    await user.type(screen.getByLabelText("Confirm new password"), "newpassword");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith("oldpass", "newpassword");
      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  it("shows error on wrong current password (401)", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValue(new ApiError(401, "Unauthorized"));
    render(<UserProfileModal {...defaultProps} />);

    await user.type(screen.getByLabelText("Current password"), "wrongpass");
    await user.type(screen.getByLabelText("New password"), "newpassword");
    await user.type(screen.getByLabelText("Confirm new password"), "newpassword");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
  });

  it("closes on cancel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<UserProfileModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
