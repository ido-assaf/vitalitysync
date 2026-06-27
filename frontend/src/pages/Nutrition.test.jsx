import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Nutrition from "./Nutrition";
import {
  addNutritionFavorite,
  addNutritionLogItem,
  deleteNutritionFavorite,
  estimateNutritionMeal,
  evaluateNutritionFood,
  getNutritionFood,
  getNutritionFavorites,
  getNutritionProfile,
  getRecentNutritionFoods,
  getNutritionTargetSuggestion,
  getNutritionToday,
  getStoredUser,
  getTraineeProfile,
  searchNutritionFoods,
  updateNutritionProfile
} from "../services/api";

jest.mock("../services/api", () => ({
  addNutritionFavorite: jest.fn(),
  addNutritionLogItem: jest.fn(),
  deleteNutritionLogItem: jest.fn(),
  deleteNutritionFavorite: jest.fn(),
  estimateNutritionMeal: jest.fn(),
  evaluateNutritionFood: jest.fn(),
  getNutritionFood: jest.fn(),
  getNutritionFavorites: jest.fn(),
  getNutritionProfile: jest.fn(),
  getNutritionTargetSuggestion: jest.fn(),
  getNutritionToday: jest.fn(),
  getRecentNutritionFoods: jest.fn(),
  getStoredUser: jest.fn(),
  getTraineeProfile: jest.fn(),
  searchNutritionFoods: jest.fn(),
  updateNutritionProfile: jest.fn()
}));

function renderNutrition() {
  return render(
    <MemoryRouter>
      <Nutrition />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => "blob:meal-photo");
  URL.revokeObjectURL = jest.fn();
  window.history.replaceState({}, "", "/nutrition");
  getStoredUser.mockReturnValue({ userId: 3, userRole: "trainee" });
  getTraineeProfile.mockResolvedValue({
    userId: 3,
    goal: "maintenance",
    level: "intermediate",
    age: 30,
    weight: 75,
    height: 178,
    biologicalSex: "male",
    trainingDaysPerWeek: 3,
    preferredStyle: "balanced strength and conditioning",
    equipmentAccess: [],
    injuries: [],
    limitations: [],
    likedExercises: [],
    dislikedExercises: [],
    specialtyPreferences: {}
  });
  getNutritionTargetSuggestion.mockResolvedValue({
    canCalculate: true,
    missingFields: [],
    suggestedCalories: 2400,
    suggestedProtein: 120,
    suggestedDietaryApproach: "Protein-forward balanced meals",
    mealGuidance: "Build meals around protein, vegetables, and training carbohydrates.",
    inputs: { nutritionGoal: "maintenance" },
    estimateNote: "Suggested from your profile and three training days per week."
  });
  getRecentNutritionFoods.mockResolvedValue([]);
  getNutritionFavorites.mockResolvedValue([]);
});

test("renders the isolated populated visual QA mode without calling nutrition APIs", async () => {
  window.history.replaceState({}, "", "/nutrition?nutritionDemo=1");

  renderNutrition();

  expect(await screen.findByText("Visual QA demo · no data is saved")).toBeInTheDocument();
  expect(screen.getAllByText("Protein Yogurt").length).toBeGreaterThan(1);
  expect(screen.getByText("Portion Preview")).toBeInTheDocument();
  expect(screen.getByText("Good source of protein for the calories. Moderate sugar for a yogurt—check added sugar if intake is high today.")).toBeInTheDocument();
  expect(screen.getByText("Grilled Chicken Breast")).toBeInTheDocument();
  expect(screen.getByText("63%")).toBeInTheDocument();
  expect(getNutritionProfile).not.toHaveBeenCalled();
  expect(getNutritionToday).not.toHaveBeenCalled();
});

test("renders the exact quick actions and validates an empty meal description locally", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });

  renderNutrition();

  expect(await screen.findByRole("button", { name: "Recent foods" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Favorites" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Estimate meal" }));
  expect(screen.getByRole("dialog", { name: "Estimate custom meal" })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Estimate meal" })[1]);
  expect(await screen.findByText("Describe the meal using at least 3 characters or upload a meal photo.")).toBeInTheDocument();
  expect(estimateNutritionMeal).not.toHaveBeenCalled();
});

