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

function fillLoginForm(username, password) {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders shorter hero copy and empty login fields", () => {
  renderLogin();

  expect(screen.getByRole("heading", { name: "Train smarter with VitalitySync" })).toBeInTheDocument();
  expect(screen.getByText("AI-guided workouts, nutrition checks, and progress insights in one dashboard.")).toBeInTheDocument();
  expect(screen.getByLabelText("Username")).toHaveValue("");
  expect(screen.getByLabelText("Password")).toHaveValue("");
});

test("validates required username and password", () => {
  renderLogin();

  submitLoginForm();

  expect(screen.getByText("Username is required.")).toBeInTheDocument();
  expect(screen.getByText("Password is required.")).toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();
});

test("validates minimum password length", () => {
  renderLogin();

  fillLoginForm("student.admin", "12345");
  submitLoginForm();

  expect(screen.getByText("Password must contain at least 6 characters.")).toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();
});

test("displays the backend authentication error for wrong credentials", async () => {
  login.mockRejectedValueOnce(new Error("Invalid username or password."));
  renderLogin();

  fillLoginForm("unknown.user", "123456");
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
  fillLoginForm("demo.trainee", "password123");
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
  fillLoginForm("student.admin", "123456");
  submitLoginForm();

  await waitFor(() => expect(saveStoredUser).toHaveBeenCalledWith(user));
  expect(await screen.findByText("Admin route")).toBeInTheDocument();
});
