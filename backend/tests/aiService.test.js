const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractJson,
  normalizeMealEstimate,
  normalizeNutritionGuidance,
  normalizeNutritionTargets
} = require("../services/aiService");

test("accepts the constrained nutrition guidance schema", () => {
  assert.deepEqual(
    normalizeNutritionGuidance({
      status: "neutral",
      explanation: "This portion can fit today.",
      practicalSuggestion: "Balance it with a protein-rich meal."
    }),
    {
      status: "neutral",
      explanation: "This portion can fit today.",
      practicalSuggestion: "Balance it with a protein-rich meal."
    }
  );
});

test("rejects unsupported AI statuses", () => {
  assert.throws(
    () =>
      normalizeNutritionGuidance({
        status: "not_recommended",
        explanation: "No.",
        practicalSuggestion: "Avoid."
      }),
    /status is invalid/
  );
});

test("accepts Nutritionist AI targets only inside the validated baseline range", () => {
  assert.deepEqual(
    normalizeNutritionTargets(
      {
        dailyCalories: 2520,
        dailyProtein: 142,
        dietaryApproach: "Protein-forward balanced meals with carbohydrates around training.",
        mealGuidance: "Use three balanced meals and a protein-rich post-workout snack.",
        explanation: "Supports muscle gain and the current training schedule.",
        assumptions: ["Four planned workouts per week"]
      },
      {
        suggestedCalories: 2500,
        suggestedProtein: 140
      }
    ),
    {
      dailyCalories: 2525,
      dailyProtein: 140,
      dietaryApproach: "Protein-forward balanced meals with carbohydrates around training.",
      mealGuidance: "Use three balanced meals and a protein-rich post-workout snack.",
      explanation: "Supports muscle gain and the current training schedule.",
      assumptions: ["Four planned workouts per week"]
    }
  );

  assert.throws(
    () =>
      normalizeNutritionTargets(
        {
          dailyCalories: 500,
          dailyProtein: 20,
          dietaryApproach: "Unsafe.",
          mealGuidance: "Unsafe.",
          explanation: "Unsafe result.",
          assumptions: []
        },
        {
          suggestedCalories: 2500,
          suggestedProtein: 140
        }
      ),
    /outside the validated range/
  );
});

test("normalizes a strict homemade meal estimate", () => {
  assert.deepEqual(
    normalizeMealEstimate({
      mealName: "Stuffed chicken with potatoes",
      portionDescription: "Full plate",
      calories: 680,
      protein: 43.04,
      carbs: 58,
      fat: 26,
      sugar: 5,
      confidence: "medium",
      explanation: "Approximate recipe-based estimate.",
      assumptions: ["Moderate oil"],
      warnings: ["Values vary by recipe"]
    }),
    {
      mealName: "Stuffed chicken with potatoes",
      portionDescription: "Full plate",
      calories: 680,
      protein: 43,
      carbs: 58,
      fat: 26,
      sugar: 5,
      confidence: "medium",
      explanation: "Approximate recipe-based estimate.",
      assumptions: ["Moderate oil"],
      warnings: ["Values vary by recipe"]
    }
  );
});

test("meal estimate validation clamps impossible values and keeps nullable sugar", () => {
  const result = normalizeMealEstimate({
    mealName: "Large meal",
    portionDescription: "Large plate",
    calories: 9000,
    protein: 40,
    carbs: 90,
    fat: 30,
    sugar: null,
    confidence: "low",
    explanation: "Very uncertain estimate.",
    assumptions: [],
    warnings: []
  });

  assert.equal(result.calories, 5000);
  assert.equal(result.sugar, null);
  assert.match(result.warnings.join(" "), /adjusted/);
});

test("meal estimate normalization preserves Hebrew meal labels", () => {
  const result = normalizeMealEstimate({
    mealName: "שניצל עם אורז וסלט",
    portionDescription: "מנה בינונית",
    calories: 720,
    protein: 38,
    carbs: 76,
    fat: 28,
    sugar: 6,
    confidence: "medium",
    explanation: "הערכה כללית לפי תיאור המנה וגודל המנה.",
    assumptions: ["טיגון בכמות שמן בינונית"],
    warnings: ["הערכים משתנים לפי המתכון"]
  });

  assert.equal(result.mealName, "שניצל עם אורז וסלט");
  assert.equal(result.portionDescription, "מנה בינונית");
  assert.equal(result.confidence, "medium");
});

