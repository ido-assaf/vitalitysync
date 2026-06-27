const {
  AiSpecialist,
  NutritionFavorite,
  NutritionLogItem,
  NutritionProfile,
  TraineeProfile,
  WorkoutPlan
} = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const {
  generateMealEstimate,
  generateMealPhotoEstimate,
  generateNutritionGuidance,
  generateNutritionTargets
} = require("../services/aiService");
const {
  getFoodByBarcode,
  searchFoods
} = require("../services/openFoodFactsService");
const {
  addNutrition,
  applySafetyRules,
  buildDailyInsight,
  buildPortionGuidance,
  buildTargetSuggestion,
  calculatePortionNutrition,
  findAllergenMatches,
  sumNutrition
} = require("../services/nutritionService");
const {
  consumeEvaluationSnapshot,
  createEvaluationSnapshot,
  getEvaluationSnapshot
} = require("../services/nutritionEvaluationStore");
const {
  consumeEstimateSnapshot,
  createEstimateSnapshot,
  getEstimateSnapshot
} = require("../services/nutritionEstimateStore");
const asyncHandler = require("../utils/asyncHandler");

function currentUserId(req) {
  const userId = Number(req.header("x-user-id"));
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function stringArray(value) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function queryStringArray(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return values
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function targetNutritionContext(query) {
  return {
    dietaryPreferences: queryStringArray(query.dietaryPreferences),
    allergies: queryStringArray(query.allergies),
    medicalRestrictions: queryStringArray(query.medicalRestrictions),
    additionalContext: String(query.additionalContext || "").trim().slice(0, 1000)
  };
}

function targetContextNote(context) {
  const considered = [];
  if (context.dietaryPreferences.length) {
    considered.push(`dietary preferences (${context.dietaryPreferences.join(", ")})`);
  }
  if (context.allergies.length) {
    considered.push(`allergies (${context.allergies.join(", ")})`);
  }
  if (context.medicalRestrictions.length) {
    considered.push(`other limitations (${context.medicalRestrictions.join(", ")})`);
  }
  if (context.profileInjuries?.length) {
    considered.push(`saved injuries (${context.profileInjuries.join(", ")})`);
  }
  if (context.profileLimitations?.length) {
    considered.push(`saved fitness limitations (${context.profileLimitations.join(", ")})`);
  }
  if (context.additionalContext) {
    considered.push(`your additional context ("${context.additionalContext}")`);
  }

  return considered.length
    ? ` Considered ${considered.join("; ")}.`
    : " No additional dietary preferences, allergies, limitations, or context were provided.";
}

function fallbackNutritionRecommendation(goal, context) {
  const approaches = {
    "fat loss": "Protein-forward, fiber-rich meals with controlled portions and mostly minimally processed foods.",
    "muscle gain": "Protein-forward balanced meals with sufficient carbohydrates around training and consistent meal timing.",
    maintenance: "Balanced meals built around protein, vegetables, quality carbohydrates, and sustainable portions."
  };
  const constraints = [
    ...context.allergies,
    ...context.medicalRestrictions,
    ...(context.profileInjuries || []),
    ...(context.profileLimitations || [])
  ];

  return {
    dietaryApproach: approaches[goal] || approaches.maintenance,
    mealGuidance:
      `Build each main meal around a protein source, add vegetables or fruit, and adjust carbohydrate portions around training.` +
      (constraints.length
        ? ` Exclude or replace foods related to: ${constraints.join(", ")}.`
        : "")
  };
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateProfileBody(body) {
  const details = {};
  const calories = Number(body.dailyCaloriesTarget);
  const protein = Number(body.dailyProteinTarget);

  if (!Number.isFinite(calories) || calories < 500 || calories > 10000) {
    details.dailyCaloriesTarget = "Daily calorie target must be between 500 and 10000.";
  }

  if (!Number.isFinite(protein) || protein < 10 || protein > 500) {
    details.dailyProteinTarget = "Daily protein target must be between 10 and 500 grams.";
  }

  if (typeof body.goal !== "string" || body.goal.trim() === "") {
    details.goal = "Goal is required.";
  }

  ["dietaryPreferences", "allergies", "medicalRestrictions"].forEach((field) => {
    if (!Array.isArray(body[field])) {
      details[field] = `${field} must be an array of strings.`;
    }
  });

  return Object.keys(details).length > 0 ? details : null;
}

function validateFoodBody(body) {
  const details = {};
  const servingGrams = Number(body.servingGrams);

  if (!/^\d{4,30}$/.test(String(body.barcode || "").trim())) {
    details.barcode = "A valid product barcode is required.";
  }

  if (!Number.isFinite(servingGrams) || servingGrams < 1 || servingGrams > 2000) {
    details.servingGrams = "Serving size must be between 1 and 2000 grams.";
  }

  if (!validDate(body.date)) {
    details.date = "Date must use YYYY-MM-DD.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

const PORTION_SIZES = new Set(["small", "medium", "full_plate", "large_plate", "custom"]);
const COOKING_STYLES = new Set(["baked", "fried", "grilled", "unknown"]);

function validateMealEstimateBody(body, hasImage = false) {
  const details = {};
  const description = String(body.description || "").trim();
  const portionSize = String(body.portionSize || "").trim();
  const customPortion = String(body.customPortion || "").trim();
  const cookingStyle = String(body.cookingStyle || "").trim();

  if ((!hasImage && description.length < 3) || description.length > 500) {
    details.description = hasImage
      ? "Optional meal description must contain no more than 500 characters."
      : "Meal description must contain 3 to 500 characters.";
  } else if (hasImage && description.length > 0 && description.length < 3) {
    details.description = "Optional meal description must contain at least 3 characters.";
  }
  if (!PORTION_SIZES.has(portionSize)) {
    details.portionSize = "Portion size is invalid.";
  }
  if (portionSize === "custom" && (!customPortion || customPortion.length > 120)) {
    details.customPortion = "Describe the custom portion in 1 to 120 characters.";
  }
  if (!COOKING_STYLES.has(cookingStyle)) {
    details.cookingStyle = "Cooking style is invalid.";
  }

  return Object.keys(details).length ? details : null;
}

function validateReviewedNutrition(value) {
  const details = {};
  const limits = { calories: 5000, protein: 500, carbs: 500, fat: 500, sugar: 500 };
  const normalized = {};

  for (const [field, maximum] of Object.entries(limits)) {
    if (field === "sugar" && (value?.[field] === null || value?.[field] === "")) {
      normalized[field] = null;
      continue;
    }
    const number = Number(value?.[field]);
    if (!Number.isFinite(number) || number < 0 || number > maximum) {
      details[field] = `${field} must be between 0 and ${maximum}.`;
    } else {
      normalized[field] = Math.round(number * 10) / 10;
    }
  }

  return Object.keys(details).length ? { details, normalized: null } : { details: null, normalized };
}

function dailyLogFingerprint(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => `${item.nutritionLogItemId}:${item.updateDate || item.createDate || ""}`)
    .sort()
    .join("|");
}

function profileVersion(profile) {
  return profile?.updateDate ? new Date(profile.updateDate).toISOString() : "";
}

async function getProfile(userId) {
  return NutritionProfile.findOne({
    where: { userId },
    order: [["updateDate", "DESC"], ["nutritionProfileId", "DESC"]]
  });
}

async function getTodayItems(userId, date) {
  return NutritionLogItem.findAll({
    where: { userId, consumedDate: date },
    order: [["createDate", "DESC"]]
  });
}

function configuredProfile(profile) {
  return Boolean(
    profile &&
      Number(profile.dailyCaloriesTarget) > 0 &&
      Number(profile.dailyProteinTarget) > 0
  );
}

async function resolveNutritionSpecialist(userId) {
  const traineeProfile = await TraineeProfile.findOne({
    where: { userId },
    include: [{ model: AiSpecialist }]
  });
  const assigned = traineeProfile?.AiSpecialist;

  if (assigned?.domain === "nutrition" && assigned.isActive !== false) {
    return assigned;
  }

  return (
    (await AiSpecialist.findOne({
      where: {
        domain: "nutrition",
        specialty: "sports nutrition",
        isActive: true
      },
      order: [["specialistId", "ASC"]]
    })) ||
    (await AiSpecialist.findOne({
      where: { domain: "nutrition", isActive: true },
      order: [["specialistId", "ASC"]]
    }))
  );
}

function fallbackGuidance({ portionNutrition, nutritionProfile, projectedTotals }) {
  if (projectedTotals.calories > Number(nutritionProfile.dailyCaloriesTarget)) {
    return {
      status: "caution",
      explanation: "This portion would take you above today’s calorie target.",
      practicalSuggestion: "Choose a smaller portion or balance it with lighter foods later."
    };
  }

  if (portionNutrition.protein >= 10) {
    return {
      status: "recommended",
      explanation: "This portion contributes meaningful protein while remaining within today’s calorie target.",
      practicalSuggestion: "Use it as part of a balanced meal and keep tracking the rest of the day."
    };
  }

  return {
    status: "neutral",
    explanation: "This portion can fit today based on your current calorie total.",
    practicalSuggestion: "Balance it with a protein-rich food if your protein target is still low."
  };
}

async function evaluateFood({ userId, barcode, servingGrams, date }) {
  const [profile, food, items] = await Promise.all([
    getProfile(userId),
    getFoodByBarcode(barcode),
    getTodayItems(userId, date)
  ]);

  if (!configuredProfile(profile)) {
    const error = new Error("Complete your nutrition profile before evaluating food.");
    error.code = "PROFILE_REQUIRED";
    throw error;
  }

  if (!food) {
    const error = new Error("The selected Open Food Facts product was not found.");
    error.code = "FOOD_NOT_FOUND";
    throw error;
  }

  if (!food.nutritionComplete) {
    const error = new Error("This product does not have complete calories and macro data.");
    error.code = "INCOMPLETE_NUTRITION";
    error.food = food;
    throw error;
  }

  const currentTotals = sumNutrition(items);
  const portionNutrition = calculatePortionNutrition(food, servingGrams);
  const projectedTotals = addNutrition(currentTotals, portionNutrition);
  const profileData = profile.toJSON();
  const allergenMatches = findAllergenMatches(profileData.allergies, food.allergens);
  let aiGuidance = null;
  let aiAvailable = false;
  let guidanceSource = "deterministic";

  if (allergenMatches.length === 0) {
    try {
      const specialist = await resolveNutritionSpecialist(userId);
      aiGuidance = await generateNutritionGuidance({
        food,
        portionNutrition,
        currentTotals,
        projectedTotals,
        nutritionProfile: profileData,
        specialist: specialist?.toJSON?.() || specialist || null
      });
      aiAvailable = true;
      guidanceSource = "groq";
    } catch (error) {
      aiGuidance = fallbackGuidance({
        portionNutrition,
        nutritionProfile: profileData,
        projectedTotals
      });
    }
  } else {
    guidanceSource = "safety_override";
  }

  const evaluation = {
    food,
    servingGrams: Number(servingGrams),
    portionNutrition,
    currentTotals,
    projectedTotals,
    targets: {
      calories: Number(profile.dailyCaloriesTarget),
      protein: Number(profile.dailyProteinTarget)
    },
    portionGuidance: buildPortionGuidance({
      food,
      nutritionProfile: profileData,
      currentTotals,
      portionNutrition,
      projectedTotals,
      servingGrams
    }),
    ...applySafetyRules({
      aiGuidance,
      food,
      nutritionProfile: profileData,
      projectedTotals
    }),
    aiAvailable,
    guidanceSource,
    disclaimer: "General nutrition guidance only; not medical advice."
  };

  const snapshot = createEvaluationSnapshot({
    userId,
    barcode: String(barcode),
    date,
    servingGrams: Number(servingGrams),
    profileVersion: profileVersion(profile),
    dailyLogFingerprint: dailyLogFingerprint(items),
    evaluation
  });

  return {
    ...evaluation,
    ...snapshot
  };
}

const getOwnProfile = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);

  if (!userId) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "A valid user is required."));
  }

  return res.status(200).json(successResponse(await getProfile(userId)));
});

