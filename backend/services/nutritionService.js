const STATUS_RANK = {
  recommended: 0,
  neutral: 1,
  caution: 2,
  not_recommended: 3
};

function roundNutrition(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

function roundToIncrement(value, increment) {
  return Math.round(Number(value) / increment) * increment;
}

function nutritionGoalFromTrainingGoal(goal) {
  const normalized = String(goal || "").trim().toLowerCase();

  if (normalized === "muscle gain") return "muscle gain";
  if (normalized === "fat loss" || normalized === "weight loss") return "fat loss";
  return "maintenance";
}

function activityFactorForDays(trainingDaysPerWeek) {
  const days = Number(trainingDaysPerWeek);
  if (days <= 2) return 1.35;
  if (days <= 4) return 1.5;
  if (days <= 6) return 1.65;
  return 1.75;
}

function buildTargetSuggestion(
  traineeProfile,
  requestedGoal,
  workoutPlan,
  nutritionContext = {}
) {
  const profile = traineeProfile?.toJSON?.() || traineeProfile || {};
  const plan = workoutPlan?.toJSON?.() || workoutPlan || {};
  const missingFields = [];
  const age = Number(profile.age);
  const weight = Number(profile.weight);
  const height = Number(profile.height);
  const profileTrainingDays = Number(profile.trainingDaysPerWeek);
  const planTrainingDays = Number(plan.daysPerWeek);
  const trainingDaysPerWeek =
    Number.isFinite(planTrainingDays) && planTrainingDays >= 1 && planTrainingDays <= 7
      ? planTrainingDays
      : profileTrainingDays;
  const workoutDurationMinutes = Number(plan.durationMinutes);
  const trainingLevel = String(plan.level || profile.level || "").trim().toLowerCase();
  const biologicalSex = ["male", "female", "prefer_not_to_say"].includes(
    profile.biologicalSex
  )
    ? profile.biologicalSex
    : "prefer_not_to_say";
  const trainingGoal = plan.goal || profile.goal;
  const nutritionGoal =
    ["fat loss", "muscle gain", "maintenance"].includes(requestedGoal)
      ? requestedGoal
      : nutritionGoalFromTrainingGoal(trainingGoal);

  if (!Number.isFinite(age) || age < 10 || age > 100) missingFields.push("age");
  if (!Number.isFinite(weight) || weight < 30 || weight > 350) missingFields.push("weight");
  if (!Number.isFinite(height) || height < 100 || height > 250) missingFields.push("height");
  if (!Number.isFinite(trainingDaysPerWeek) || trainingDaysPerWeek < 1 || trainingDaysPerWeek > 7) {
    missingFields.push("trainingDaysPerWeek");
  }
  const inputs = {
    age: Number.isFinite(age) ? age : null,
    weight: Number.isFinite(weight) ? weight : null,
    height: Number.isFinite(height) ? height : null,
    trainingDaysPerWeek: Number.isFinite(trainingDaysPerWeek)
      ? trainingDaysPerWeek
      : null,
    biologicalSex: biologicalSex || null,
    trainingGoal: trainingGoal || null,
    trainingLevel: trainingLevel || null,
    nutritionGoal,
    nutritionContext,
    workoutPlan: plan.planId
      ? {
          planId: plan.planId,
          goal: plan.goal || null,
          level: plan.level || null,
          daysPerWeek: Number.isFinite(planTrainingDays) ? planTrainingDays : null,
          durationMinutes: Number.isFinite(workoutDurationMinutes)
            ? workoutDurationMinutes
            : null
        }
      : null
  };

  if (missingFields.length > 0) {
    return {
      canCalculate: false,
      missingFields,
      suggestedCalories: null,
      suggestedProtein: null,
      inputs,
      calculation: null,
      estimateNote: "Complete the missing profile fields to generate editable targets.",
      disclaimer: "General fitness guidance only; not medical advice."
    };
  }

  const sexConstant =
    biologicalSex === "male" ? 5 : biologicalSex === "female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;
  const baseActivityFactor = activityFactorForDays(trainingDaysPerWeek);
  const workoutDurationAdjustment =
    Number.isFinite(workoutDurationMinutes) && workoutDurationMinutes >= 75
      ? 0.08
      : Number.isFinite(workoutDurationMinutes) && workoutDurationMinutes >= 60
        ? 0.05
        : Number.isFinite(workoutDurationMinutes) && workoutDurationMinutes >= 45
          ? 0.02
          : 0;
  const trainingLevelAdjustment =
    trainingLevel === "advanced" ? 0.03 : trainingLevel === "intermediate" ? 0.015 : 0;
  const activityFactor = roundNutrition(
    baseActivityFactor + workoutDurationAdjustment + trainingLevelAdjustment
  );
  const goalMultiplier =
    nutritionGoal === "fat loss" ? 0.88 : nutritionGoal === "muscle gain" ? 1.08 : 1;
  const suggestedCalories = roundToIncrement(bmr * activityFactor * goalMultiplier, 25);
  const proteinPerKg =
    nutritionGoal === "fat loss" || nutritionGoal === "muscle gain" ? 1.8 : 1.6;
  const suggestedProtein = roundToIncrement(weight * proteinPerKg, 5);
  const sexLabel =
    biologicalSex === "prefer_not_to_say"
      ? "a sex-neutral midpoint estimate"
      : `the ${biologicalSex} Mifflin-St Jeor estimate`;

  return {
    canCalculate: true,
    missingFields: [],
    suggestedCalories,
    suggestedProtein,
    inputs,
    calculation: {
      method: "Mifflin-St Jeor",
      bmr: Math.round(bmr),
      baseActivityFactor,
      workoutDurationAdjustment,
      trainingLevelAdjustment,
      activityFactor,
      goalAdjustmentPercent:
        nutritionGoal === "fat loss" ? -12 : nutritionGoal === "muscle gain" ? 8 : 0,
      proteinGramsPerKg: proteinPerKg
    },
    estimateNote:
      `Suggested from ${sexLabel}, ${trainingDaysPerWeek} planned training days per week` +
      `${Number.isFinite(workoutDurationMinutes) ? ` at about ${workoutDurationMinutes} minutes per workout` : ""}, ` +
      `your ${nutritionGoal} goal, and a body weight of ${roundNutrition(weight)} kg. ` +
      "Targets are editable.",
    disclaimer: "General fitness guidance only; not medical advice."
  };
}

function normalizeComparable(value) {
  return String(value || "")
    .replace(/^[a-z]{2}:/i, "")
    .replace(/[-_]/g, " ")
    .trim()
    .toLowerCase();
}

const ALLERGEN_ALIASES = new Map([
  ["peanut", "peanut"],
  ["peanuts", "peanut"],
  ["tree nut", "tree nut"],
  ["tree nuts", "tree nut"],
  ["nut", "tree nut"],
  ["nuts", "tree nut"],
  ["milk", "milk"],
  ["dairy", "milk"],
  ["egg", "egg"],
  ["eggs", "egg"],
  ["soy", "soy"],
  ["soya", "soy"],
  ["wheat", "wheat"],
  ["gluten", "gluten"],
  ["sesame", "sesame"],
  ["fish", "fish"],
  ["shellfish", "shellfish"]
]);

function normalizeAllergen(value) {
  const normalized = normalizeComparable(value);
  return ALLERGEN_ALIASES.get(normalized) || normalized;
}

function calculatePortionNutrition(product, servingGrams) {
  const factor = Number(servingGrams) / 100;
  const per100g = product.nutritionPer100g;

  return {
    calories: roundNutrition(per100g.calories * factor),
    protein: roundNutrition(per100g.protein * factor),
    carbs: roundNutrition(per100g.carbs * factor),
    fat: roundNutrition(per100g.fat * factor),
    sugar:
      per100g.sugar === null
        ? null
        : roundNutrition(per100g.sugar * factor)
  };
}

function sumNutrition(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (totals, item) => ({
      calories: roundNutrition(totals.calories + Number(item.calories || 0)),
      protein: roundNutrition(totals.protein + Number(item.protein || 0)),
      carbs: roundNutrition(totals.carbs + Number(item.carbs || 0)),
      fat: roundNutrition(totals.fat + Number(item.fat || 0)),
      sugar:
        totals.sugar === null && item.sugar === null
          ? null
          : roundNutrition(Number(totals.sugar || 0) + Number(item.sugar || 0))
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null }
  );
}

function addNutrition(totals, portion) {
  return {
    calories: roundNutrition(totals.calories + portion.calories),
    protein: roundNutrition(totals.protein + portion.protein),
    carbs: roundNutrition(totals.carbs + portion.carbs),
    fat: roundNutrition(totals.fat + portion.fat),
    sugar:
      totals.sugar === null && portion.sugar === null
        ? null
        : roundNutrition(Number(totals.sugar || 0) + Number(portion.sugar || 0))
  };
}

function findAllergenMatches(userAllergies, foodAllergens) {
  const normalizedFoodAllergens = new Set(
    (foodAllergens || []).map(normalizeAllergen).filter(Boolean)
  );

  return (userAllergies || [])
    .map(normalizeAllergen)
    .filter(Boolean)
    .filter((allergy) => normalizedFoodAllergens.has(allergy));
}

function atLeastStatus(currentStatus, minimumStatus) {
  return STATUS_RANK[currentStatus] >= STATUS_RANK[minimumStatus]
    ? currentStatus
    : minimumStatus;
}

function applySafetyRules({
  aiGuidance,
  food,
  nutritionProfile,
  projectedTotals
}) {
  const warnings = [];
  const allergenMatches = findAllergenMatches(
    nutritionProfile.allergies,
    food.allergens
  );
  let status = STATUS_RANK[aiGuidance?.status] === undefined
    ? "neutral"
    : aiGuidance.status;
  let explanation =
    aiGuidance?.explanation ||
    "This food was assessed from its logged nutrition values and your current daily totals.";
  let practicalSuggestion =
    aiGuidance?.practicalSuggestion ||
    "Keep the portion aligned with your remaining calorie and protein targets.";

  if (allergenMatches.length > 0) {
    status = "not_recommended";
    warnings.push(`Allergen match: ${allergenMatches.join(", ")}.`);
    explanation =
      "This product lists an allergen that matches your nutrition profile.";
    practicalSuggestion =
      "Do not add this product unless the allergen information has been reviewed by a qualified professional.";
  } else if (
    Array.isArray(nutritionProfile.allergies) &&
    nutritionProfile.allergies.length > 0 &&
    !food.allergensKnown
  ) {
    status = atLeastStatus(status, "caution");
    warnings.push("Open Food Facts does not provide complete allergen data for this product.");
  }

  if (
    Number(nutritionProfile.dailyCaloriesTarget) > 0 &&
    projectedTotals.calories > Number(nutritionProfile.dailyCaloriesTarget)
  ) {
    status = atLeastStatus(status, "caution");
    warnings.push("This portion would exceed your daily calorie target.");
  }

  return {
    status,
    explanation,
    practicalSuggestion,
    warnings
  };
}

function buildDailyInsight(profile, totals, itemCount = 0) {
  if (!profile) {
    return {
      type: "neutral",
      text: "Set calorie and protein targets to unlock a personalized daily summary.",
      action: "Complete your nutrition profile."
    };
  }

  const caloriesRemaining = Math.max(
    0,
    Number(profile.dailyCaloriesTarget || 0) - totals.calories
  );
  const proteinRemaining = Math.max(
    0,
    Number(profile.dailyProteinTarget || 0) - totals.protein
  );

  const calorieTarget = Number(profile.dailyCaloriesTarget || 0);
  const proteinTarget = Number(profile.dailyProteinTarget || 0);
  const caloriePercent = calorieTarget > 0 ? totals.calories / calorieTarget : 0;
  const proteinPercent = proteinTarget > 0 ? totals.protein / proteinTarget : 0;

  if (itemCount === 0) {
    return {
      type: "neutral",
      text: "No foods logged yet today.",
      action: "Search for a packaged food to begin your daily summary."
    };
  }

  if (totals.calories > calorieTarget) {
    return {
      type: "attention",
      text: "You are above today’s calorie target.",
      action: "Keep the rest of the day lighter and focus on balanced choices."
    };
  }

  if (caloriePercent >= 0.85) {
    return {
      type: "attention",
      text: "You are close to today’s calorie target.",
      action: proteinRemaining > 0
        ? "Choose a lighter, protein-focused option next."
        : "Choose lighter portions for the rest of the day."
    };
  }

  if (proteinPercent < 0.7 && proteinRemaining > 20) {
    return {
      type: "attention",
      text: "Protein is still low today.",
      action: `Prefer a high-protein option next; ${roundNutrition(proteinRemaining)}g remains.`
    };
  }

  if (proteinRemaining <= 0) {
    return {
      type: "positive",
      text: "You have reached today’s protein target.",
      action: `${roundNutrition(caloriesRemaining)} calories remain for balanced food choices.`
    };
  }

  return {
    type: "positive",
    text: "Today’s nutrition is progressing steadily.",
    action: `${roundNutrition(caloriesRemaining)} calories and ${roundNutrition(proteinRemaining)}g protein remain.`
  };
}

module.exports = {
  addNutrition,
  applySafetyRules,
  buildTargetSuggestion,
  buildDailyInsight,
  calculatePortionNutrition,
  findAllergenMatches,
  roundNutrition,
  sumNutrition
};
