const { ProductEvaluation } = require("../models");
const createCrudController = require("../utils/resourceControllerFactory");

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateProductEvaluationBody(body) {
  const details = {};

  if (!Number.isInteger(body.userId) || body.userId <= 0) {
    details.userId = "userId is required and must be a positive number.";
  }

  if (!Number.isInteger(body.productId) || body.productId <= 0) {
    details.productId = "productId is required and must be a positive number.";
  }

  if (!Number.isInteger(body.nutritionProfileId) || body.nutritionProfileId <= 0) {
    details.nutritionProfileId = "nutritionProfileId is required and must be a positive number.";
  }

  if (
    typeof body.score !== "number" ||
    Number.isNaN(body.score) ||
    body.score < 0 ||
    body.score > 100
  ) {
    details.score = "score is required and must be a number between 0 and 100.";
  }

  if (typeof body.recommendation !== "string" || body.recommendation.trim() === "") {
    details.recommendation = "recommendation is required and must be a non-empty string.";
  }

  if (typeof body.explanation !== "string" || body.explanation.trim() === "") {
    details.explanation = "explanation is required and must be a non-empty string.";
  }

  if (!isStringArray(body.suggestedAlternatives)) {
    details.suggestedAlternatives =
      "suggestedAlternatives is required and must be an array of strings.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildProductEvaluationPayload(body) {
  return {
    userId: body.userId,
    productId: body.productId,
    nutritionProfileId: body.nutritionProfileId,
    score: body.score,
    recommendation: body.recommendation.trim(),
    explanation: body.explanation.trim(),
    suggestedAlternatives: body.suggestedAlternatives
  };
}

const controller = createCrudController({
  Model: ProductEvaluation,
  idField: "evaluationId",
  resourceLabel: "Product evaluation",
  validateBody: validateProductEvaluationBody,
  buildCreatePayload: buildProductEvaluationPayload,
  buildUpdatePayload: buildProductEvaluationPayload
});

module.exports = {
  getProductEvaluations: controller.list,
  getProductEvaluationById: controller.getById,
  createProductEvaluation: controller.create,
  updateProductEvaluation: controller.update,
  deleteProductEvaluation: controller.remove
};
