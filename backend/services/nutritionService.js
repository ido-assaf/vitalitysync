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

const TREAT_FOOD_TERMS = [
  "chocolate",
  "candy",
  "sweet",
  "sweets",
  "cookie",
  "cookies",
  "biscuit",
  "brownie",
  "cake",
  "donut",
  "doughnut",
  "ice cream",
  "dessert",
  "confection",
  "nougat",
  "wafer",
  "caramel",
  "toffee"
];

function foodText(food) {
  return `${food?.name || ""} ${food?.brand || ""} ${food?.ingredients || ""}`.toLowerCase();
}

function isTreatLikeFood(food, per100g) {
  const text = foodText(food);
  const matchedTreatTerm = TREAT_FOOD_TERMS.some((term) => text.includes(term));
  const calories = Number(per100g?.calories || 0);
  const sugar = Number(per100g?.sugar || 0);
  const fat = Number(per100g?.fat || 0);

  return matchedTreatTerm || (calories >= 400 && sugar >= 25 && fat >= 20);
}

function practicalServingCap(food, fallbackGrams) {
  const listedServing = Number(food?.servingGrams);

  if (Number.isFinite(listedServing) && listedServing >= 10 && listedServing <= 250) {
    return roundToIncrement(listedServing, 5);
  }

  return fallbackGrams;
}

function guidanceWithPortionNutrition(food, guidance, suggestedServingGrams) {
  const { selectedGrams, ...publicGuidance } = guidance;

  return {
    ...publicGuidance,
    suggestedServingGrams,
    suggestedPortionNutrition:
      suggestedServingGrams && suggestedServingGrams < Number(guidance.selectedGrams || Infinity)
        ? calculatePortionNutrition(food, suggestedServingGrams)
        : null
  };
}

