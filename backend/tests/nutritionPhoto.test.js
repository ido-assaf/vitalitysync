const test = require("node:test");
const assert = require("node:assert/strict");
const nutritionRoutes = require("../routes/nutritionRoutes");
const {
  validateMealEstimateBody
} = require("../controllers/nutritionController");
const {
  MAX_MEAL_IMAGE_BYTES,
  validateMealPhotoFile,
  validateMealPhotoType
} = require("../middleware/nutritionUpload");
const { generateMealPhotoEstimate } = require("../services/aiService");

function routeSignatures() {
  return nutritionRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods)
    }));
}

test("nutrition router exposes recent-food and favorite endpoints before the catch-all", () => {
  const signatures = routeSignatures();
  assert.ok(signatures.some((route) => route.path === "/recent-foods" && route.methods.includes("get")));
  assert.ok(signatures.some((route) => route.path === "/favorites" && route.methods.includes("get")));
  assert.ok(signatures.some((route) => route.path === "/favorites" && route.methods.includes("post")));
  assert.ok(signatures.some((route) => route.path === "/favorites/:barcode" && route.methods.includes("delete")));
});

test("meal estimate validation accepts text-only and photo-only requests", () => {
  assert.equal(
    validateMealEstimateBody({
      description: "chicken and rice",
      portionSize: "medium",
      cookingStyle: "grilled"
    }),
    null
  );
  assert.equal(
    validateMealEstimateBody({
      description: "",
      portionSize: "full_plate",
      cookingStyle: "unknown"
    }, true),
    null
  );
  assert.match(
    validateMealEstimateBody({
      description: "",
      portionSize: "medium",
      cookingStyle: "unknown"
    }).description,
    /3 to 500/
  );
});

test("meal photo validation rejects invalid types and oversized files", () => {
  assert.match(
    validateMealPhotoFile({ mimetype: "text/plain", size: 100 }),
    /JPEG, PNG, or WebP/
  );
  assert.match(
    validateMealPhotoFile({
      mimetype: "image/jpeg",
      size: MAX_MEAL_IMAGE_BYTES + 1
    }),
    /3 MB/
  );
  assert.equal(
    validateMealPhotoFile({ mimetype: "image/png", size: 1024 }),
    null
  );
});

test("meal photo validation accepts a parsed JPEG upload", () => {
  assert.equal(
    validateMealPhotoFile({ mimetype: "image/jpeg", size: 140 * 1024 }),
    null
  );
});

test("multer type validation does not require size before parsing bytes", () => {
  assert.equal(validateMealPhotoType({ mimetype: "image/jpeg" }), null);
});

test("photo estimation sends a base64 image to the configured Groq vision model", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_VISION_MODEL;
  const previousFetch = global.fetch;
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_VISION_MODEL = "test-vision-model";
  let requestBody;
  global.fetch = async (url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                mealName: "Chicken and rice",
                portionDescription: "Full plate",
                calories: 650,
                protein: 42,
                carbs: 70,
                fat: 18,
                sugar: null,
                confidence: "medium",
                explanation: "Approximate visual estimate.",
                assumptions: ["Moderate oil"],
                warnings: ["Hidden sauce may change values"]
              })
            }
          }]
        };
      }
    };
  };

  try {
    const result = await generateMealPhotoEstimate({
      description: "",
      portionSize: "full_plate",
      customPortion: null,
      cookingStyle: "unknown",
      imageBuffer: Buffer.from("meal-image"),
      imageMimeType: "image/jpeg"
    });

    assert.equal(result.mealName, "Chicken and rice");
    assert.equal(requestBody.model, "test-vision-model");
    assert.equal(requestBody.response_format.type, "json_object");
    assert.match(
      requestBody.messages[1].content[1].image_url.url,
      /^data:image\/jpeg;base64,/
    );
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_VISION_MODEL;
    else process.env.GROQ_VISION_MODEL = previousModel;
  }
});
