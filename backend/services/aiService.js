const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const NUTRITION_STATUSES = new Set(["recommended", "neutral", "caution"]);
const ESTIMATE_CONFIDENCE = new Set(["low", "medium", "high"]);

function extractJson(text) {
  if (text && typeof text === "object" && !Array.isArray(text)) return text;

  const str = String(text || "").trim();
  const cleaned = str
    .replace(/^```(?:json)?/im, "")
    .replace(/```$/im, "")
    .trim();

  let start = cleaned.indexOf("{");
  while (start !== -1) {
    let open = 0;
    let end = -1;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') open++;
        else if (char === '}') open--;

        if (open === 0) {
          end = i;
          break;
        }
      }
    }

    if (end !== -1) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (e) {
        // Not valid JSON, keep searching from the next {
      }
    }
    
    start = cleaned.indexOf("{", start + 1);
  }

  throw new Error("AI response did not contain JSON.");
}

function normalizeEvaluation(raw) {
  const score = Number(raw.score);
  const suggestedAlternatives = Array.isArray(raw.suggestedAlternatives)
    ? raw.suggestedAlternatives.filter((item) => typeof item === "string")
    : [];

  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw new Error("AI response score must be between 0 and 100.");
  }

  if (typeof raw.recommendation !== "string" || raw.recommendation.trim() === "") {
    throw new Error("AI response recommendation is missing.");
  }

  if (typeof raw.explanation !== "string" || raw.explanation.trim() === "") {
    throw new Error("AI response explanation is missing.");
  }

  return {
    score: Math.round(score),
    recommendation: raw.recommendation.trim(),
    explanation: raw.explanation.trim(),
    suggestedAlternatives
  };
}

function buildPrompt({ user, product, nutritionProfile }) {
  return `
You are a fitness and sports-nutrition assistant inside VitalitySync.
Evaluate whether this food product fits the user's nutrition profile.
Return only valid JSON with exactly these keys:
score, recommendation, explanation, suggestedAlternatives.

User:
${JSON.stringify(user)}

Nutrition profile:
${JSON.stringify(nutritionProfile)}

Food product:
${JSON.stringify(product)}
`;
}

