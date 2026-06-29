import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  clearStoredUser,
  getCurrentUser,
  getStoredUser,
  logout,
  saveStoredUser
} from "../services/api";
import Navbar from "./Navbar";

jest.mock("../services/api", () => ({
  clearStoredUser: jest.fn(),
  getCurrentUser: jest.fn(),
  getStoredUser: jest.fn(),
  logout: jest.fn(),
  saveStoredUser: jest.fn()
}));

const traineeUser = {
  userId: 3,
  firstName: "Shaked",
  lastName: "Tamara",
  userRole: "trainee"
};

function renderNavbar() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Navbar />} />
        <Route path="/login" element={<div>Login route</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getStoredUser.mockReturnValue(traineeUser);
  getCurrentUser.mockResolvedValue(traineeUser);
  logout.mockResolvedValue({});
});

test("opens the user menu from the arrow and logs out from the dropdown", async () => {
  renderNavbar();

  await waitFor(() => expect(saveStoredUser).toHaveBeenCalledWith(traineeUser));
  expect(screen.queryByRole("menuitem", { name: "Log out" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));

  expect(logout).not.toHaveBeenCalled();
  const logoutButton = screen.getByRole("menuitem", { name: "Log out" });
  expect(logoutButton).toBeInTheDocument();

  fireEvent.click(logoutButton);

  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(clearStoredUser).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Login route")).toBeInTheDocument();
});
