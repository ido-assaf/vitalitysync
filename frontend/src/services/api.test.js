const mockApiClient = jest.fn();

jest.mock("axios", () => ({
  create: () => mockApiClient
}));

beforeEach(() => {
  mockApiClient.mockReset();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
  document.documentElement.style.colorScheme = "";
});

test("login surfaces backend authentication errors before network fallbacks", async () => {
  const { login } = require("./api");

  mockApiClient.mockRejectedValueOnce({
    response: {
      data: {
        error: {
          message: "Invalid email or password."
        }
      }
    }
  });

  await expect(login("hbsus1949@gmail.com", "123456")).rejects.toThrow(
    "Invalid email or password."
  );
});

test("login only reports Network Error when no response is available", async () => {
  const { login } = require("./api");

  mockApiClient.mockRejectedValueOnce({
    request: {}
  });

  await expect(login("student@example.com", "123456")).rejects.toThrow("Network Error");
});

test("photo meal estimation sends multipart form data to the existing endpoint", async () => {
  const { estimateNutritionMeal } = require("./api");
  const image = new File(["meal"], "meal.jpg", { type: "image/jpeg" });
  mockApiClient.mockResolvedValueOnce({
    data: {
      success: true,
      data: { estimateId: "estimate-1" },
      error: null
    }
  });

  await estimateNutritionMeal(
    {
      description: "",
      portionSize: "full_plate",
      customPortion: null,
      cookingStyle: "unknown"
    },
    image
  );

  expect(mockApiClient).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "POST",
      url: "/nutrition/estimate-meal",
      data: expect.any(FormData)
    })
  );
  const request = mockApiClient.mock.calls[0][0];
  expect(request.data.get("image")).toBe(image);
  expect(request.data.get("portionSize")).toBe("full_plate");
});

test("weekly fitness review uses the read-only preview endpoint", async () => {
  const { getWeeklyFitnessReview, saveStoredUser } = require("./api");

  saveStoredUser({ userId: 7, userRole: "trainee" });
  mockApiClient.mockResolvedValueOnce({
    data: {
      success: true,
      data: { reviewDecision: "collect_more_data" },
      error: null
    }
  });

  await getWeeklyFitnessReview(7);

  expect(mockApiClient).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "POST",
      url: "/workout-plans/weekly-review",
      data: { userId: 7 },
      headers: expect.objectContaining({
        "x-user-id": 7,
        "x-user-role": "trainee"
      })
    })
  );
});

test("weekly fitness check-in posts answers to the check-in endpoint", async () => {
  const { sendWeeklyFitnessCheckIn, saveStoredUser } = require("./api");

  saveStoredUser({ userId: 7, userRole: "trainee" });
  mockApiClient.mockResolvedValueOnce({
    data: {
      success: true,
      data: { received: true },
      error: null
    }
  });

  const answers = [{ question: "What happened?", answer: "No time" }];
  await sendWeeklyFitnessCheckIn(7, answers);

  expect(mockApiClient).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "POST",
      url: "/workout-plans/weekly-review/check-in",
      data: { userId: 7, answers },
      headers: expect.objectContaining({
        "x-user-id": 7,
        "x-user-role": "trainee"
      })
    })
  );
});

test("weekly fitness check-in posts note and selected tags when payload object is used", async () => {
  const { sendWeeklyFitnessCheckIn, saveStoredUser } = require("./api");

  saveStoredUser({ userId: 7, userRole: "trainee" });
  mockApiClient.mockResolvedValueOnce({
    data: {
      success: true,
      data: { received: true },
      error: null
    }
  });

  await sendWeeklyFitnessCheckIn(7, {
    answers: [],
    generalNote: "The machine was occupied",
    selectedTags: ["too_hard"]
  });

  expect(mockApiClient).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "POST",
      url: "/workout-plans/weekly-review/check-in",
      data: {
        userId: 7,
        answers: [],
        generalNote: "The machine was occupied",
        selectedTags: ["too_hard"]
      }
    })
  );
});

test("clears malformed or unsupported stored users", () => {
  const { getStoredUser } = require("./api");

  localStorage.setItem(
    "vitalitysyncUser",
    JSON.stringify({ userId: 1, userRole: "legacy-user" })
  );

  expect(getStoredUser()).toBeNull();
  expect(localStorage.getItem("vitalitysyncUser")).toBeNull();
});

test("saveStoredUser applies the saved theme immediately", () => {
  const { saveStoredUser } = require("./api");

  saveStoredUser({ userId: 1, userRole: "trainee", theme: "dark" });

  expect(document.documentElement.dataset.themePreference).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.style.colorScheme).toBe("dark");
});

test("applyStoredTheme resolves a saved light preference", () => {
  const { applyStoredTheme } = require("./api");

  localStorage.setItem(
    "vitalitysyncUser",
    JSON.stringify({ userId: 1, userRole: "trainee", theme: "light" })
  );

  applyStoredTheme();

  expect(document.documentElement.dataset.themePreference).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
});