function buildFoodQualityAssessment({
  food,
  nutritionProfile,
  currentTotals,
  portionNutrition,
  projectedTotals,
  servingGrams
}) {
  const per100g = food?.nutritionPer100g || {};
  const selectedGrams = Number(servingGrams);
  const selectedCalories = Number(portionNutrition?.calories || 0);
  const selectedProtein = Number(portionNutrition?.protein || 0);
  const selectedFat = Number(portionNutrition?.fat || 0);
  const selectedSugar =
    portionNutrition?.sugar === null || portionNutrition?.sugar === undefined
      ? null
      : Number(portionNutrition.sugar);
  const goal = String(nutritionProfile?.goal || "").trim().toLowerCase();
  const caloriesPer100g = Number(per100g.calories || 0);
  const sugarPer100g =
    per100g.sugar === null || per100g.sugar === undefined ? null : Number(per100g.sugar);
  const fatPer100g = Number(per100g.fat || 0);
  const calorieTarget = Number(nutritionProfile?.dailyCaloriesTarget || 0);
  const proteinTarget = Number(nutritionProfile?.dailyProteinTarget || 0);
  const currentCalories = Number(currentTotals?.calories || 0);
  const currentProtein = Number(currentTotals?.protein || 0);
  const projectedCalories = Number(projectedTotals?.calories || 0);
  const proteinRemaining = Math.max(0, proteinTarget - currentProtein);
  const proteinPer100Calories =
    selectedCalories > 0 ? (selectedProtein / selectedCalories) * 100 : 0;
  const treatLike = isTreatLikeFood(food, per100g);
  const highCalorieDensity = caloriesPer100g >= 350;
  const highSugarDensity = sugarPer100g !== null && sugarPer100g >= 20;
  const highFatDensity = fatPer100g >= 20;
  const lowProteinForCalories = selectedCalories >= 150 && proteinPer100Calories < 3;
  const mostlyEmptyDay =
    calorieTarget > 0 &&
    proteinTarget > 0 &&
    currentCalories < calorieTarget * 0.15 &&
    currentProtein < proteinTarget * 0.15;
  const treatCalorieThreshold =
    goal === "fat loss" ? 225 : goal === "muscle gain" ? 300 : 275;
  const denseSnackCalorieThreshold =
    goal === "fat loss" ? 225 : goal === "muscle gain" ? 325 : 300;
  const treatServing = practicalServingCap(food, 30);
  const denseSnackServing = practicalServingCap(food, highCalorieDensity ? 60 : 150);
  const treatPortionTooLarge =
    treatLike &&
    selectedGrams > treatServing * 1.5 &&
    (selectedCalories >= treatCalorieThreshold || selectedSugar >= 25 || selectedFat >= 18);
  const extremeTreatPortion =
    treatLike &&
    (selectedGrams >= treatServing * 3 ||
      selectedCalories >= 700 ||
      selectedSugar >= 60 ||
      selectedFat >= 45);
  const qualityWarnings = [];

  if (extremeTreatPortion) {
    qualityWarnings.push("This is a very large treat-style portion for one eating occasion.");
    return {
      confidence: "clear",
      shouldSkipAi: true,
      guidance: {
        status: "not_recommended",
        explanation:
          "This portion is very large for a treat-style food and is high in sugar or fat while adding little protein.",
        practicalSuggestion:
          "Log it if you ate it, but a nutritionist-style choice would be a much smaller serving and a protein-rich meal or snack alongside the rest of your day."
      },
      warnings: qualityWarnings,
      portionGuidance: guidanceWithPortionNutrition(
        food,
        {
          decision: "reduce_portion",
          label: "Use a treat-size portion",
          message:
            "This is much larger than a realistic treat portion, even if the calories technically fit today.",
          selectedGrams
        },
        Math.min(treatServing, selectedGrams)
      )
    };
  }

  if (treatPortionTooLarge) {
    qualityWarnings.push("This treat-style portion is high in sugar or fat for the amount of protein it provides.");
    return {
      confidence: "clear",
      shouldSkipAi: true,
      guidance: {
        status: "caution",
        explanation:
          "This can fit only as a treat-style choice; the portion is high in sugar or fat compared with its protein contribution.",
        practicalSuggestion:
          "Keep it closer to a single serving and anchor the rest of the day around lean protein, fruit or vegetables, and less calorie-dense foods."
      },
      warnings: qualityWarnings,
      portionGuidance: guidanceWithPortionNutrition(
        food,
        {
          decision: "reduce_portion",
          label: "Use a treat-size portion",
          message:
            "This food is better treated as a small snack or dessert than as a main calorie source.",
          selectedGrams
        },
        Math.min(treatServing, selectedGrams)
      )
    };
  }

  if (treatLike && selectedCalories <= 250 && selectedGrams <= treatServing * 1.25) {
    return {
      confidence: "clear",
      shouldSkipAi: true,
      guidance: {
        status: "neutral",
        explanation:
          "This is a treat-style food, but the selected portion is modest enough to fit as an occasional snack.",
        practicalSuggestion:
          mostlyEmptyDay || proteinRemaining > 20
            ? "Keep it small and make the next choice protein-forward so today does not start mostly from sugar and fat."
            : "Keep the rest of the day balanced and avoid turning this into a larger portion."
      },
      warnings: [],
      portionGuidance: emptyPortionGuidance(
        "ok_now",
        "Small treat portion",
        "This portion can fit as a small treat, but it should not replace a balanced meal."
      )
    };
  }

  if (
    highCalorieDensity &&
    lowProteinForCalories &&
    (selectedCalories >= denseSnackCalorieThreshold || projectedCalories > calorieTarget * 0.75)
  ) {
    qualityWarnings.push("This portion is calorie-dense and low in protein.");
    return {
      confidence: "clear",
      shouldSkipAi: true,
      guidance: {
        status: "caution",
        explanation:
          "This portion is calorie-dense and low in protein, so it is not a strong fit while protein is still low today.",
        practicalSuggestion:
          "Choose a smaller amount or pair a modest portion with a protein-rich food instead of using it as a main meal."
      },
      warnings: qualityWarnings,
      portionGuidance: guidanceWithPortionNutrition(
        food,
        {
          decision: "reduce_portion",
          label: "Consider a smaller portion",
          message:
            "This portion fits calories poorly for its protein return, especially while protein is still low.",
          selectedGrams
        },
        Math.min(denseSnackServing, selectedGrams)
      )
    };
  }

  if (
    selectedProtein >= 10 &&
    proteinPer100Calories >= 5 &&
    selectedCalories <= 450 &&
    !highSugarDensity &&
    fatPer100g < 18
  ) {
    return {
      confidence: "clear",
      shouldSkipAi: true,
      guidance: {
        status: "recommended",
        explanation:
          "This portion provides meaningful protein for its calories and does not raise obvious sugar or fat concerns.",
        practicalSuggestion:
          "Use it as part of a balanced meal or snack and keep tracking the rest of your day."
      },
      warnings: [],
      portionGuidance: null
    };
  }

  return {
    confidence: "ambiguous",
    shouldSkipAi: false,
    guidance: null,
    warnings: [],
    portionGuidance: null
  };
}

function emptyPortionGuidance(decision, label, message) {
  return {
    decision,
    label,
    message,
    suggestedServingGrams: null,
    suggestedPortionNutrition: null
  };
}