const getTargetSuggestion = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);

  if (!userId) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "A valid user is required."));
  }

  const [traineeProfile, workoutPlan] = await Promise.all([
    TraineeProfile.findOne({ where: { userId } }),
    WorkoutPlan.findOne({
      where: { userId },
      order: [["updateDate", "DESC"], ["planId", "DESC"]]
    })
  ]);

  if (!traineeProfile) {
    return res.status(200).json(
      successResponse({
        canCalculate: false,
        missingFields: ["traineeProfile"],
        suggestedCalories: null,
        suggestedProtein: null,
        inputs: null,
        calculation: null,
        estimateNote: "Complete your fitness profile before generating nutrition targets.",
        disclaimer: "General fitness guidance only; not medical advice."
      })
    );
  }

  const requestedGoal = String(req.query.goal || "").trim().toLowerCase();
  const nutritionContext = {
    ...targetNutritionContext(req.query),
    profileInjuries: stringArray(traineeProfile.injuries),
    profileLimitations: stringArray(traineeProfile.limitations)
  };
  const contextNote = targetContextNote(nutritionContext);
  const baseline = buildTargetSuggestion(
    traineeProfile,
    requestedGoal,
    workoutPlan,
    nutritionContext
  );
  const useAi = String(req.query.ai || "").toLowerCase() === "true";
  const fallbackRecommendation = fallbackNutritionRecommendation(
    baseline.inputs?.nutritionGoal,
    nutritionContext
  );

  if (!baseline.canCalculate || !useAi) {
    return res.status(200).json(
      successResponse({
        ...baseline,
        generationSource: "deterministic"
      })
    );
  }

  try {
    const specialist = await resolveNutritionSpecialist(userId);
    const aiTargets = await generateNutritionTargets({
      traineeProfile: traineeProfile.toJSON(),
      workoutPlan: workoutPlan?.toJSON?.() || workoutPlan || null,
      specialist: specialist?.toJSON?.() || specialist || null,
      baseline,
      nutritionContext
    });

    return res.status(200).json(
      successResponse({
        ...baseline,
        suggestedCalories: aiTargets.dailyCalories,
        suggestedProtein: aiTargets.dailyProtein,
        suggestedDietaryApproach: aiTargets.dietaryApproach,
        mealGuidance: aiTargets.mealGuidance,
        estimateNote: `${aiTargets.explanation}${contextNote}`,
        assumptions: aiTargets.assumptions,
        generationSource: "groq",
        specialistName: specialist?.name || "Nutritionist AI"
      })
    );
  } catch (error) {
    return res.status(200).json(
      successResponse({
        ...baseline,
        suggestedDietaryApproach: fallbackRecommendation.dietaryApproach,
        mealGuidance: fallbackRecommendation.mealGuidance,
        generationSource: "deterministic_fallback",
        estimateNote:
          `${baseline.estimateNote}${contextNote} The Nutritionist AI was unavailable, so the validated profile calculation was used.`
      })
    );
  }
});

