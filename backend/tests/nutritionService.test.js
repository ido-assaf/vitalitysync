const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applySafetyRules,
  buildDailyInsight,
  buildFoodQualityAssessment,
  buildPortionGuidance,
  buildTargetSuggestion,
  calculatePortionNutrition,
  findAllergenMatches,
  sumNutrition
} = require("../services/nutritionService");

test("builds editable calorie and protein targets from a complete trainee profile", () => {
  const suggestion = buildTargetSuggestion({
    age: 24,
    weight: 72,
    height: 178,
    biologicalSex: "male",
    trainingDaysPerWeek: 4,
    goal: "muscle gain"
  });

  assert.equal(suggestion.canCalculate, true);
  assert.equal(suggestion.suggestedCalories, 2775);
  assert.equal(suggestion.suggestedProtein, 130);
  assert.equal(suggestion.calculation.activityFactor, 1.5);
  assert.equal(suggestion.calculation.goalAdjustmentPercent, 8);
});

test("supports the neutral formula and maintenance mapping", () => {
  const suggestion = buildTargetSuggestion({
    age: 30,
    weight: 80,
    height: 180,
    biologicalSex: "prefer_not_to_say",
    trainingDaysPerWeek: 3,
    goal: "strength"
  });

  assert.equal(suggestion.canCalculate, true);
  assert.equal(suggestion.inputs.nutritionGoal, "maintenance");
  assert.equal(suggestion.suggestedProtein, 130);
  assert.match(suggestion.estimateNote, /sex-neutral/);
});

test("uses the neutral formula when biological sex is not stored", () => {
  const suggestion = buildTargetSuggestion({
    age: 30,
    weight: 80,
    height: 180,
    trainingDaysPerWeek: 3,
    goal: "maintenance"
  });

  assert.equal(suggestion.canCalculate, true);
  assert.equal(suggestion.inputs.biologicalSex, "prefer_not_to_say");
  assert.match(suggestion.estimateNote, /sex-neutral/);
});

test("returns missing fields instead of arbitrary target defaults", () => {
  const suggestion = buildTargetSuggestion({
    goal: "fat loss",
    trainingDaysPerWeek: 4
  });

  assert.equal(suggestion.canCalculate, false);
  assert.deepEqual(suggestion.missingFields, [
    "age",
    "weight",
    "height"
  ]);
  assert.equal(suggestion.suggestedCalories, null);
  assert.equal(suggestion.suggestedProtein, null);
});

test("rejects non-metric body values instead of guessing units", () => {
  const suggestion = buildTargetSuggestion({
    age: 25,
    weight: 182,
    height: 78,
    biologicalSex: "male",
    trainingDaysPerWeek: 3,
    goal: "muscle gain"
  });

  assert.equal(suggestion.canCalculate, false);
  assert.deepEqual(suggestion.missingFields, ["height"]);
  assert.equal(suggestion.inputs.weight, 182);
  assert.equal(suggestion.inputs.height, 78);
});

test("uses the latest workout plan frequency, duration, level, and goal when available", () => {
  const withoutPlan = buildTargetSuggestion({
    age: 30,
    weight: 75,
    height: 178,
    biologicalSex: "male",
    trainingDaysPerWeek: 2,
    level: "beginner",
    goal: "maintenance"
  });
  const withPlan = buildTargetSuggestion(
    {
      age: 30,
      weight: 75,
      height: 178,
      biologicalSex: "male",
      trainingDaysPerWeek: 2,
      level: "beginner",
      goal: "maintenance"
    },
    "",
    {
      planId: 12,
      daysPerWeek: 5,
      durationMinutes: 60,
      level: "intermediate",
      goal: "muscle gain"
    },
    {
      dietaryPreferences: ["high protein"],
      allergies: ["milk"],
      medicalRestrictions: [],
      additionalContext: "Keep energy stable"
    }
  );

  assert.equal(withPlan.canCalculate, true);
  assert.equal(withPlan.inputs.trainingDaysPerWeek, 5);
  assert.equal(withPlan.inputs.nutritionGoal, "muscle gain");
  assert.equal(withPlan.inputs.workoutPlan.planId, 12);
  assert.deepEqual(withPlan.inputs.nutritionContext, {
    dietaryPreferences: ["high protein"],
    allergies: ["milk"],
    medicalRestrictions: [],
    additionalContext: "Keep energy stable"
  });
  assert.equal(withPlan.calculation.workoutDurationAdjustment, 0.05);
  assert.equal(withPlan.calculation.trainingLevelAdjustment, 0.015);
  assert.ok(withPlan.suggestedCalories > withoutPlan.suggestedCalories);
  assert.match(withPlan.estimateNote, /5 planned training days/);
});

