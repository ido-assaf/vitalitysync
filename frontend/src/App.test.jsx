import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

test("opens the Login screen at the root even when an admin user was previously stored", async () => {
  localStorage.setItem(
    "vitalitysyncUser",
    JSON.stringify({
      userId: 1,
      username: "student.admin",
      userRole: "admin"
    })
  );

  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
});