const upsertOwnProfile = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const validationDetails = validateProfileBody(req.body);

  if (!userId || validationDetails) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Nutrition profile is invalid.", {
        ...(validationDetails || {}),
        ...(!userId ? { user: "A valid user is required." } : {})
      })
    );
  }

  const existing = await getProfile(userId);
  const payload = {
    userId,
    goal: req.body.goal.trim(),
    dailyCaloriesTarget: Number(req.body.dailyCaloriesTarget),
    dailyProteinTarget: Number(req.body.dailyProteinTarget),
    allergies: stringArray(req.body.allergies),
    medicalRestrictions: stringArray(req.body.medicalRestrictions),
    dietaryPreferences: stringArray(req.body.dietaryPreferences),
    freeTextNeeds: String(req.body.freeTextNeeds || "").trim(),
    structuredProfile: JSON.stringify({
      goal: req.body.goal.trim(),
      dailyCaloriesTarget: Number(req.body.dailyCaloriesTarget),
      dailyProteinTarget: Number(req.body.dailyProteinTarget),
      allergies: stringArray(req.body.allergies),
      dietaryPreferences: stringArray(req.body.dietaryPreferences),
      medicalRestrictions: stringArray(req.body.medicalRestrictions)
    })
  };

  if (existing) {
    await existing.update(payload);
    return res.status(200).json(successResponse(existing));
  }

  return res.status(201).json(
    successResponse(await NutritionProfile.create(payload))
  );
});