test("calculates portion values from trusted per-100g data", () => {
  const portion = calculatePortionNutrition(
    {
      nutritionPer100g: {
        calories: 200,
        protein: 10,
        carbs: 30,
        fat: 5,
        sugar: 12
      }
    },
    50
  );

  assert.deepEqual(portion, {
    calories: 100,
    protein: 5,
    carbs: 15,
    fat: 2.5,
    sugar: 6
  });
});

test("sums persisted daily nutrition snapshots", () => {
  assert.deepEqual(
    sumNutrition([
      { calories: 100, protein: 5, carbs: 10, fat: 2, sugar: null },
      { calories: 250, protein: 20, carbs: 25, fat: 8, sugar: 5 }
    ]),
    { calories: 350, protein: 25, carbs: 35, fat: 10, sugar: 5 }
  );
});

test("allergen matching normalizes Open Food Facts tags", () => {
  assert.deepEqual(
    findAllergenMatches(["Peanuts", "Milk"], ["en:milk", "en:tree-nuts"]),
    ["milk"]
  );
});

test("allergen matching does not use unsafe partial-string matches", () => {
  assert.deepEqual(
    findAllergenMatches(["nut"], ["en:coconut"]),
    []
  );
});

test("allergen matches force not recommended regardless of AI output", () => {
  const result = applySafetyRules({
    aiGuidance: {
      status: "recommended",
      explanation: "Looks suitable.",
      practicalSuggestion: "Enjoy it."
    },
    food: {
      allergens: ["milk"],
      allergensKnown: true
    },
    nutritionProfile: {
      allergies: ["milk"],
      dailyCaloriesTarget: 2000
    },
    projectedTotals: {
      calories: 1000
    }
  });

  assert.equal(result.status, "not_recommended");
  assert.match(result.warnings[0], /Allergen match/);
});

test("missing allergen data and calorie excess cannot be downgraded by AI", () => {
  const result = applySafetyRules({
    aiGuidance: {
      status: "recommended",
      explanation: "Looks suitable.",
      practicalSuggestion: "Enjoy it."
    },
    food: {
      allergens: [],
      allergensKnown: false
    },
    nutritionProfile: {
      allergies: ["peanuts"],
      dailyCaloriesTarget: 1800
    },
    projectedTotals: {
      calories: 1900
    }
  });

  assert.equal(result.status, "caution");
  assert.equal(result.warnings.length, 2);
});

test("deterministic quality rules override an overly positive AI result", () => {
  const qualityAssessment = {
    guidance: {
      status: "caution",
      explanation: "This is a treat-style portion.",
      practicalSuggestion: "Keep it smaller and add protein later."
    },
    warnings: ["This treat-style portion is high in sugar or fat."]
  };
  const result = applySafetyRules({
    aiGuidance: {
      status: "recommended",
      explanation: "Looks suitable.",
      practicalSuggestion: "Enjoy it."
    },
    food: {
      allergens: [],
      allergensKnown: true
    },
    nutritionProfile: {
      allergies: [],
      dailyCaloriesTarget: 2400
    },
    projectedTotals: {
      calories: 800
    },
    qualityAssessment
  });

  assert.equal(result.status, "caution");
  assert.equal(result.explanation, "This is a treat-style portion.");
  assert.match(result.warnings[0], /treat-style/);
});