test("recent foods and favorites chips display API results without endpoint errors", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  const favorite = {
    barcode: "12345678",
    name: "Favorite Yogurt",
    brand: "Dairy",
    nutritionComplete: true,
    nutritionPer100g: { calories: 80, protein: 10, carbs: 6, fat: 2, sugar: 4 }
  };
  const recent = {
    source: "ai_estimate",
    barcode: null,
    name: "Homemade chicken plate",
    brand: "Homemade",
    originalDescription: "chicken with rice",
    portionDescription: "Full plate",
    nutritionComplete: true
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });
  getNutritionFavorites
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([favorite]);
  getRecentNutritionFoods
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([recent]);

  renderNutrition();
  fireEvent.click(await screen.findByRole("button", { name: "Favorites" }));
  expect(await screen.findByText("Favorite Yogurt")).toBeInTheDocument();
  expect(screen.queryByText("The requested endpoint was not found.")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Recent foods" }));
  expect(await screen.findByText("Homemade chicken plate")).toBeInTheDocument();
  expect(screen.queryByText("The requested endpoint was not found.")).not.toBeInTheDocument();
});

test("uploads and removes a valid meal photo inside the existing estimate modal", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });

  renderNutrition();
  fireEvent.click(await screen.findByRole("button", { name: "Estimate meal" }));
  const photo = new File(["meal"], "meal.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("Upload meal photo"), {
    target: { files: [photo] }
  });

  expect(await screen.findByAltText("Selected meal preview")).toHaveAttribute("src", "blob:meal-photo");
  expect(screen.getByRole("button", { name: "Estimate from photo" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove meal photo" }));
  expect(screen.queryByAltText("Selected meal preview")).not.toBeInTheDocument();
});

test("uses the photo estimate flow and labels the review as visual", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });
  estimateNutritionMeal.mockResolvedValue({
    estimateId: "photo-estimate-1",
    estimateType: "photo",
    estimate: {
      mealName: "Chicken and rice",
      portionDescription: "Full plate",
      calories: 650,
      protein: 42,
      carbs: 70,
      fat: 18,
      sugar: null,
      confidence: "medium",
      explanation: "Approximate visual estimate.",
      assumptions: ["Moderate oil"],
      warnings: ["Hidden ingredients may change values"]
    }
  });

  renderNutrition();
  fireEvent.click(await screen.findByRole("button", { name: "Estimate meal" }));
  const photo = new File(["meal"], "meal.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload meal photo"), {
    target: { files: [photo] }
  });
  fireEvent.click(screen.getByRole("button", { name: "Full plate" }));
  fireEvent.click(screen.getByRole("button", { name: "Estimate from photo" }));

  await waitFor(() =>
    expect(estimateNutritionMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "",
        portionSize: "full_plate"
      }),
      photo
    )
  );
  expect(await screen.findByText("AI visual estimate")).toBeInTheDocument();
  expect(screen.getByText("~650 kcal")).toBeInTheDocument();
});

test("shows a friendly backend validation message for an unusable photo estimate", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });
  const estimateError = new Error(
    "The AI could not estimate calories and macros reliably. Try adding a short description or choosing a clearer portion size."
  );
  estimateError.code = "INVALID_AI_ESTIMATE";
  estimateError.details = {
    reason: 'AI meal estimate required nutrition value "protein" is missing or invalid.'
  };
  estimateNutritionMeal.mockRejectedValue(estimateError);

  renderNutrition();
  fireEvent.click(await screen.findByRole("button", { name: "Estimate meal" }));
  fireEvent.change(screen.getByLabelText("Upload meal photo"), {
    target: { files: [new File(["meal"], "meal.jpg", { type: "image/jpeg" })] }
  });
  fireEvent.click(screen.getByRole("button", { name: "Estimate from photo" }));

  expect(
    await screen.findByText(
      "The AI could not estimate calories and macros reliably. Try adding a short description or choosing a clearer portion size."
    )
  ).toBeInTheDocument();
  expect(screen.queryByText(/required nutrition value/)).not.toBeInTheDocument();
});

test("rejects invalid and oversized meal photos before making an API request", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });

  renderNutrition();
  fireEvent.click(await screen.findByRole("button", { name: "Estimate meal" }));
  fireEvent.change(screen.getByLabelText("Upload meal photo"), {
    target: { files: [new File(["bad"], "meal.txt", { type: "text/plain" })] }
  });
  expect(await screen.findByText("Choose a JPEG, PNG, or WebP meal photo.")).toBeInTheDocument();

  const oversized = new File(
    [new Uint8Array(3 * 1024 * 1024 + 1)],
    "large.jpg",
    { type: "image/jpeg" }
  );
  fireEvent.change(screen.getByLabelText("Upload meal photo"), {
    target: { files: [oversized] }
  });
  expect(await screen.findByText("Meal photos must be 3 MB or smaller.")).toBeInTheDocument();
  expect(estimateNutritionMeal).not.toHaveBeenCalled();
});

