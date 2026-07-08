import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Training from "./Training";
import {
  getActiveWorkoutSession,
  getStoredUser,
  getWeeklyFitnessReview,
  getWorkoutPlans,
  getWorkoutSessions,
  sendWeeklyFitnessCheckIn,
  suggestWorkoutPlan
} from "../services/api";
import { createWorkoutSocket } from "../services/socket";

jest.mock("../services/api", () => ({
  getActiveWorkoutSession: jest.fn(),
  getStoredUser: jest.fn(),
  getWeeklyFitnessReview: jest.fn(),
  getWorkoutPlans: jest.fn(),
  getWorkoutSessions: jest.fn(),
  sendWeeklyFitnessCheckIn: jest.fn(),
  suggestWorkoutPlan: jest.fn()
}));

jest.mock("../services/socket", () => ({
  createWorkoutSocket: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  }))
}));

function renderTraining() {
  return render(
    <MemoryRouter>
      <Training />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  createWorkoutSocket.mockReturnValue({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  });
  getStoredUser.mockReturnValue({ userId: 7, userRole: "trainee" });
  getWorkoutPlans.mockResolvedValue([]);
  getActiveWorkoutSession.mockResolvedValue(null);
  getWorkoutSessions.mockResolvedValue([]);
  getWeeklyFitnessReview.mockResolvedValue({
    reviewDecision: "collect_more_data",
    headline: "Keep logging before changing the plan.",
    recommendedNextStep: "Keep the plan stable and collect clearer training logs this week.",
    confidence: "low",
    keyFindings: [],
    safetyNotes: [],
    reasonCodes: [],
    reviewActions: [],
    coachNote: "Keep logging this week so the coach can read the trend.",
    coachQuestions: [
      "Can you log sets, reps, load, and how the session felt this week?",
      "What made sessions hard to complete: time, fatigue, difficulty, or motivation?",
      "How were sleep, soreness, and energy across the week?",
      "Which movement caused pain, and did it change during or after training?"
    ]
  });
  sendWeeklyFitnessCheckIn.mockResolvedValue({
    received: true,
    message: "Coach will use this for next week.",
    parsedSignals: ["time_constraint", "too_hard"],
    preview: {
      reviewDecision: "minor_adjustments",
      headline: "Small plan adjustments are worth considering.",
      recommendedNextStep: "Simplify the week and avoid increasing volume.",
      confidence: "medium",
      keyFindings: ["Time constraints support simplifying the week before adding work."],
      safetyNotes: [],
      reasonCodes: ["time_constraint", "low_adherence"],
      reviewActions: [
        {
          type: "simplify_session",
          label: "Simplify this week",
          reason: "Adherence or time signals suggest reducing optional work.",
          status: "preview_only",
          priority: 3
        }
      ],
      coachNote: "These are review suggestions, not automatic plan changes.",
      professionalRecommendations: [{ title: "DO NOT SHOW EVIDENCE" }],
      knowledgeItems: [{ title: "DO NOT SHOW KNOWLEDGE" }],
      sourceItemIds: ["DO_NOT_SHOW_SOURCE"],
      patternHash: "DO_NOT_SHOW_PATTERN_HASH",
      coachQuestions: [
        "What made sessions hard to complete: time, fatigue, difficulty, or motivation?"
      ]
    }
  });
  suggestWorkoutPlan.mockResolvedValue({});
});

test("weekly check-in renders guided inputs and sends answers, note, and selected chips", async () => {
  renderTraining();

  expect(await screen.findByText("Coach check-in for next week")).toBeInTheDocument();
  expect(screen.getByText("Keep logging this week so the coach can read the trend.")).toBeInTheDocument();
  expect(screen.queryByText("Coach suggestions")).not.toBeInTheDocument();
  expect(screen.getAllByLabelText(/Answer coach question/i)).toHaveLength(3);
  expect(screen.getByLabelText("General coach note")).toBeInTheDocument();
  expect(
    screen.queryByText("Which movement caused pain, and did it change during or after training?")
  ).not.toBeInTheDocument();

  const sendButton = screen.getByRole("button", { name: "Send check-in" });
  expect(sendButton).toBeDisabled();

  fireEvent.change(screen.getByLabelText("Answer coach question 2"), {
    target: { value: "No time because work was busy" }
  });
  fireEvent.change(screen.getByLabelText("General coach note"), {
    target: { value: "The machine was occupied" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Too hard" }));
  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(sendWeeklyFitnessCheckIn).toHaveBeenCalledWith(7, {
      answers: [
        {
          question: "What made sessions hard to complete: time, fatigue, difficulty, or motivation?",
          answer: "No time because work was busy"
        }
      ],
      generalNote: "The machine was occupied",
      selectedTags: ["too_hard"]
    });
  });
  expect(await screen.findByText("Coach will use this for next week.")).toBeInTheDocument();
  expect(await screen.findByText("Small plan adjustments are worth considering.")).toBeInTheDocument();
  expect(screen.getByText("Simplify the week and avoid increasing volume.")).toBeInTheDocument();
  expect(screen.getByText("Next week focus")).toBeInTheDocument();
  expect(screen.getByText("Signals from your check-in")).toBeInTheDocument();
  expect(screen.getByText("Time")).toBeInTheDocument();
  expect(screen.getAllByText("Too hard").length).toBeGreaterThan(0);
  expect(screen.getByText("Coach suggestions")).toBeInTheDocument();
  expect(screen.getByText("Simplify this week")).toBeInTheDocument();
  expect(screen.getByText("Adherence or time signals suggest reducing optional work.")).toBeInTheDocument();
  expect(screen.getAllByText(/preview only/i).length).toBeGreaterThan(0);
  expect(screen.queryByText("DO NOT SHOW EVIDENCE")).not.toBeInTheDocument();
  expect(screen.queryByText("DO NOT SHOW KNOWLEDGE")).not.toBeInTheDocument();
  expect(screen.queryByText("DO_NOT_SHOW_SOURCE")).not.toBeInTheDocument();
  expect(screen.queryByText("DO_NOT_SHOW_PATTERN_HASH")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
});

test("weekly check-in shows guidance when backend ignores irrelevant text", async () => {
  sendWeeklyFitnessCheckIn.mockResolvedValueOnce({
    received: true,
    message: "I did not find training details to use. Add a note about load, pain, fatigue, equipment, or what felt different.",
    parsedSignals: [],
    preview: {
      reviewDecision: "collect_more_data",
      headline: "Keep logging before changing the plan.",
      recommendedNextStep: "Keep the plan stable and collect clearer training logs this week.",
      confidence: "low",
      keyFindings: [],
      safetyNotes: [],
      reasonCodes: [],
      reviewActions: [],
      coachNote: "Keep logging this week so the coach can read the trend.",
      coachQuestions: []
    }
  });

  renderTraining();

  expect(await screen.findByText("Coach check-in for next week")).toBeInTheDocument();
  const sendButton = screen.getByRole("button", { name: "Send check-in" });
  expect(sendButton).toBeDisabled();

  fireEvent.change(screen.getByLabelText("General coach note"), {
    target: { value: "you are the king" }
  });
  expect(sendButton).toBeEnabled();
  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(sendWeeklyFitnessCheckIn).toHaveBeenCalledWith(7, {
      answers: [],
      generalNote: "you are the king",
      selectedTags: []
    });
  });
  expect(await screen.findByText(/I did not find training details to use/i)).toBeInTheDocument();
});