async function generateProductEvaluation({ user, product, nutritionProfile }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You generate concise nutrition suitability evaluations and respond only with JSON."
        },
        {
          role: "user",
          content: buildPrompt({ user, product, nutritionProfile })
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq request failed with status ${response.status}.`);
  }

  const text = data?.choices?.[0]?.message?.content;
  return normalizeEvaluation(extractJson(text));
}

function normalizeNutritionGuidance(raw) {
  const status = String(raw.status || "").trim().toLowerCase();
  const explanation = String(raw.explanation || "").trim();
  const practicalSuggestion = String(raw.practicalSuggestion || "").trim();

  if (!NUTRITION_STATUSES.has(status)) {
    throw new Error("AI nutrition status is invalid.");
  }

  if (!explanation || explanation.length > 500) {
    throw new Error("AI nutrition explanation is invalid.");
  }

  if (!practicalSuggestion || practicalSuggestion.length > 300) {
    throw new Error("AI nutrition suggestion is invalid.");
  }

  return {
    status,
    explanation,
    practicalSuggestion
  };
}

function normalizeNutritionTargets(raw, baseline) {
  const baselineCalories = Number(baseline?.suggestedCalories);
  const baselineProtein = Number(baseline?.suggestedProtein);
  const calories = Number(raw?.dailyCalories);
  const protein = Number(raw?.dailyProtein);
  const dietaryApproach = String(raw?.dietaryApproach || "").trim();
  const mealGuidance = String(raw?.mealGuidance || "").trim();
  const explanation = String(raw?.explanation || "").trim();
  const assumptions = Array.isArray(raw?.assumptions)
    ? raw.assumptions
        .filter((item) => typeof item === "string" && item.trim() !== "")
        .slice(0, 5)
        .map((item) => item.trim())
    : [];

  if (!Number.isFinite(baselineCalories) || !Number.isFinite(baselineProtein)) {
    throw new Error("A validated baseline is required for AI nutrition targets.");
  }

  const minimumCalories = Math.max(1200, baselineCalories * 0.85);
  const maximumCalories = Math.min(6000, baselineCalories * 1.15);
  const minimumProtein = Math.max(40, baselineProtein * 0.85);
  const maximumProtein = Math.min(350, baselineProtein * 1.15);

  if (
    !Number.isFinite(calories) ||
    calories < minimumCalories ||
    calories > maximumCalories
  ) {
    throw new Error("AI calorie target is outside the validated range.");
  }

  if (
    !Number.isFinite(protein) ||
    protein < minimumProtein ||
    protein > maximumProtein
  ) {
    throw new Error("AI protein target is outside the validated range.");
  }

  if (!explanation || explanation.length > 500) {
    throw new Error("AI nutrition target explanation is invalid.");
  }

  if (!dietaryApproach || dietaryApproach.length > 500) {
    throw new Error("AI dietary approach is invalid.");
  }

  if (!mealGuidance || mealGuidance.length > 700) {
    throw new Error("AI meal guidance is invalid.");
  }

  return {
    dailyCalories: Math.round(calories / 25) * 25,
    dailyProtein: Math.round(protein / 5) * 5,
    dietaryApproach,
    mealGuidance,
    explanation,
    assumptions
  };
}

function clampEstimateNumber(value, maximum, field, allowNull = false) {
  const warnings = [];
  if (
    allowNull &&
    (value === null ||
      value === undefined ||
      value === "" ||
      /^(unknown|n\/a|not available|unavailable|null)$/i.test(String(value).trim()))
  ) {
    return { value: null, clamped: false, warnings: [`${field === "sugar" ? "Sugar" : field} could not be estimated.`] };
  }

  let number = value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    const matches = cleaned.match(/\d+(?:\.\d+)?/g) || [];

    if (matches.length >= 2 && /(?:-|–|—|\bto\b)/i.test(cleaned)) {
      number = (Number(matches[0]) + Number(matches[1])) / 2;
      warnings.push("AI returned a range; midpoint was used for logging.");
    } else if (matches.length === 1) {
      number = /^-\s*/.test(cleaned) ? -Number(matches[0]) : Number(matches[0]);
    }

    if (/[a-zA-Z]/.test(cleaned)) {
      warnings.push("Units were removed from numeric fields.");
    }
  }

  number = Number(number);
  if (!Number.isFinite(number)) {
    const error = new Error(`AI meal estimate required nutrition value "${field}" is missing or invalid.`);
    error.estimateErrorType = "required_values";
    throw error;
  }

  return {
    value: Math.round(Math.min(maximum, Math.max(0, number)) * 10) / 10,
    clamped: number < 0 || number > maximum,
    warnings
  };
}

function normalizeStringList(value, maximumItems, maximumLength) {
  const values = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  return values
    .filter((item) => typeof item === "string" && item.trim())
    .slice(0, maximumItems)
    .map((item) => item.trim().slice(0, maximumLength));
}

function portionLabel(portionSize, customPortion) {
  if (portionSize === "custom") return String(customPortion || "Custom portion").trim();
  return {
    small: "Small portion",
    medium: "Medium portion",
    full_plate: "Full plate",
    large_plate: "Large plate"
  }[portionSize] || "Estimated portion";
}

function uniqueWarnings(warnings) {
  return [...new Set(warnings.filter(Boolean))].slice(0, 6);
}

function normalizeMealEstimate(raw, context = {}) {
  const fallbackName = String(context.description || "").trim() || "Estimated meal";
  const mealName = String(raw?.mealName || fallbackName).trim().slice(0, 100);
  const portionDescription = String(
    raw?.portionDescription || portionLabel(context.portionSize, context.customPortion)
  ).trim().slice(0, 120);
  const rawConfidence = String(raw?.confidence || "").trim().toLowerCase();
  const confidenceAliases = {
    moderate: "medium",
    uncertain: "low",
    "very low": "low"
  };
  const confidence = ESTIMATE_CONFIDENCE.has(rawConfidence)
    ? rawConfidence
    : confidenceAliases[rawConfidence] || "low";
  const explanation = String(
    raw?.explanation ||
      "Approximate AI estimate based on the provided meal details and portion."
  ).trim().slice(0, 600);

  const calories = clampEstimateNumber(raw?.calories, 5000, "calories");
  const protein = clampEstimateNumber(raw?.protein, 500, "protein");
  const carbs = clampEstimateNumber(raw?.carbs, 500, "carbs");
  const fat = clampEstimateNumber(raw?.fat, 500, "fat");
  const sugar = clampEstimateNumber(raw?.sugar, 500, "sugar", true);
  const assumptions = normalizeStringList(raw?.assumptions, 6, 160);
  const warnings = normalizeStringList(raw?.warnings, 4, 180);

  [calories, protein, carbs, fat, sugar].forEach((item) => {
    if (item?.warnings) warnings.push(...item.warnings);
  });

  if (!ESTIMATE_CONFIDENCE.has(rawConfidence)) {
    warnings.push(`Confidence was normalized to ${confidence}.`);
  }

  if ([calories, protein, carbs, fat, sugar].some((item) => item?.clamped)) {
    warnings.push("One or more estimated values were adjusted to a safe logging range.");
  }

  return {
    mealName,
    portionDescription,
    calories: calories.value,
    protein: protein.value,
    carbs: carbs.value,
    fat: fat.value,
    sugar: sugar === null ? null : sugar.value,
    confidence,
    explanation,
    assumptions,
    warnings: uniqueWarnings(warnings)
  };
}

const STRICT_MEAL_ESTIMATE_INSTRUCTIONS = `
Return strict JSON only. Do not use markdown and do not write anything outside the JSON object.
All nutrition fields calories, protein, carbs, fat, and sugar must be JSON numbers, not strings.
Do not include units, commas, approximation symbols, or numeric ranges in nutrition fields.
If uncertain, choose one practical midpoint estimate and explain uncertainty in warnings.
confidence must be exactly "low", "medium", or "high".
Use null only for sugar when sugar cannot be estimated.
calories, protein, carbs, and fat are required.
assumptions and warnings must be arrays of short strings.
Do not claim values are verified or medical/lab precise.
`;

async function generateMealEstimate({
  description,
  portionSize,
  customPortion,
  cookingStyle
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const prompt = `
You estimate approximate nutrition values for homemade, restaurant, or non-packaged meals.
Return practical logging estimates, not medical, laboratory, or verified nutrition values.
Account for the described portion and cooking method. State uncertainty clearly.
The description may be in English or Hebrew.

Return strict JSON with exactly:
mealName, portionDescription, calories, protein, carbs, fat, sugar, confidence, explanation, assumptions, warnings.

${STRICT_MEAL_ESTIMATE_INSTRUCTIONS}

Meal description: ${JSON.stringify(description)}
Portion selection: ${JSON.stringify(portionSize)}
Custom portion: ${JSON.stringify(customPortion || null)}
Cooking style: ${JSON.stringify(cookingStyle)}
`;

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Estimate approximate homemade meal nutrition, include uncertainty, and return strict JSON only."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq request failed with status ${response.status}.`);
  }

  return normalizeMealEstimate(extractJson(data?.choices?.[0]?.message?.content), {
    description,
    portionSize,
    customPortion
  });
}

