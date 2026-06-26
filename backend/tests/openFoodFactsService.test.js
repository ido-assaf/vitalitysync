const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeProduct } = require("../services/openFoodFactsService");

test("normalizes complete per-100g nutrition and serving data", () => {
  const product = normalizeProduct({
    code: "123456789",
    product_name: "Protein Yogurt",
    brands: "Vital Foods",
    serving_size: "150 g",
    ingredients_text: "Milk, cultures",
    allergens_tags: ["en:milk"],
    nutriments: {
      "energy-kcal_100g": 80,
      proteins_100g: 10,
      carbohydrates_100g: 6,
      fat_100g: 1.5,
      sugars_100g: 4
    }
  });

  assert.equal(product.barcode, "123456789");
  assert.equal(product.servingGrams, 150);
  assert.equal(product.nutritionComplete, true);
  assert.deepEqual(product.missingNutritionFields, []);
  assert.deepEqual(product.allergens, ["milk"]);
});

test("converts kilojoules to calories when kcal is absent", () => {
  const product = normalizeProduct({
    code: "1234",
    product_name: "Test Food",
    nutriments: {
      "energy-kj_100g": 418.4,
      proteins_100g: 5,
      carbohydrates_100g: 10,
      fat_100g: 2
    }
  });

  assert.equal(product.nutritionPer100g.calories, 100);
  assert.equal(product.nutritionComplete, true);
});

test("marks products with missing required macros as incomplete", () => {
  const product = normalizeProduct({
    code: "1234",
    product_name: "Incomplete Food",
    nutriments: {
      "energy-kcal_100g": 100,
      proteins_100g: 5,
      fat_100g: 2
    }
  });

  assert.equal(product.nutritionComplete, false);
  assert.equal(product.nutritionPer100g.carbs, null);
  assert.deepEqual(product.missingNutritionFields, ["carbs"]);
  assert.equal(product.allergensKnown, false);
});