function buildPortionGuidance({
  food,
  nutritionProfile,
  currentTotals,
  portionNutrition,
  projectedTotals,
  servingGrams
}) {
  const calorieTarget = Number(nutritionProfile?.dailyCaloriesTarget || 0);
  const proteinTarget = Number(nutritionProfile?.dailyProteinTarget || 0);
  const selectedGrams = Number(servingGrams);
  const selectedCalories = Number(portionNutrition?.calories || 0);
  const selectedProtein = Number(portionNutrition?.protein || 0);
  const currentCalories = Number(currentTotals?.calories || 0);
  const currentProtein = Number(currentTotals?.protein || 0);
  const projectedCalories = Number(projectedTotals?.calories || 0);
  const projectedProtein = Number(projectedTotals?.protein || 0);
  const caloriesRemaining = calorieTarget - currentCalories;
  const proteinRemaining = Math.max(0, proteinTarget - currentProtein);
  const proteinPer100Calories =
    selectedCalories > 0 ? (selectedProtein / selectedCalories) * 100 : 0;
  const proteinFocused = selectedProtein >= 10 || proteinPer100Calories >= 5;
  const lowProteinForCalories = selectedCalories >= 250 && proteinPer100Calories < 3;
  const per100Calories = Number(food?.nutritionPer100g?.calories || 0);
  const highCalorieDensity = per100Calories >= 250;
  const qualityAssessment = buildFoodQualityAssessment({
    food,
    nutritionProfile,
    currentTotals,
    portionNutrition,
    projectedTotals,
    servingGrams
  });
  const allergenMatches = findAllergenMatches(
    nutritionProfile?.allergies,
    food?.allergens
  );

  if (allergenMatches.length > 0) {
    return emptyPortionGuidance(
      "better_not_today",
      "May not fit well today",
      "This product lists an allergen from your profile, so this portion may not fit well for you today."
    );
  }

  if (qualityAssessment.portionGuidance) {
    return qualityAssessment.portionGuidance;
  }

  if (!Number.isFinite(calorieTarget) || calorieTarget <= 0) {
    return emptyPortionGuidance(
      "ok_now",
      "Okay to eat now",
      "This portion can fit as general guidance, but set a calorie target for more precise feedback."
    );
  }

  if (caloriesRemaining <= 0) {
    return emptyPortionGuidance(
      "better_not_today",
      "May not fit well today",
      "You are already at or above today's calorie target, so this portion may not fit well today."
    );
  }

  if (projectedCalories <= calorieTarget) {
    if (
      lowProteinForCalories &&
      proteinRemaining > 20 &&
      selectedCalories > caloriesRemaining * 0.55
    ) {
      const suggestedServingGrams = Math.min(
        selectedGrams,
        highCalorieDensity ? 60 : 150
      );
      return {
        decision: "reduce_portion",
        label: "Consider a smaller portion",
        message:
          "This portion fits your calories, but it uses a lot of today's remaining room while protein is still low.",
        suggestedServingGrams:
          suggestedServingGrams < selectedGrams ? suggestedServingGrams : null,
        suggestedPortionNutrition:
          suggestedServingGrams < selectedGrams
            ? calculatePortionNutrition(food, suggestedServingGrams)
            : null
      };
    }

    const proteinNote =
      Number.isFinite(proteinTarget) &&
      proteinTarget > 0 &&
      projectedProtein > proteinTarget * 1.6 &&
      selectedProtein > 70
        ? " It is also a very high-protein portion, so a smaller amount may feel more practical."
        : "";

    return emptyPortionGuidance(
      "ok_now",
      "Okay to eat now",
      `This portion fits your targets well right now.${proteinNote}`
    );
  }

  const goal = String(nutritionProfile?.goal || "").trim().toLowerCase();
  const calorieCap =
    goal === "fat loss"
      ? proteinFocused ? 375 : 225
      : goal === "muscle gain"
        ? proteinFocused ? 500 : 350
        : proteinFocused ? 450 : 300;
  const gramCap = proteinFocused ? 250 : highCalorieDensity ? 60 : 150;
  const suggestedCalories = Math.min(caloriesRemaining, calorieCap);
  const rawSuggestedGrams =
    selectedCalories > 0 ? (selectedGrams * suggestedCalories) / selectedCalories : 0;
  const suggestedServingGrams = Math.min(
    roundToIncrement(rawSuggestedGrams, 5),
    gramCap,
    selectedGrams
  );

  if (
    !Number.isFinite(suggestedServingGrams) ||
    suggestedServingGrams < 15 ||
    suggestedServingGrams >= selectedGrams * 0.9
  ) {
    return emptyPortionGuidance(
      "better_not_today",
      "May not fit well today",
      "This portion would push you past today's calorie target, and a practical smaller amount may not fit well today."
    );
  }

  return {
    decision: "reduce_portion",
    label: "Consider a smaller portion",
    message:
      "This portion would put you over today's calorie target. A smaller amount of the same food may fit better.",
    suggestedServingGrams,
    suggestedPortionNutrition: calculatePortionNutrition(food, suggestedServingGrams)
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
  projectedTotals,
  qualityAssessment
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

  if (qualityAssessment?.guidance) {
    status = atLeastStatus(status, qualityAssessment.guidance.status);
    if (STATUS_RANK[qualityAssessment.guidance.status] >= STATUS_RANK[aiGuidance?.status || "recommended"]) {
      explanation = qualityAssessment.guidance.explanation;
      practicalSuggestion = qualityAssessment.guidance.practicalSuggestion;
    }
    warnings.push(...(qualityAssessment.warnings || []));
  }

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
  buildFoodQualityAssessment,
  buildPortionGuidance,
  buildTargetSuggestion,
  buildDailyInsight,
  calculatePortionNutrition,
  findAllergenMatches,
  roundNutrition,
  sumNutrition
};
