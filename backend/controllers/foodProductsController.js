const { FoodProduct } = require("../models");
const createCrudController = require("../utils/resourceControllerFactory");

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateFoodProductBody(body) {
  const details = {};

  if (typeof body.barcode !== "string" || body.barcode.trim() === "") {
    details.barcode = "barcode is required and must be a non-empty string.";
  }

  if (typeof body.name !== "string" || body.name.trim() === "") {
    details.name = "name is required and must be a non-empty string.";
  }

  if (typeof body.brand !== "string" || body.brand.trim() === "") {
    details.brand = "brand is required and must be a non-empty string.";
  }

  ["calories", "protein", "carbs", "sugar", "fat"].forEach((field) => {
    if (typeof body[field] !== "number" || Number.isNaN(body[field]) || body[field] < 0) {
      details[field] = `${field} is required and must be a number greater than or equal to 0.`;
    }
  });

  if (!isStringArray(body.allergens)) {
    details.allergens = "allergens is required and must be an array of strings.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildFoodProductPayload(body) {
  return {
    barcode: body.barcode.trim(),
    name: body.name.trim(),
    brand: body.brand.trim(),
    calories: body.calories,
    protein: body.protein,
    carbs: body.carbs,
    sugar: body.sugar,
    fat: body.fat,
    allergens: body.allergens
  };
}

const controller = createCrudController({
  Model: FoodProduct,
  idField: "productId",
  resourceLabel: "Food product",
  validateBody: validateFoodProductBody,
  buildCreatePayload: buildFoodProductPayload,
  buildUpdatePayload: buildFoodProductPayload
});

module.exports = {
  getFoodProducts: controller.list,
  getFoodProductById: controller.getById,
  createFoodProduct: controller.create,
  updateFoodProduct: controller.update,
  deleteFoodProduct: controller.remove
};
