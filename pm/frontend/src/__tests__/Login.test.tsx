import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "@/components/Login";

// Mock the API module
vi.mock("@/lib/api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
    }
    get isUnauthorized() { return this.status === 401; }
  },
}));

import { login, register, ApiError } from "@/lib/api";
const mockLogin = vi.mocked(login);
const mockRegister = vi.mocked(register);

beforeEach(() => {
  vi.clearAllMocks();
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
});

describe("Login component — login mode", () => {
  it("renders sign in form by default", () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kanban Flow");
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls login API with entered credentials", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    mockLogin.mockResolvedValue({ token: "tok123", username: "alice", user_id: 1 });

    render(<Login onLogin={onLogin} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pass123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith("alice", "pass123");
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("tok123", "alice"));
  });

  it("shows error on invalid credentials", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new ApiError(401, "Invalid credentials"));

    render(<Login onLogin={vi.fn()} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
    );
  });

  it("shows connection error on network failure", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error("Network error"));

    render(<Login onLogin={vi.fn()} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/cannot connect to server/i)).toBeInTheDocument()
    );
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    mockLogin.mockReturnValue(new Promise(() => {})); // never resolves

    render(<Login onLogin={vi.fn()} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pass123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /please wait/i })).toBeDisabled();
  });
});

describe("Login component — register mode", () => {
  it("switches to register mode", async () => {
    const user = userEvent.setup();
    render(<Login onLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("calls register API with credentials", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    mockRegister.mockResolvedValue({ token: "regTok", username: "bob", user_id: 2 });

    render(<Login onLogin={onLogin} />);
    await user.click(screen.getByRole("button", { name: /register/i }));

    await user.type(screen.getByLabelText("Username"), "bob");
    await user.type(screen.getByLabelText("Password"), "securepass");
    await user.type(screen.getByLabelText(/confirm password/i), "securepass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockRegister).toHaveBeenCalledWith("bob", "securepass", undefined);
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("regTok", "bob"));
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<Login onLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /register/i }));
    await user.type(screen.getByLabelText("Username"), "charlie");
    await user.type(screen.getByLabelText("Password"), "pass1");
    await user.type(screen.getByLabelText(/confirm password/i), "pass2");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows error on duplicate username", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue(new ApiError(409, "Username 'alice' is already taken"));

    render(<Login onLogin={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /register/i }));
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pass123");
    await user.type(screen.getByLabelText(/confirm password/i), "pass123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/username is already taken/i)).toBeInTheDocument()
    );
  });

  it("switches back to login mode", async () => {
    const user = userEvent.setup();
    render(<Login onLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /register/i }));
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText(/sign in to your workspace/i)).toBeInTheDocument();
  });

  it("clears error when switching modes", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new ApiError(401, "Invalid credentials"));

    render(<Login onLogin={vi.fn()} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /register/i }));
    expect(screen.queryByText(/invalid username or password/i)).not.toBeInTheDocument();
  });
});
