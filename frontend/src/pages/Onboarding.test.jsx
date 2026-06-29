import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Onboarding from "./Onboarding";
import {
  createTraineeProfile,
  getAISpecialists,
  getStoredUser,
  getTraineeProfile,
  suggestWorkoutPlan,
  updateTraineeProfile
} from "../services/api";

jest.mock("../services/api", () => ({
  createTraineeProfile: jest.fn(),
  getAISpecialists: jest.fn(),
  getStoredUser: jest.fn(),
  getTraineeProfile: jest.fn(),
  suggestWorkoutPlan: jest.fn(),
  updateTraineeProfile: jest.fn()
}));

const specialists = [
  {
    specialistId: 1,
    name: "Strength Training AI Coach",
    domain: "training",
    specialty: "strength training",
    availabilityLabel: "Available Fitness Coach",
    isWorkoutAssignable: true,
    isNutritionAvailable: false
  },
  {
    specialistId: 3,
    name: "VitalitySync Nutritionist",
    domain: "nutrition",
    specialty: "sports nutrition",
    availabilityLabel: "Available Nutritionist",
    isWorkoutAssignable: false,
    isNutritionAvailable: true
  },
  {
    specialistId: 2,
    name: "Running AI Coach",
    domain: "training",
    specialty: "running",
    availabilityLabel: "Coming soon",
    isWorkoutAssignable: false,
    isNutritionAvailable: false
  }
];

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getStoredUser.mockReturnValue({ userId: 3, userRole: "trainee" });
  getTraineeProfile.mockResolvedValue(null);
  getAISpecialists.mockResolvedValue(specialists);
  createTraineeProfile.mockResolvedValue({});
  updateTraineeProfile.mockResolvedValue({});
  suggestWorkoutPlan.mockResolvedValue({});
});

test("shows workout specialists honestly during onboarding without a fake Nutritionist choice", async () => {
  renderOnboarding();

  const fitnessCoach = await screen.findByRole("button", {
    name: /Available Fitness Coach Strength Training AI Coach Selected for workout planning/i
  });
  const runningCoach = screen.getByRole("button", {
    name: /Coming soon Running AI Coach Future development/i
  });

  expect(fitnessCoach).toBeEnabled();
  expect(fitnessCoach).toHaveAttribute("aria-pressed", "true");
  expect(runningCoach).toBeDisabled();
  expect(
    screen.queryByRole("button", {
      name: /Available Nutritionist VitalitySync Nutritionist/i
    })
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Nutritionist AI is ready in Nutrition/NutriScan. No setup choice is needed here.")
  ).toBeInTheDocument();
});

test("saves the selected Fitness Coach id with the trainee profile", async () => {
  renderOnboarding();

  await screen.findByRole("button", {
    name: /Available Fitness Coach Strength Training AI Coach Selected for workout planning/i
  });
  fireEvent.click(screen.getByRole("button", { name: /Save Profile and Refresh Plan/i }));

  await waitFor(() => {
    expect(createTraineeProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3,
        aiSpecialistId: 1,
        specialtyPreferences: expect.objectContaining({
          aiCoachSpecialty: "strength training"
        })
      })
    );
    expect(suggestWorkoutPlan).toHaveBeenCalledWith(3);
  });
});
