const { NutritionProfile } = require("../models");
const createCrudController = require("../utils/resourceControllerFactory");

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateNutritionProfileBody(body) {
  const details = {};

  if (!Number.isInteger(body.userId) || body.userId <= 0) {
    details.userId = "userId is required and must be a positive number.";
  }

  if (typeof body.goal !== "string" || body.goal.trim() === "") {
    details.goal = "goal is required and must be a non-empty string.";
  }

  if (!isStringArray(body.medicalRestrictions)) {
    details.medicalRestrictions = "medicalRestrictions is required and must be an array of strings.";
  }

  if (!isStringArray(body.dietaryPreferences)) {
    details.dietaryPreferences = "dietaryPreferences is required and must be an array of strings.";
  }

  if (typeof body.freeTextNeeds !== "string" || body.freeTextNeeds.trim() === "") {
    details.freeTextNeeds = "freeTextNeeds is required and must be a non-empty string.";
  }

  if (typeof body.structuredProfile !== "string" || body.structuredProfile.trim() === "") {
    details.structuredProfile = "structuredProfile is required and must be a non-empty string.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildNutritionProfilePayload(body) {
  return {
    userId: body.userId,
    goal: body.goal.trim(),
    medicalRestrictions: body.medicalRestrictions,
    dietaryPreferences: body.dietaryPreferences,
    freeTextNeeds: body.freeTextNeeds.trim(),
    structuredProfile: body.structuredProfile.trim()
  };
}

const controller = createCrudController({
  Model: NutritionProfile,
  idField: "nutritionProfileId",
  resourceLabel: "Nutrition profile",
  validateBody: validateNutritionProfileBody,
  buildCreatePayload: buildNutritionProfilePayload,
  buildUpdatePayload: buildNutritionProfilePayload
});

module.exports = {
  getNutritionProfiles: controller.list,
  getNutritionProfileById: controller.getById,
  createNutritionProfile: controller.create,
  updateNutritionProfile: controller.update,
  deleteNutritionProfile: controller.remove
};
