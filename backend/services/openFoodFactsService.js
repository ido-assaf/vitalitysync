const DEFAULT_PRODUCT_FIELDS = [
  "code",
  "product_name",
  "brands",
  "image_front_small_url",
  "image_front_url",
  "serving_size",
  "serving_quantity",
  "ingredients_text",
  "allergens_tags",
  "nutriments"
];

const searchCache = new Map();
const productCache = new Map();
const SEARCH_TTL_MS = 10 * 60 * 1000;
const PRODUCT_TTL_MS = 24 * 60 * 60 * 1000;

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeTag(value) {
  return String(value || "")
    .replace(/^[a-z]{2}:/i, "")
    .replace(/-/g, " ")
    .trim()
    .toLowerCase();
}

function parseServingGrams(product) {
  const servingQuantity = numericValue(product.serving_quantity);

  if (servingQuantity && servingQuantity > 0) {
    return servingQuantity;
  }

  const match = String(product.serving_size || "").match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  return match ? numericValue(match[1].replace(",", ".")) : null;
}

function resolveCalories(nutriments) {
  const directCalories = numericValue(
    nutriments["energy-kcal_100g"] ?? nutriments.energy_kcal_100g
  );

  if (directCalories !== null) {
    return directCalories;
  }

  const energyKj = numericValue(
    nutriments["energy-kj_100g"] ?? nutriments.energy_100g
  );
  return energyKj === null ? null : Math.round((energyKj / 4.184) * 100) / 100;
}

function normalizeProduct(rawProduct) {
  const product = rawProduct?._source || rawProduct?.document || rawProduct || {};
  const nutriments = product.nutriments || {};
  const nutritionPer100g = {
    calories: resolveCalories(nutriments),
    protein: numericValue(nutriments.proteins_100g),
    carbs: numericValue(nutriments.carbohydrates_100g),
    fat: numericValue(nutriments.fat_100g),
    sugar: numericValue(nutriments.sugars_100g)
  };
  const requiredValues = [
    nutritionPer100g.calories,
    nutritionPer100g.protein,
    nutritionPer100g.carbs,
    nutritionPer100g.fat
  ];
  const requiredNames = ["calories", "protein", "carbs", "fat"];
  const missingNutritionFields = requiredNames.filter(
    (field) => nutritionPer100g[field] === null
  );

  return {
    barcode: String(product.code || product._id || "").trim(),
    name: String(product.product_name || product.product_name_en || "Unnamed product").trim(),
    brand: String(product.brands || "").trim(),
    imageUrl: product.image_front_small_url || product.image_front_url || null,
    servingSize: product.serving_size || null,
    servingGrams: parseServingGrams(product),
    ingredients: String(product.ingredients_text || "").trim() || null,
    allergens: Array.isArray(product.allergens_tags)
      ? product.allergens_tags.map(normalizeTag).filter(Boolean)
      : [],
    allergensKnown: Array.isArray(product.allergens_tags),
    nutritionPer100g,
    nutritionComplete: requiredValues.every((value) => value !== null),
    missingNutritionFields,
    source: "open_food_facts",
    sourceUrl: product.code
      ? `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`
      : null
  };
}

function getCached(cache, key) {
  const entry = cache.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCached(cache, key, value, ttl) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.OPEN_FOOD_FACTS_TIMEOUT_MS || 8000)
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.OPEN_FOOD_FACTS_USER_AGENT ||
          "VitalitySync/1.0 (contact@example.com)",
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Open Food Facts request failed with status ${response.status}.`);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Open Food Facts request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractSearchResults(data) {
  const candidates =
    data?.hits?.hits ||
    data?.hits ||
    data?.results ||
    data?.products ||
    [];

  return Array.isArray(candidates) ? candidates : [];
}

async function searchFoods(query, language = "en") {
  const normalizedQuery = String(query || "").trim();
  const normalizedLanguage = String(language || "en").trim().toLowerCase() || "en";
  const cacheKey = `${normalizedLanguage}:${normalizedQuery.toLowerCase()}`;
  const cached = getCached(searchCache, cacheKey);

  if (cached) {
    return cached;
  }

  const data = await fetchJson(
    process.env.OPEN_FOOD_FACTS_SEARCH_URL ||
      "https://search.openfoodfacts.org/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: normalizedQuery,
        page: 1,
        page_size: 10,
        langs: Array.from(new Set([normalizedLanguage, "en"])),
        index_id: "off",
        boost_phrase: true,
        fields: [
          "code",
          "product_name",
          "product_name_en",
          "brands",
          "image_front_small_url",
          "image_front_url",
          "serving_size",
          "serving_quantity",
          "ingredients_text",
          "allergens_tags",
          "nutriments"
        ]
      })
    }
  );
  const products = extractSearchResults(data)
    .map(normalizeProduct)
    .filter((product) => product.barcode && product.name !== "Unnamed product")
    .slice(0, 10);

  setCached(searchCache, cacheKey, products, SEARCH_TTL_MS);
  return products;
}

async function getFoodByBarcode(barcode) {
  const normalizedBarcode = String(barcode || "").trim();
  const cached = getCached(productCache, normalizedBarcode);

  if (cached) {
    return cached;
  }

  const baseUrl =
    process.env.OPEN_FOOD_FACTS_PRODUCT_URL ||
    "https://world.openfoodfacts.org/api/v3/product";
  const fields = DEFAULT_PRODUCT_FIELDS.join(",");
  const data = await fetchJson(
    `${baseUrl}/${encodeURIComponent(normalizedBarcode)}.json?fields=${encodeURIComponent(fields)}`
  );

  if (!data?.product) {
    return null;
  }

  const product = normalizeProduct({ ...data.product, code: data.product.code || data.code });
  setCached(productCache, normalizedBarcode, product, PRODUCT_TTL_MS);
  return product;
}

module.exports = {
  getFoodByBarcode,
  normalizeProduct,
  searchFoods
};