test("reviews and adds an estimated meal using the estimate snapshot", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday
    .mockResolvedValueOnce({
      configured: true,
      profile,
      totals: { calories: 300, protein: 20, carbs: 30, fat: 10, sugar: 5 },
      items: [],
      insight: { type: "attention", text: "Protein is low.", action: "Add protein." }
    })
    .mockResolvedValueOnce({
      configured: true,
      profile,
      totals: { calories: 980, protein: 63, carbs: 88, fat: 36, sugar: 10 },
      items: [],
      insight: { type: "positive", text: "Progressing.", action: "Keep going." }
    });
  estimateNutritionMeal.mockResolvedValue({
    estimateId: "estimate-42",
    estimate: {
      mealName: "Stuffed chicken with potatoes",
      portionDescription: "Full plate",
      calories: 680,
      protein: 43,
      carbs: 58,
      fat: 26,
      sugar: 5,
      confidence: "medium",
      explanation: "Approximate homemade meal estimate.",
      assumptions: ["Moderate oil"],
      warnings: ["Values vary"]
    }
  });
  addNutritionLogItem.mockResolvedValue({});

  renderNutrition();
  fireEvent.click(await screen.findByRole("button", { name: "Estimate meal" }));
  fireEvent.change(screen.getByPlaceholderText("Example: stuffed chicken with potatoes, full plate"), {
    target: { value: "stuffed chicken with potatoes" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Full plate" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Estimate meal" })[1]);

  expect(await screen.findByText("~680 kcal")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add to Today" }));

  await waitFor(() =>
    expect(addNutritionLogItem).toHaveBeenCalledWith({
      estimateId: "estimate-42",
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      reviewedNutrition: {
        calories: 680,
        protein: 43,
        carbs: 58,
        fat: 26,
        sugar: 5
      }
    })
  );
});