async function generateMealPhotoEstimate({
  description,
  portionSize,
  customPortion,
  cookingStyle,
  imageBuffer,
  imageMimeType
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Meal photo data is missing.");
  }

  const prompt = `
You estimate approximate nutrition for homemade, restaurant, or non-packaged meals from a meal photo.
Identify likely foods visible in the image and use any optional text context, portion selection, and cooking method.
Return practical logging estimates, not medical, laboratory, or verified nutrition values.
Hidden ingredients, sauces, oils, and actual serving weights may be unclear. State uncertainty clearly.
If the image is unclear or food cannot be identified reliably, use low confidence and explain why.
Do not provide medical advice.

Return strict JSON with exactly:
mealName, portionDescription, calories, protein, carbs, fat, sugar, confidence, explanation, assumptions, warnings.

${STRICT_MEAL_ESTIMATE_INSTRUCTIONS}

Optional meal description: ${JSON.stringify(description || null)}
Portion selection: ${JSON.stringify(portionSize)}
Custom portion: ${JSON.stringify(customPortion || null)}
Cooking style: ${JSON.stringify(cookingStyle)}
`;
  const dataUrl = `data:${imageMimeType};base64,${imageBuffer.toString("base64")}`;
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model:
        process.env.GROQ_VISION_MODEL ||
        "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content:
            "Estimate approximate meal nutrition from images, include uncertainty, and return strict JSON only."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.2,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" }
    })
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq vision request failed with status ${response.status}.`);
  }

  return normalizeMealEstimate(extractJson(data?.choices?.[0]?.message?.content), {
    description,
    portionSize,
    customPortion
  });
}

async function generateNutritionGuidance({
  food,
  portionNutrition,
  currentTotals,
  projectedTotals,
  nutritionProfile,
  specialist
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const prompt = `
You are the AI nutritionist inside VitalitySync.
All nutrition numbers below are trusted values already calculated by the backend.
Do not invent, correct, restate, or estimate nutrition numbers.
Give practical general guidance only, not medical advice.