const searchFoodProducts = asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (query.length < 2 || query.length > 100) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Search query must contain 2 to 100 characters.")
    );
  }

  try {
    return res.status(200).json(
      successResponse(await searchFoods(query, req.query.lang || "en"))
    );
  } catch (error) {
    return res.status(503).json(
      errorResponse("FOOD_DATA_UNAVAILABLE", "Food search is temporarily unavailable.", {
        reason: error.message
      })
    );
  }
});

const getFoodProduct = asyncHandler(async (req, res) => {
  const barcode = String(req.params.barcode || "").trim();

  if (!/^\d{4,30}$/.test(barcode)) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Barcode is invalid."));
  }

  try {
    const product = await getFoodByBarcode(barcode);

    return product
      ? res.status(200).json(successResponse(product))
      : res.status(404).json(errorResponse("NOT_FOUND", "Food product was not found."));
  } catch (error) {
    return res.status(503).json(
      errorResponse("FOOD_DATA_UNAVAILABLE", "Food product data is temporarily unavailable.", {
        reason: error.message
      })
    );
  }
});

async function respondWithEvaluation(req, res) {
  const userId = currentUserId(req);
  const validationDetails = validateFoodBody(req.body);

  if (!userId || validationDetails) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Nutrition request is invalid.", {
        ...(validationDetails || {}),
        ...(!userId ? { user: "A valid user is required." } : {})
      })
    );
  }

  try {
    const evaluation = await evaluateFood({
      userId,
      barcode: req.body.barcode,
      servingGrams: req.body.servingGrams,
      date: req.body.date
    });

    return res.status(200).json(successResponse(evaluation));
  } catch (error) {
    const statusByCode = {
      PROFILE_REQUIRED: 409,
      FOOD_NOT_FOUND: 404,
      INCOMPLETE_NUTRITION: 422
    };
    return res.status(statusByCode[error.code] || 503).json(
      errorResponse(error.code || "NUTRITION_SERVICE_UNAVAILABLE", error.message, {
        ...(error.food ? { food: error.food } : {})
      })
    );
  }
}