test("normalizes numeric strings, units, commas, approximations, and ranges", () => {
  const result = normalizeMealEstimate({
    mealName: "Family pizza",
    portionDescription: "Large plate",
    calories: "1,800-2,200 kcal",
    protein: "75g",
    carbs: "~210 g",
    fat: "82",
    sugar: "18 grams",
    confidence: "Medium",
    explanation: "Visual estimate.",
    assumptions: "Large shared pizza portion",
    warnings: "Recipe may vary"
  });

  assert.equal(result.calories, 2000);
  assert.equal(result.protein, 75);
  assert.equal(result.carbs, 210);
  assert.equal(result.fat, 82);
  assert.equal(result.sugar, 18);
  assert.equal(result.confidence, "medium");
  assert.deepEqual(result.assumptions, ["Large shared pizza portion"]);
  assert.match(result.warnings.join(" "), /midpoint/);
  assert.match(result.warnings.join(" "), /Units were removed/);
});

test("normalizes confidence aliases and defaults invalid confidence to low", () => {
  const moderate = normalizeMealEstimate({
    calories: 700,
    protein: 35,
    carbs: 80,
    fat: 25,
    sugar: null,
    confidence: "moderate"
  }, {
    description: "Chicken and rice",
    portionSize: "full_plate"
  });
  const invalid = normalizeMealEstimate({
    calories: 700,
    protein: 35,
    carbs: 80,
    fat: 25,
    sugar: null,
    confidence: "maybe"
  }, {
    portionSize: "large_plate"
  });

  assert.equal(moderate.confidence, "medium");
  assert.equal(moderate.mealName, "Chicken and rice");
  assert.equal(moderate.portionDescription, "Full plate");
  assert.match(moderate.warnings.join(" "), /normalized to medium/);
  assert.equal(invalid.confidence, "low");
  assert.equal(invalid.mealName, "Estimated meal");
  assert.equal(invalid.portionDescription, "Large plate");
  assert.match(invalid.warnings.join(" "), /normalized to low/);
});

test("allows unknown sugar but rejects missing required calories and macros", () => {
  const result = normalizeMealEstimate({
    mealName: "Soup",
    portionDescription: "Medium portion",
    calories: "450 kcal",
    protein: "20g",
    carbs: "55g",
    fat: "15g",
    sugar: "unknown",
    confidence: "uncertain",
    explanation: "Approximate estimate."
  });

  assert.equal(result.sugar, null);
  assert.match(result.warnings.join(" "), /Sugar could not be estimated/);
  assert.throws(
    () => normalizeMealEstimate({
      protein: 20,
      carbs: 55,
      fat: 15,
      confidence: "low"
    }),
    /calories.*missing or invalid/
  );
  assert.throws(
    () => normalizeMealEstimate({
      calories: 450,
      protein: "unknown",
      carbs: 55,
      fat: 15,
      confidence: "low"
    }),
    /protein.*missing or invalid/
  );
});

test("extracts JSON surrounded by extra text, markdown fences, and rejects malformed JSON", () => {
  assert.deepEqual(
    extractJson('Result follows: {"calories":"680 kcal"} End.'),
    { calories: "680 kcal" }
  );
  assert.deepEqual(
    extractJson('```json\n{"calories": "680 kcal"}\n```'),
    { calories: "680 kcal" }
  );
  assert.deepEqual(
    extractJson('Some text\n```\n{"calories": "680 kcal"}\n```\nMore text'),
    { calories: "680 kcal" }
  );
  assert.throws(
    () => extractJson('{"calories": 680,}'),
    /JSON|Expected|Unexpected|contain valid JSON/
  );
  assert.throws(
    () => extractJson('Just some text without any braces.'),
    /AI response did not contain JSON|contain valid JSON/
  );
});