Return only valid JSON with exactly:
status, explanation, practicalSuggestion.

Allowed status values: recommended, neutral, caution.

Nutrition specialist:
${JSON.stringify(specialist || null)}

User nutrition profile:
${JSON.stringify(nutritionProfile)}

Selected food:
${JSON.stringify({
  name: food.name,
  brand: food.brand,
  ingredients: food.ingredients,
  allergens: food.allergens
})}

Calculated portion nutrition:
${JSON.stringify(portionNutrition)}

Totals before adding:
${JSON.stringify(currentTotals)}

Projected totals after adding:
${JSON.stringify(projectedTotals)}
`;
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You provide concise food-fit explanations using only supplied structured data and respond only with JSON."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq request failed with status ${response.status}.`);
  }

  return normalizeNutritionGuidance(
    extractJson(data?.choices?.[0]?.message?.content)
  );
}

async function generateNutritionTargets({
  traineeProfile,
  workoutPlan,
  specialist,
  baseline,
  nutritionContext
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const prompt = `
You are the Nutritionist AI inside VitalitySync.
Suggest editable daily calorie and protein targets using only the provided
fitness profile, workout plan, nutrition preferences, allergies, limitations,
additional user context, specialist focus, and validated Mifflin-St Jeor baseline.

The backend baseline is the safety anchor. Keep both numeric targets within 15%
of it. Consider the fitness goal, training frequency, workout duration, and
training level. Do not provide medical advice.

Return only valid JSON with exactly:
dailyCalories, dailyProtein, dietaryApproach, mealGuidance, explanation, assumptions.

dietaryApproach should describe the overall eating approach you recommend.
mealGuidance should give short practical meal and menu direction, not a medical diet.

Fitness profile:
${JSON.stringify(traineeProfile)}

Latest workout plan:
${JSON.stringify(workoutPlan || null)}

Nutrition specialist:
${JSON.stringify(specialist || null)}

Nutrition preferences and context:
${JSON.stringify(nutritionContext)}

Validated baseline:
${JSON.stringify({
  dailyCalories: baseline.suggestedCalories,
  dailyProtein: baseline.suggestedProtein,
  calculation: baseline.calculation,
  inputs: baseline.inputs
})}
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  let response;
  let data;

  try {
    response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You generate safe sports-nutrition targets from supplied structured data and respond only with JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    data = await response.json().catch(() => null);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq request failed with status ${response.status}.`);
  }

  return normalizeNutritionTargets(
    extractJson(data?.choices?.[0]?.message?.content),
    baseline
  );
}

module.exports = {
  generateMealEstimate,
  generateMealPhotoEstimate,
  generateNutritionGuidance,
  generateNutritionTargets,
  generateProductEvaluation,
  extractJson,
  normalizeMealEstimate,
  normalizeNutritionGuidance,
  normalizeNutritionTargets
};