const evaluateFoodProduct = asyncHandler((req, res) =>
  respondWithEvaluation(req, res)
);

const estimateMeal = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const estimateType = req.file ? "photo" : "text";
  const validationDetails = validateMealEstimateBody(req.body, Boolean(req.file));

  if (!userId || validationDetails) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Meal estimate request is invalid.", {
        ...(validationDetails || {}),
        ...(!userId ? { user: "A valid user is required." } : {})
      })
    );
  }

  try {
    const input = {
      description: String(req.body.description || "").trim(),
      portionSize: req.body.portionSize,
      customPortion: String(req.body.customPortion || "").trim() || null,
      cookingStyle: req.body.cookingStyle
    };
    const estimate =
      estimateType === "photo"
        ? await generateMealPhotoEstimate({
            ...input,
            imageBuffer: req.file.buffer,
            imageMimeType: req.file.mimetype
          })
        : await generateMealEstimate(input);
    const snapshot = createEstimateSnapshot({
      userId,
      originalDescription: input.description || null,
      portionSize: req.body.portionSize,
      cookingStyle: req.body.cookingStyle,
      estimateType,
      estimate
    });

    return res.status(200).json(
      successResponse({
        ...snapshot,
        estimateType,
        estimate
      })
    );
  } catch (error) {
    const invalidEstimate =
      error.estimateErrorType === "required_values" ||
      /AI meal|JSON|Unexpected token|Expected property/.test(error.message);
    const malformedResponse = /JSON|Unexpected token|Expected property/.test(error.message);
    const missingNutrition = error.estimateErrorType === "required_values";
    const friendlyMessage = malformedResponse
      ? "The AI response could not be read. Please try again with a clearer photo or short description."
      : missingNutrition
        ? "The AI could not estimate calories and macros reliably. Try adding a short description or choosing a clearer portion size."
        : invalidEstimate
          ? "The meal photo was unclear. Try another image or add a short description."
          : "Meal estimation is temporarily unavailable.";

    return res.status(invalidEstimate ? 502 : 503).json(
      errorResponse(
        invalidEstimate ? "INVALID_AI_ESTIMATE" : "MEAL_ESTIMATION_UNAVAILABLE",
        friendlyMessage,
        { reason: error.message }
      )
    );
  }
});

