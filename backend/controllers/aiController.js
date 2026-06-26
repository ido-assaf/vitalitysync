const {
  FoodProduct,
  NutritionProfile,
  ProductEvaluation,
  User
} = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const { generateProductEvaluation } = require("../services/aiService");
const asyncHandler = require("../utils/asyncHandler");

function validateGenerateBody(body) {
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

  return Object.keys(details).length > 0 ? details : null;
}

const generateProductEvaluationController = asyncHandler(async (req, res) => {
  const validationDetails = validateGenerateBody(req.body);

  if (validationDetails) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "AI evaluation request body is invalid.", validationDetails)
    );
  }

  const [user, product, nutritionProfile] = await Promise.all([
    User.findByPk(req.body.userId),
    FoodProduct.findByPk(req.body.productId),
    NutritionProfile.findByPk(req.body.nutritionProfileId)
  ]);

  if (!user || !product || !nutritionProfile) {
    return res.status(404).json(
      errorResponse("NOT_FOUND", "Required user, product, or nutrition profile was not found.", {
        userFound: Boolean(user),
        productFound: Boolean(product),
        nutritionProfileFound: Boolean(nutritionProfile)
      })
    );
  }

  try {
    const generatedEvaluation = await generateProductEvaluation({
      user: user.toJSON(),
      product: product.toJSON(),
      nutritionProfile: nutritionProfile.toJSON()
    });

    const savedEvaluation = await ProductEvaluation.create({
      userId: req.body.userId,
      productId: req.body.productId,
      nutritionProfileId: req.body.nutritionProfileId,
      ...generatedEvaluation
    });

    return res.status(201).json(successResponse(savedEvaluation));
  } catch (error) {
    return res.status(503).json(
      errorResponse("AI_SERVICE_UNAVAILABLE", "AI evaluation could not be generated.", {
        reason: error.message
      })
    );
  }
});

module.exports = {
  generateProductEvaluation: generateProductEvaluationController
};