test("portion guidance accepts a selected portion that fits calories", () => {
  const food = {
    allergens: [],
    nutritionPer100g: { calories: 120, protein: 12, carbs: 10, fat: 3, sugar: 4 }
  };
  const portionNutrition = calculatePortionNutrition(food, 150);
  const guidance = buildPortionGuidance({
    food,
    nutritionProfile: { dailyCaloriesTarget: 2000, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 1000, protein: 80 },
    portionNutrition,
    projectedTotals: { calories: 1180, protein: 98 },
    servingGrams: 150
  });

  assert.equal(guidance.decision, "ok_now");
  assert.match(guidance.message, /fits your targets/);
});

test("portion guidance allows a small protein surplus when calories fit", () => {
  const food = {
    allergens: [],
    nutritionPer100g: { calories: 150, protein: 30, carbs: 4, fat: 2, sugar: 1 }
  };
  const portionNutrition = calculatePortionNutrition(food, 100);
  const guidance = buildPortionGuidance({
    food,
    nutritionProfile: { dailyCaloriesTarget: 2200, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 1600, protein: 112 },
    portionNutrition,
    projectedTotals: { calories: 1750, protein: 142 },
    servingGrams: 100
  });

  assert.equal(guidance.decision, "ok_now");
});

test("portion guidance suggests a smaller amount when calories are close", () => {
  const food = {
    allergens: [],
    nutritionPer100g: { calories: 260, protein: 12, carbs: 28, fat: 10, sugar: 5 }
  };
  const portionNutrition = calculatePortionNutrition(food, 200);
  const guidance = buildPortionGuidance({
    food,
    nutritionProfile: { goal: "maintenance", dailyCaloriesTarget: 2000, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 1750, protein: 90 },
    portionNutrition,
    projectedTotals: { calories: 2270, protein: 114 },
    servingGrams: 200
  });

  assert.equal(guidance.decision, "reduce_portion");
  assert.equal(guidance.suggestedServingGrams, 95);
  assert.equal(guidance.suggestedPortionNutrition.calories, 247);
});

test("portion guidance does not scale high-calorie low-protein foods absurdly", () => {
  const food = {
    allergens: [],
    nutritionPer100g: { calories: 540, protein: 4, carbs: 60, fat: 30, sugar: 52 }
  };
  const portionNutrition = calculatePortionNutrition(food, 200);
  const guidance = buildPortionGuidance({
    food,
    nutritionProfile: { goal: "maintenance", dailyCaloriesTarget: 2400, dailyProteinTarget: 140, allergies: [] },
    currentTotals: { calories: 1000, protein: 40 },
    portionNutrition,
    projectedTotals: { calories: 2080, protein: 48 },
    servingGrams: 200
  });

  assert.equal(guidance.decision, "reduce_portion");
  assert.match(guidance.message, /realistic treat portion/);
  assert.equal(guidance.suggestedServingGrams, 30);
  assert.equal(guidance.suggestedPortionNutrition.calories, 162);
});

test("portion guidance rejects 400g chocolate as first food and suggests one serving", () => {
  const food = {
    name: "Chocolate chocolate chocolate, dark chocolate nonpareils",
    brand: "Chocolate Chocolate Chocolate",
    ingredients: "Dark chocolate, sugar, cocoa butter, milk fat, vegetable oil, corn starch.",
    servingGrams: 40,
    allergens: [],
    nutritionPer100g: { calories: 500, protein: 0, carbs: 62.5, fat: 27.5, sugar: 50 }
  };
  const portionNutrition = calculatePortionNutrition(food, 400);
  const quality = buildFoodQualityAssessment({
    food,
    nutritionProfile: { goal: "muscle gain", dailyCaloriesTarget: 3050, dailyProteinTarget: 155, allergies: [] },
    currentTotals: { calories: 0, protein: 0 },
    portionNutrition,
    projectedTotals: { calories: 2000, protein: 0 },
    servingGrams: 400
  });
  const guidance = buildPortionGuidance({
    food,
    nutritionProfile: { goal: "muscle gain", dailyCaloriesTarget: 3050, dailyProteinTarget: 155, allergies: [] },
    currentTotals: { calories: 0, protein: 0 },
    portionNutrition,
    projectedTotals: { calories: 2000, protein: 0 },
    servingGrams: 400
  });

  assert.equal(quality.shouldSkipAi, true);
  assert.equal(quality.guidance.status, "not_recommended");
  assert.equal(guidance.decision, "reduce_portion");
  assert.equal(guidance.suggestedServingGrams, 40);
});