const addLogItem = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const evaluationId = String(req.body.evaluationId || "").trim();
  const estimateId = String(req.body.estimateId || "").trim();

  if (!userId || (!evaluationId && !estimateId) || (evaluationId && estimateId)) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Provide one valid evaluationId or estimateId.")
    );
  }

  if (estimateId) {
    const snapshot = getEstimateSnapshot(estimateId);
    if (!snapshot) {
      return res.status(409).json(
        errorResponse("ESTIMATE_EXPIRED", "This meal estimate expired. Estimate it again.")
      );
    }
    if (snapshot.userId !== userId) {
      return res.status(403).json(errorResponse("FORBIDDEN", "This estimate belongs to another user."));
    }
    if (!validDate(req.body.date)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Date must use YYYY-MM-DD."));
    }

    const reviewed = validateReviewedNutrition(req.body.reviewedNutrition);
    if (reviewed.details) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Reviewed nutrition is invalid.", reviewed.details)
      );
    }

    const estimate = snapshot.estimate;
    const item = await NutritionLogItem.create({
      userId,
      consumedDate: req.body.date,
      foodName: estimate.mealName,
      brand: snapshot.estimateType === "photo" ? "AI visual estimate" : "Homemade",
      imageUrl: null,
      source: "ai_estimate",
      externalFoodId: estimateId,
      servingGrams: null,
      portionDescription: estimate.portionDescription,
      originalDescription: snapshot.originalDescription,
      estimateConfidence: estimate.confidence,
      estimateAssumptions: estimate.assumptions,
      ...reviewed.normalized,
      allergens: [],
      evaluationStatus: "estimated",
      evaluationReason:
        snapshot.estimateType === "photo"
          ? `Estimated from meal photo, optional description, and portion size. Values are approximate and may vary by hidden ingredients, oil, sauce, and actual serving size. ${estimate.explanation}`
          : estimate.explanation,
      practicalSuggestion:
        estimate.warnings.join(" ") ||
        (snapshot.estimateType === "photo"
          ? "Estimated from a meal photo and portion size. Values may vary by hidden ingredients, oil, sauce, and actual serving size."
          : "Values are approximate and can vary by recipe and serving size."),
      guidanceSource:
        snapshot.estimateType === "photo" ? "ai_photo_estimate" : "ai_estimate"
    });

    consumeEstimateSnapshot(estimateId);
    return res.status(201).json(successResponse(item));
  }

  const snapshot = getEvaluationSnapshot(evaluationId);

  if (!snapshot) {
    return res.status(409).json(
      errorResponse("EVALUATION_EXPIRED", "This evaluation expired. Evaluate the food again.")
    );
  }

  if (snapshot.userId !== userId) {
    return res.status(403).json(
      errorResponse("FORBIDDEN", "This evaluation belongs to another user.")
    );
  }

  const [profile, items] = await Promise.all([
    getProfile(userId),
    getTodayItems(userId, snapshot.date)
  ]);

  if (
    profileVersion(profile) !== snapshot.profileVersion ||
    dailyLogFingerprint(items) !== snapshot.dailyLogFingerprint
  ) {
    consumeEvaluationSnapshot(evaluationId);
    return res.status(409).json(
      errorResponse(
        "EVALUATION_STALE",
        "Your nutrition profile or today’s food log changed. Evaluate the food again."
      )
    );
  }

  const evaluation = snapshot.evaluation;
  const item = await NutritionLogItem.create({
    userId,
    consumedDate: snapshot.date,
    foodName: evaluation.food.name,
    brand: evaluation.food.brand || null,
    imageUrl: evaluation.food.imageUrl || null,
    source: "open_food_facts",
    externalFoodId: evaluation.food.barcode,
    servingGrams: evaluation.servingGrams,
    ...evaluation.portionNutrition,
    allergens: evaluation.food.allergens,
    evaluationStatus: evaluation.status,
    evaluationReason: evaluation.explanation,
    practicalSuggestion: evaluation.practicalSuggestion,
    guidanceSource: evaluation.guidanceSource
  });

  consumeEvaluationSnapshot(evaluationId);
  return res.status(201).json(successResponse(item));
});

