const { NutritionLogItem, NutritionProfile } = require("../models");
const { generateNutritionGuidance } = require("./aiService");
const { getFoodByBarcode } = require("./openFoodFactsService");
const {
  addNutrition,
  applySafetyRules,
  buildFoodQualityAssessment,
  buildPortionGuidance,
  calculatePortionNutrition,
  findAllergenMatches,
  sumNutrition
} = require("./nutritionService");
const { createEvaluationSnapshot } = require("./nutritionEvaluationStore");
const { buildNutritionistContext } = require("./aiSpecialistContextService");
const {
  attachRulesToContext,
  buildSpecialistRules
} = require("./aiSpecialistRuleService");
const { resolveNutritionist } = require("./specialistResolutionService");

// Food evaluation workflow: deterministic quality/safety assessment first, AI
// guidance only for ambiguous cases, and a snapshot fingerprinted against the
// nutrition profile version and the day's log so a later "add to log" can
// detect staleness. Controllers keep HTTP shaping only.

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
  const qualityAssessment = buildFoodQualityAssessment({
    food,
    nutritionProfile: profileData,
    currentTotals,
    portionNutrition,
    projectedTotals,
    servingGrams
  });
  let aiGuidance = null;
  let aiAvailable = false;
  let guidanceSource = "deterministic";

  if (allergenMatches.length > 0) {
    guidanceSource = "safety_override";
  } else if (qualityAssessment.shouldSkipAi && qualityAssessment.guidance) {
    aiGuidance = qualityAssessment.guidance;
    guidanceSource = "deterministic_quality";
  } else {
    try {
      const [specialist, specialistContext] = await Promise.all([
        resolveNutritionist(userId),
        buildNutritionistContext(userId)
      ]);
      const specialistData = specialist?.toJSON?.() || specialist || null;
      const expertRules = buildSpecialistRules({
        specialist: specialistData,
        specialistContext
      });
      aiGuidance = await generateNutritionGuidance({
        food,
        portionNutrition,
        currentTotals,
        projectedTotals,
        nutritionProfile: profileData,
        specialist: specialistData,
        specialistContext: attachRulesToContext(specialistContext, expertRules)
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
      projectedTotals,
      qualityAssessment
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

module.exports = {
  configuredProfile,
  dailyLogFingerprint,
  evaluateFood,
  getProfile,
  getTodayItems,
  profileVersion
};