test("small chocolate portions can fit as a treat without an AI call", () => {
  const food = {
    name: "Dark chocolate",
    servingGrams: 30,
    allergens: [],
    nutritionPer100g: { calories: 540, protein: 4, carbs: 45, fat: 35, sugar: 38 }
  };
  const portionNutrition = calculatePortionNutrition(food, 30);
  const quality = buildFoodQualityAssessment({
    food,
    nutritionProfile: { goal: "maintenance", dailyCaloriesTarget: 2200, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 300, protein: 25 },
    portionNutrition,
    projectedTotals: { calories: 462, protein: 26.2 },
    servingGrams: 30
  });
  const guidance = buildPortionGuidance({
    food,
    nutritionProfile: { goal: "maintenance", dailyCaloriesTarget: 2200, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 300, protein: 25 },
    portionNutrition,
    projectedTotals: { calories: 462, protein: 26.2 },
    servingGrams: 30
  });

  assert.equal(quality.shouldSkipAi, true);
  assert.equal(quality.guidance.status, "neutral");
  assert.equal(guidance.decision, "ok_now");
  assert.match(guidance.message, /small treat/);
});

test("balanced protein foods are handled deterministically", () => {
  const food = {
    name: "Protein Yogurt",
    allergens: [],
    nutritionPer100g: { calories: 80, protein: 10, carbs: 6, fat: 2, sugar: 4 }
  };
  const portionNutrition = calculatePortionNutrition(food, 150);
  const quality = buildFoodQualityAssessment({
    food,
    nutritionProfile: { goal: "maintenance", dailyCaloriesTarget: 2000, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 400, protein: 35 },
    portionNutrition,
    projectedTotals: { calories: 520, protein: 50 },
    servingGrams: 150
  });

  assert.equal(quality.shouldSkipAi, true);
  assert.equal(quality.guidance.status, "recommended");
});

test("portion guidance handles exceeded calories and allergens non-judgmentally", () => {
  const food = {
    allergens: ["milk"],
    nutritionPer100g: { calories: 100, protein: 8, carbs: 10, fat: 2, sugar: 5 }
  };
  const portionNutrition = calculatePortionNutrition(food, 100);
  const allergenGuidance = buildPortionGuidance({
    food,
    nutritionProfile: { dailyCaloriesTarget: 2000, dailyProteinTarget: 120, allergies: ["milk"] },
    currentTotals: { calories: 1000, protein: 60 },
    portionNutrition,
    projectedTotals: { calories: 1100, protein: 68 },
    servingGrams: 100
  });
  const exceededGuidance = buildPortionGuidance({
    food: { ...food, allergens: [] },
    nutritionProfile: { dailyCaloriesTarget: 2000, dailyProteinTarget: 120, allergies: [] },
    currentTotals: { calories: 2050, protein: 100 },
    portionNutrition,
    projectedTotals: { calories: 2150, protein: 108 },
    servingGrams: 100
  });

  assert.equal(allergenGuidance.decision, "better_not_today");
  assert.equal(exceededGuidance.decision, "better_not_today");
  assert.match(exceededGuidance.message, /may not fit well today/);
});

test("daily insight prioritizes empty, exceeded, close, low-protein, and reached states", () => {
  const profile = { dailyCaloriesTarget: 2000, dailyProteinTarget: 120 };

  assert.equal(
    buildDailyInsight(profile, { calories: 0, protein: 0 }, 0).type,
    "neutral"
  );
  assert.match(
    buildDailyInsight(profile, { calories: 2100, protein: 100 }, 2).text,
    /above/
  );
  assert.match(
    buildDailyInsight(profile, { calories: 1800, protein: 50 }, 2).text,
    /close/
  );
  assert.match(
    buildDailyInsight(profile, { calories: 1000, protein: 40 }, 2).text,
    /Protein is still low/
  );
  assert.equal(
    buildDailyInsight(profile, { calories: 1400, protein: 125 }, 2).type,
    "positive"
  );
});