const getRecentFoods = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const requestedLimit = Number(req.query.limit || 6);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(10, Math.max(1, requestedLimit))
    : 6;

  if (!userId) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "A valid user is required."));
  }

  const items = await NutritionLogItem.findAll({
    where: { userId },
    order: [["createDate", "DESC"]],
    limit: 100
  });
  const seen = new Set();
  const recent = [];

  for (const model of items) {
    const item = model.toJSON();
    const key =
      item.source === "open_food_facts"
        ? `product:${item.externalFoodId}`
        : `estimate:${String(item.foodName).trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push({
      source: item.source,
      barcode: item.source === "open_food_facts" ? item.externalFoodId : null,
      name: item.foodName,
      brand: item.brand,
      imageUrl: item.imageUrl,
      portionDescription: item.portionDescription,
      originalDescription: item.originalDescription,
      servingGrams: item.servingGrams,
      nutritionComplete: true,
      lastLoggedAt: item.createDate
    });
    if (recent.length >= limit) break;
  }

  return res.status(200).json(successResponse(recent));
});

const getFavorites = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  if (!userId) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "A valid user is required."));
  }
  return res.status(200).json(
    successResponse(
      await NutritionFavorite.findAll({
        where: { userId },
        order: [["updateDate", "DESC"]]
      })
    )
  );
});

const addFavorite = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const barcode = String(req.body.barcode || "").trim();
  if (!userId || !/^\d{4,30}$/.test(barcode)) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "A valid barcode is required."));
  }

  let product;
  try {
    product = await getFoodByBarcode(barcode);
  } catch (error) {
    return res.status(503).json(
      errorResponse("FOOD_DATA_UNAVAILABLE", "Food product data is temporarily unavailable.")
    );
  }
  if (!product) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Food product was not found."));
  }

  const [favorite, created] = await NutritionFavorite.findOrCreate({
    where: { userId, barcode },
    defaults: {
      userId,
      barcode,
      name: product.name,
      brand: product.brand || null,
      imageUrl: product.imageUrl || null,
      servingGrams: product.servingGrams || null,
      nutritionPer100g: product.nutritionPer100g,
      nutritionComplete: product.nutritionComplete,
      source: "open_food_facts"
    }
  });

  if (!created) {
    await favorite.update({
      name: product.name,
      brand: product.brand || null,
      imageUrl: product.imageUrl || null,
      servingGrams: product.servingGrams || null,
      nutritionPer100g: product.nutritionPer100g,
      nutritionComplete: product.nutritionComplete
    });
  }
  return res.status(created ? 201 : 200).json(successResponse(favorite));
});

const deleteFavorite = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const barcode = String(req.params.barcode || "").trim();
  if (!userId || !barcode) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Favorite barcode is invalid."));
  }
  const favorite = await NutritionFavorite.findOne({ where: { userId, barcode } });
  if (!favorite) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Favorite was not found."));
  }
  const deleted = favorite.toJSON();
  await favorite.destroy();
  return res.status(200).json(successResponse(deleted));
});

const getToday = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const date = String(req.query.date || "").trim();

  if (!userId || !validDate(date)) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "A valid user and YYYY-MM-DD date are required.")
    );
  }

  const [profile, items] = await Promise.all([
    getProfile(userId),
    getTodayItems(userId, date)
  ]);
  const totals = sumNutrition(items);
  const sugarComplete = items.length === 0 || items.every((item) => item.sugar !== null);

  return res.status(200).json(
    successResponse({
      date,
      profile,
      configured: configuredProfile(profile),
      totals,
      remaining: {
        calories: profile
          ? Math.max(0, Number(profile.dailyCaloriesTarget || 0) - totals.calories)
          : null,
        protein: profile
          ? Math.max(0, Number(profile.dailyProteinTarget || 0) - totals.protein)
          : null
      },
      insight: buildDailyInsight(profile, totals, items.length),
      nutritionCompleteness: {
        sugarComplete
      },
      items
    })
  );
});

const deleteLogItem = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const itemId = Number(req.params.id);

  if (!userId || !Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Log item id is invalid."));
  }

  const item = await NutritionLogItem.findOne({
    where: { nutritionLogItemId: itemId, userId }
  });

  if (!item) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Nutrition log item was not found."));
  }

  const deleted = item.toJSON();
  await item.destroy();
  return res.status(200).json(successResponse(deleted));
});

module.exports = {
  addFavorite,
  addLogItem,
  deleteLogItem,
  deleteFavorite,
  estimateMeal,
  evaluateFoodProduct,
  getFavorites,
  getFoodProduct,
  getOwnProfile,
  getRecentFoods,
  getTargetSuggestion,
  getToday,
  searchFoodProducts,
  upsertOwnProfile,
  validateMealEstimateBody,
  validateReviewedNutrition
};