test("favorites a selected Open Food Facts product through the persistence API", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  const product = {
    barcode: "12345678",
    name: "Test Protein Yogurt",
    brand: "Test Dairy",
    imageUrl: null,
    nutritionComplete: true,
    missingNutritionFields: [],
    servingGrams: 150,
    nutritionPer100g: {
      calories: 80,
      protein: 10,
      carbs: 6,
      fat: 2,
      sugar: 4
    },
    allergens: ["milk"],
    allergensKnown: true,
    ingredients: "Milk",
    sourceUrl: "https://world.openfoodfacts.org/product/12345678"
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: { type: "neutral", text: "No foods logged.", action: "Start logging." }
  });
  searchNutritionFoods.mockResolvedValue([product]);
  getNutritionFood.mockResolvedValue(product);
  addNutritionFavorite.mockResolvedValue(product);

  renderNutrition();
  fireEvent.change(await screen.findByPlaceholderText("Search food or brand"), {
    target: { value: "protein yogurt" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.click(await screen.findByRole("button", { name: /Test Protein Yogurt/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Add to favorites" }));

  await waitFor(() => expect(addNutritionFavorite).toHaveBeenCalledWith("12345678"));
  expect(await screen.findByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove from favorites" }));
  await waitFor(() => expect(deleteNutritionFavorite).toHaveBeenCalledWith("12345678"));
  expect(await screen.findByRole("button", { name: "Add to favorites" })).toBeInTheDocument();
});

test("keeps estimated-meal explanations collapsed until requested", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 680, protein: 43, carbs: 58, fat: 26, sugar: 5 },
    items: [{
      nutritionLogItemId: 91,
      foodName: "Stuffed chicken with potatoes",
      brand: "Homemade",
      source: "ai_estimate",
      portionDescription: "Full plate",
      calories: 680,
      protein: 43,
      evaluationStatus: "estimated",
      evaluationReason: "Estimated from the described homemade meal.",
      practicalSuggestion: "Values vary by recipe and serving size.",
      estimateConfidence: "medium",
      estimateAssumptions: ["Moderate cooking oil"],
      createDate: "2026-06-19T12:00:00.000Z"
    }],
    insight: { type: "attention", text: "Protein is progressing.", action: "Keep logging." }
  });

  renderNutrition();

  const explanation = "Estimated from the described homemade meal.";
  expect(await screen.findByRole("button", { name: "Why estimated?" })).toBeInTheDocument();
  expect(screen.queryByText(explanation)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Why estimated?" }));
  expect(await screen.findByText(explanation)).toBeInTheDocument();
  expect(screen.getByText(/Moderate cooking oil/)).toBeInTheDocument();
});

test("shows first-use target setup and saves a self-service profile", async () => {
  getNutritionProfile.mockResolvedValue(null);
  getNutritionToday
    .mockResolvedValueOnce({
      configured: false,
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
      items: [],
      insight: "Set targets."
    })
    .mockResolvedValueOnce({
      configured: true,
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
      items: [],
      insight: "Ready."
    });
  updateNutritionProfile.mockResolvedValue({
    goal: "maintenance",
    dailyCaloriesTarget: 2400,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  });

  renderNutrition();

  expect(await screen.findByText("Generate suggested daily targets")).toBeInTheDocument();
  expect(screen.getByLabelText("Daily calories")).toHaveValue(null);
  expect(screen.getByLabelText("Daily protein (g)")).toHaveValue(null);
  expect(screen.getByLabelText("Daily calories")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Daily protein (g)")).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "Save Nutrition Profile" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Ask Nutritionist AI" })).toBeEnabled();
  expect(screen.getByText("Fitness profile used by the AI")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Allergies (optional)"), {
    target: { value: "milk" }
  });
  fireEvent.change(screen.getByLabelText("Limitations (optional)"), {
    target: { value: "lactose sensitivity" }
  });
  fireEvent.change(screen.getByLabelText("Anything else the nutritionist should know? (optional)"), {
    target: { value: "Keep my energy stable" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Ask Nutritionist AI" }));

  await waitFor(() =>
    expect(getNutritionTargetSuggestion).toHaveBeenLastCalledWith(
      "maintenance",
      true,
      {
        dietaryPreferences: [],
        allergies: ["milk"],
        medicalRestrictions: ["lactose sensitivity"],
        additionalContext: "Keep my energy stable"
      }
    )
  );
  expect(await screen.findByDisplayValue("2400")).toBeInTheDocument();
  expect(screen.getByLabelText("Daily calories")).not.toHaveAttribute("readonly");
  expect(screen.getByLabelText("Daily protein (g)")).not.toHaveAttribute("readonly");
  expect(screen.getByDisplayValue("Protein-forward balanced meals")).toBeInTheDocument();
  expect(screen.getByText(/Build meals around protein/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Nutrition Profile" }));

  await waitFor(() =>
    expect(updateNutritionProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyCaloriesTarget: 2400,
        dailyProteinTarget: 120,
        goal: "maintenance"
      })
    )
  );
});

test("requires missing body data to be corrected in the Fitness Profile", async () => {
  getNutritionProfile.mockResolvedValue(null);
  getNutritionToday.mockResolvedValue({
    configured: false,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: "Set targets."
  });
  getTraineeProfile.mockResolvedValue({
    userId: 3,
    goal: "muscle gain",
    level: "intermediate",
    age: 30,
    weight: null,
    height: 178,
    biologicalSex: null,
    trainingDaysPerWeek: 4,
    preferredStyle: "balanced strength and conditioning",
    equipmentAccess: [],
    injuries: [],
    limitations: [],
    likedExercises: [],
    dislikedExercises: [],
    specialtyPreferences: {}
  });
  getNutritionTargetSuggestion.mockResolvedValue({
    canCalculate: false,
    missingFields: ["weight"],
    inputs: {
      nutritionGoal: "muscle gain",
      trainingGoal: "muscle gain",
      age: 30,
      height: 178,
      weight: null,
      trainingLevel: "intermediate",
      trainingDaysPerWeek: 4
    }
  });

  renderNutrition();

  expect(await screen.findByText("Update your Fitness Profile")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Update Fitness Profile" })).toHaveAttribute(
    "href",
    "/onboarding"
  );
  expect(screen.queryByLabelText("Weight (kg)")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Daily calories")).not.toBeRequired();
  expect(screen.getByLabelText("Daily protein (g)")).not.toBeRequired();
  expect(screen.getByLabelText("Daily calories")).toHaveAttribute(
    "placeholder",
    "Not generated yet"
  );
  expect(screen.getByRole("button", { name: "Ask Nutritionist AI" })).toBeDisabled();
  expect(getNutritionTargetSuggestion).toHaveBeenCalledTimes(1);
});

test("rejects absurd generated targets only when saving", async () => {
  getNutritionProfile.mockResolvedValue(null);
  getNutritionToday.mockResolvedValue({
    configured: false,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null },
    items: [],
    insight: "Set targets."
  });

  renderNutrition();

  fireEvent.click(await screen.findByRole("button", { name: "Ask Nutritionist AI" }));
  expect(await screen.findByDisplayValue("2400")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Daily calories"), {
    target: { value: "77" }
  });
  fireEvent.change(screen.getByLabelText("Daily protein (g)"), {
    target: { value: "6" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Nutrition Profile" }));

  expect(
    await screen.findByText(/daily calories between 500 and 10000/i)
  ).toBeInTheDocument();
  expect(updateNutritionProfile).not.toHaveBeenCalled();
});

test("searches only after explicit form submission", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    totals: { calories: 400, protein: 35, carbs: 40, fat: 10, sugar: 8 },
    items: [],
    insight: "Keep going."
  });
  searchNutritionFoods.mockResolvedValue([
    {
      barcode: "12345678",
      name: "Protein Yogurt",
      brand: "Test",
      imageUrl: null,
      nutritionComplete: true,
      servingGrams: 150
    }
  ]);

  renderNutrition();

  const input = await screen.findByPlaceholderText("Search food or brand");
  fireEvent.change(input, { target: { value: "protein yogurt" } });
  expect(searchNutritionFoods).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(await screen.findByText("Protein Yogurt")).toBeInTheDocument();
  expect(searchNutritionFoods).toHaveBeenCalledWith("protein yogurt");
});

test("shows live portion preview and clears an evaluation after the portion changes", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  const product = {
    barcode: "12345678",
    name: "Protein Yogurt",
    brand: "Test",
    imageUrl: null,
    servingGrams: 150,
    nutritionComplete: true,
    nutritionPer100g: {
      calories: 80,
      protein: 10,
      carbs: 6,
      fat: 2,
      sugar: 4
    },
    allergens: ["milk"],
    allergensKnown: true,
    ingredients: "Milk",
    sourceUrl: "https://example.com"
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    remaining: { calories: 1600, protein: 85 },
    totals: { calories: 400, protein: 35, carbs: 40, fat: 10, sugar: 8 },
    nutritionCompleteness: { sugarComplete: true },
    items: [],
    insight: { type: "attention", text: "Protein is still low today.", action: "Choose protein." }
  });
  searchNutritionFoods.mockResolvedValue([product]);
  getNutritionFood.mockResolvedValue(product);
  evaluateNutritionFood.mockResolvedValue({
    evaluationId: "evaluation-1",
    status: "recommended",
    explanation: "Fits today.",
    practicalSuggestion: "Enjoy it.",
    portionGuidance: {
      decision: "ok_now",
      label: "Okay to eat now",
      message: "This portion fits your targets well right now.",
      suggestedServingGrams: null,
      suggestedPortionNutrition: null
    },
    guidanceSource: "groq",
    servingGrams: 150,
    projectedTotals: { calories: 520, protein: 50, carbs: 49, fat: 13 },
    targets: { calories: 2000, protein: 120 },
    warnings: [],
    disclaimer: "General guidance."
  });

  renderNutrition();
  const search = await screen.findByPlaceholderText("Search food or brand");
  fireEvent.change(search, { target: { value: "protein yogurt" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.click(await screen.findByRole("button", { name: /Protein Yogurt/ }));
  expect(await screen.findByText("Portion Preview")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Evaluate for this portion" }));
  expect(await screen.findByText("Fits today.")).toBeInTheDocument();
  expect(await screen.findByText("Okay to eat now")).toBeInTheDocument();
  expect(screen.getByText("This portion fits your targets well right now.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "50g" }));
  expect(screen.queryByText("Fits today.")).not.toBeInTheDocument();
});

test("adds the exact evaluated snapshot id", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  const product = {
    barcode: "12345678",
    name: "Protein Yogurt",
    brand: "Test",
    imageUrl: null,
    servingGrams: 100,
    nutritionComplete: true,
    nutritionPer100g: { calories: 80, protein: 10, carbs: 6, fat: 2, sugar: 4 },
    allergens: [],
    allergensKnown: true,
    ingredients: "Milk",
    sourceUrl: "https://example.com"
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    remaining: { calories: 1600, protein: 85 },
    totals: { calories: 400, protein: 35, carbs: 40, fat: 10, sugar: 8 },
    nutritionCompleteness: { sugarComplete: true },
    items: [],
    insight: { type: "attention", text: "Protein is still low today.", action: "Choose protein." }
  });
  searchNutritionFoods.mockResolvedValue([product]);
  getNutritionFood.mockResolvedValue(product);
  evaluateNutritionFood.mockResolvedValue({
    evaluationId: "evaluation-42",
    status: "neutral",
    explanation: "Fits today.",
    practicalSuggestion: "Keep the portion moderate.",
    portionGuidance: {
      decision: "reduce_portion",
      label: "Consider a smaller portion",
      message: "This portion would put you over today's calorie target. A smaller amount of the same food may fit better.",
      suggestedServingGrams: 75,
      suggestedPortionNutrition: { calories: 60, protein: 7.5, carbs: 4.5, fat: 1.5, sugar: 3 }
    },
    guidanceSource: "groq",
    servingGrams: 100,
    projectedTotals: { calories: 480, protein: 45, carbs: 46, fat: 12 },
    targets: { calories: 2000, protein: 120 },
    warnings: [],
    disclaimer: "General guidance."
  });
  addNutritionLogItem.mockResolvedValue({});

  renderNutrition();
  const search = await screen.findByPlaceholderText("Search food or brand");
  fireEvent.change(search, { target: { value: "protein yogurt" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.click(await screen.findByRole("button", { name: /Protein Yogurt/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Evaluate for this portion" }));
  expect(await screen.findByText("Consider a smaller portion")).toBeInTheDocument();
  expect(screen.getByText(/Try about 75g/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Add to Today" }));

  await waitFor(() =>
    expect(addNutritionLogItem).toHaveBeenCalledWith({ evaluationId: "evaluation-42" })
  );
});

test("keeps Add to Today available when portion guidance is advisory", async () => {
  const profile = {
    goal: "maintenance",
    dailyCaloriesTarget: 2000,
    dailyProteinTarget: 120,
    allergies: [],
    dietaryPreferences: [],
    medicalRestrictions: []
  };
  const product = {
    barcode: "12345678",
    name: "Protein Yogurt",
    brand: "Test",
    imageUrl: null,
    servingGrams: 100,
    nutritionComplete: true,
    nutritionPer100g: { calories: 80, protein: 10, carbs: 6, fat: 2, sugar: 4 },
    allergens: [],
    allergensKnown: true,
    ingredients: "Milk",
    sourceUrl: "https://example.com"
  };
  getNutritionProfile.mockResolvedValue(profile);
  getNutritionToday.mockResolvedValue({
    configured: true,
    profile,
    remaining: { calories: 0, protein: 20 },
    totals: { calories: 2000, protein: 100, carbs: 140, fat: 55, sugar: 20 },
    nutritionCompleteness: { sugarComplete: true },
    items: [],
    insight: { type: "attention", text: "You are above today's calorie target.", action: "Choose lighter portions." }
  });
  searchNutritionFoods.mockResolvedValue([product]);
  getNutritionFood.mockResolvedValue(product);
  evaluateNutritionFood.mockResolvedValue({
    evaluationId: "evaluation-99",
    status: "not_recommended",
    explanation: "This portion may not fit well today.",
    practicalSuggestion: "Consider choosing this food another time.",
    portionGuidance: {
      decision: "better_not_today",
      label: "May not fit well today",
      message: "You are already at or above today's calorie target, so this portion may not fit well today.",
      suggestedServingGrams: null,
      suggestedPortionNutrition: null
    },
    guidanceSource: "deterministic",
    servingGrams: 100,
    projectedTotals: { calories: 2080, protein: 110, carbs: 146, fat: 57 },
    targets: { calories: 2000, protein: 120 },
    warnings: ["This portion would exceed your daily calorie target."],
    disclaimer: "General guidance."
  });

  renderNutrition();
  fireEvent.change(await screen.findByPlaceholderText("Search food or brand"), {
    target: { value: "protein yogurt" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.click(await screen.findByRole("button", { name: /Protein Yogurt/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Evaluate for this portion" }));

  expect(await screen.findByText("May not fit well today")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add to Today" })).toBeEnabled();
});
