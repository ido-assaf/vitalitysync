const { MealPlan } = require("../models");
const createCrudController = require("../utils/resourceControllerFactory");

function isMealArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "string" ||
        (typeof item === "object" && item !== null && !Array.isArray(item))
    )
  );
}

function validateMealPlanBody(body) {
  const details = {};

  if (!Number.isInteger(body.userId) || body.userId <= 0) {
    details.userId = "userId is required and must be a positive number.";
  }

  if (!Number.isInteger(body.nutritionProfileId) || body.nutritionProfileId <= 0) {
    details.nutritionProfileId = "nutritionProfileId is required and must be a positive number.";
  }

  if (typeof body.planType !== "string" || body.planType.trim() === "") {
    details.planType = "planType is required and must be a non-empty string.";
  }

  if (
    typeof body.dailyCalories !== "number" ||
    Number.isNaN(body.dailyCalories) ||
    body.dailyCalories <= 0
  ) {
    details.dailyCalories = "dailyCalories is required and must be a positive number.";
  }

  if (
    typeof body.proteinGrams !== "number" ||
    Number.isNaN(body.proteinGrams) ||
    body.proteinGrams < 0
  ) {
    details.proteinGrams =
      "proteinGrams is required and must be a number greater than or equal to 0.";
  }

  if (!isMealArray(body.meals)) {
    details.meals = "meals is required and must be a non-empty array of strings or objects.";
  }

  if (typeof body.notes !== "string" || body.notes.trim() === "") {
    details.notes = "notes is required and must be a non-empty string.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildMealPlanPayload(body) {
  return {
    userId: body.userId,
    nutritionProfileId: body.nutritionProfileId,
    planType: body.planType.trim(),
    dailyCalories: body.dailyCalories,
    proteinGrams: body.proteinGrams,
    meals: body.meals,
    notes: body.notes.trim()
  };
}

const controller = createCrudController({
  Model: MealPlan,
  idField: "mealPlanId",
  resourceLabel: "Meal plan",
  validateBody: validateMealPlanBody,
  buildCreatePayload: buildMealPlanPayload,
  buildUpdatePayload: buildMealPlanPayload
});

module.exports = {
  getMealPlans: controller.list,
  getMealPlanById: controller.getById,
  createMealPlan: controller.create,
  updateMealPlan: controller.update,
  deleteMealPlan: controller.remove
};
