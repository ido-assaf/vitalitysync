import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { login, saveStoredUser } from "../services/api";
import Login from "./Login";

jest.mock("../services/api", () => ({
  login: jest.fn(),
  saveStoredUser: jest.fn()
}));

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard route</div>} />
        <Route path="/admin" element={<div>Admin route</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function submitLoginForm() {
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("validates required username and password", () => {
  renderLogin();

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "" } });
  submitLoginForm();

  expect(screen.getByText("Username is required.")).toBeInTheDocument();
  expect(screen.getByText("Password is required.")).toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();
});

test("validates minimum password length", () => {
  renderLogin();

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "student.admin" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "12345" } });
  submitLoginForm();

  expect(screen.getByText("Password must contain at least 6 characters.")).toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();
});

test("displays the backend authentication error for wrong credentials", async () => {
  login.mockRejectedValueOnce(new Error("Invalid username or password."));
  renderLogin();

  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "unknown.user" }
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "123456" } });
  submitLoginForm();

  expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
});

test("saves the current user and redirects after successful login", async () => {
  const user = {
    userId: 3,
    firstName: "Demo",
    lastName: "Trainee",
    email: "demo.trainee@example.com",
    username: "demo.trainee",
    userRole: "trainee"
  };

  login.mockResolvedValueOnce(user);
  renderLogin();
  submitLoginForm();

  await waitFor(() => expect(saveStoredUser).toHaveBeenCalledWith(user));
  expect(await screen.findByText("Dashboard route")).toBeInTheDocument();
});

test("redirects an admin directly to the Admin Dashboard after login", async () => {
  const user = {
    userId: 1,
    firstName: "Student",
    lastName: "Admin",
    email: "student@example.com",
    username: "student.admin",
    userRole: "admin"
  };

  login.mockResolvedValueOnce(user);
  renderLogin();
  submitLoginForm();

  await waitFor(() => expect(saveStoredUser).toHaveBeenCalledWith(user));
  expect(await screen.findByText("Admin route")).toBeInTheDocument();
});
