import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import {
  addNutritionFavorite,
  addNutritionLogItem,
  deleteNutritionLogItem,
  deleteNutritionFavorite,
  estimateNutritionMeal,
  evaluateNutritionFood,
  getNutritionFood,
  getNutritionFavorites,
  getNutritionProfile,
  getRecentNutritionFoods,
  getNutritionTargetSuggestion,
  getNutritionToday,
  getStoredUser,
  getTraineeProfile,
  searchNutritionFoods,
  updateNutritionProfile
} from "../services/api";

const emptyProfile = {
  goal: "maintenance",
  dailyCaloriesTarget: "",
  dailyProteinTarget: "",
  dietaryPreferences: "",
  allergies: "",
  medicalRestrictions: "",
  freeTextNeeds: ""
};

const statusLabels = {
  recommended: "Recommended",
  neutral: "Neutral",
  caution: "Use with caution",
  not_recommended: "Not recommended",
  estimated: "AI estimate"
};

const iconPaths = {
  scan: "M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4",
  calories: "M12 22c4 0 7-2.8 7-7 0-3-1.5-5.5-4.5-7.7.2 2-1 3.2-1.8 3.8.1-4-2.3-6.4-5-8.1.2 3.1-1.6 5-2.9 6.8C3.9 10.7 5 15.2 7 17.4 8.4 19 10 20 12 22Z",
  protein: "M8.5 4.5c1.6 0 2.6 1.2 2.6 2.6 0 1.7-1.3 3.2-3.4 3.2-2.1 0-3.4-1.5-3.4-3.2 0-1.4 1-2.6 2.6-2.6.7 0 1.2.2 1.6.6.4-.4.9-.6 1.6-.6Zm7 9.2c2.1 0 3.4 1.5 3.4 3.2 0 1.4-1 2.6-2.6 2.6-.7 0-1.2-.2-1.6-.6-.4.4-.9.6-1.6.6-1.6 0-2.6-1.2-2.6-2.6 0-1.7 1.3-3.2 3.4-3.2.6 0 1.1.2 1.6.6.4-.4.9-.6 1.6-.6Z",
  remaining: "M12 3a9 9 0 1 0 9 9M12 7v5h5",
  insight: "M9 18h6M10 22h4M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.7-1.5 1.5-1.5 2.5h-4c0-1-.6-1.8-1.5-2.5Z",
  search: "m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  package: "M5 7.5 12 4l7 3.5M5 7.5V17l7 3 7-3V7.5M12 11v9M5 7.5l7 3.5 7-3.5",
  shield: "M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
  warning: "M12 4 3 20h18L12 4Zm0 5v5m0 3h.01",
  add: "M12 5v14M5 12h14",
  trash: "M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-3 3 1 14h10l1-14",
  bookmark: "M6 4h12v17l-6-4-6 4V4Z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.8 6.4 20.7 7.5 14 3 9.6l6.2-.9L12 3Z",
  camera: "M4 7h4l1.5-2h5L16 7h4v12H4V7Zm8 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  close: "m6 6 12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
  arrow: "M5 12h14m-5-5 5 5-5 5"
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg className={`vs-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={iconPaths[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function localDateKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function toList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function toText(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat([], { maximumFractionDigits: digits }).format(Number(value || 0));
}

function progressState(value, target) {
  if (!target) return "normal";
  const percentage = (Number(value) / Number(target)) * 100;
  if (percentage > 100) return "over";
  if (percentage === 100) return "reached";
  if (percentage >= 85) return "close";
  return "normal";
}

function normalizedInsight(insight) {
  if (typeof insight === "string") {
    return { type: "neutral", text: insight, action: "" };
  }
  return insight || { type: "neutral", text: "No nutrition insight available.", action: "" };
}

function portionNutrition(food, grams) {
  const factor = Number(grams) / 100;
  const source = food?.nutritionPer100g;
  if (!source || !Number.isFinite(factor) || factor <= 0) return null;
  const calculate = (value) =>
    value === null || value === undefined
      ? null
      : Math.round((Number(value) * factor + Number.EPSILON) * 10) / 10;
  return {
    calories: calculate(source.calories),
    protein: calculate(source.protein),
    carbs: calculate(source.carbs),
    fat: calculate(source.fat),
    sugar: calculate(source.sugar)
  };
}

function productFixtureImage(label, accent, background = "#eef7ef") {
  const initials = String(label || "Food")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
      <rect width="160" height="160" rx="26" fill="url(#g)"/>
      <ellipse cx="80" cy="132" rx="42" ry="8" fill="#173d2c" opacity=".08"/>
      <path d="M52 35h56l-7 91c-.5 7-6 12-13 12H72c-7 0-12.5-5-13-12l-7-91Z" fill="#fff" stroke="${accent}" stroke-width="5"/>
      <path d="M49 35h62v18H49z" rx="6" fill="${accent}"/>
      <circle cx="80" cy="88" r="25" fill="${accent}" opacity=".14"/>
      <text x="80" y="96" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="${accent}">${initials}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getProductImage(product) {
  return (
    product?.imageUrl ||
    product?.image_front_small_url ||
    product?.imageSmallUrl ||
    product?.image_small_url ||
    product?.image_thumb_url ||
    product?.image_front_url ||
    product?.image_url ||
    null
  );
}

const demoProducts = [
  {
    barcode: "demo-yogurt",
    name: "Protein Yogurt",
    brand: "Fage",
    imageUrl: productFixtureImage("Protein Yogurt", "#2d89a7", "#eaf6fa"),
    servingGrams: 150,
    servingSize: "1 cup (150g)",
    nutritionComplete: true,
    missingNutritionFields: [],
    nutritionPer100g: { calories: 120, protein: 12, carbs: 8, fat: 4, sugar: 6 },
    ingredients: "Skimmed milk, yogurt cultures, milk protein.",
    allergens: ["milk"],
    allergensKnown: true,
    sourceUrl: "https://world.openfoodfacts.org"
  },
  {
    barcode: "demo-chocolate",
    name: "Chocolate Bar 70%",
    brand: "Lindt",
    imageUrl: productFixtureImage("Chocolate 70%", "#33251f", "#f4eee8"),
    servingGrams: 25,
    servingSize: "4 squares (25g)",
    nutritionComplete: true,
    missingNutritionFields: [],
    nutritionPer100g: { calories: 580, protein: 8, carbs: 46, fat: 42, sugar: 28 },
    ingredients: "Cocoa mass, sugar, cocoa butter.",
    allergens: ["milk"],
    allergensKnown: true
  },
  {
    barcode: "demo-oats",
    name: "Oats & Honey Bar",
    brand: "Nature Valley",
    imageUrl: productFixtureImage("Oats Honey", "#d89a21", "#fff6dd"),
    servingGrams: 42,
    servingSize: "1 bar (42g)",
    nutritionComplete: false,
    missingNutritionFields: ["fat"],
    nutritionPer100g: { calories: 470, protein: 8, carbs: 64, fat: null, sugar: 26 },
    ingredients: "Whole grain oats, honey, sugar.",
    allergens: [],
    allergensKnown: false
  },
  {
    barcode: "demo-snack",
    name: "Generic Snack",
    brand: "Unknown Brand",
    imageUrl: null,
    servingGrams: null,
    servingSize: null,
    nutritionComplete: false,
    missingNutritionFields: ["protein", "carbs", "fat"],
    nutritionPer100g: { calories: 220, protein: null, carbs: null, fat: null, sugar: null },
    ingredients: null,
    allergens: [],
    allergensKnown: false
  }
];

function createDemoEvaluation(food = demoProducts[0], grams = 50) {
  const portion = portionNutrition(food, grams);
  return {
    evaluationId: "demo-evaluation",
    status: "caution",
    explanation:
      "Good source of protein for the calories. Moderate sugar for a yogurt—check added sugar if intake is high today.",
    practicalSuggestion:
      "Great as a post-workout snack. Pair with fruit or oats for more fiber and sustained energy.",
    guidanceSource: "groq",
    servingGrams: Number(grams),
    portionNutrition: portion,
    projectedTotals: {
      calories: 1120 + portion.calories,
      protein: 82 + portion.protein,
      carbs: 124 + portion.carbs,
      fat: 41 + portion.fat
    },
    targets: { calories: 1800, protein: 130, carbs: 225, fat: 60 },
    warnings: ["Contains: Milk", "Allergen data may be incomplete."],
    disclaimer: "General nutrition guidance only; not medical advice."
  };
}

function createDemoToday(date) {
  return {
    date,
    configured: true,
    profile: {
      goal: "muscle gain",
      dailyCaloriesTarget: 1800,
      dailyProteinTarget: 130,
      allergies: [],
      dietaryPreferences: [],
      medicalRestrictions: []
    },
    totals: { calories: 1120, protein: 82, carbs: 124, fat: 41, sugar: 24 },
    remaining: { calories: 680, protein: 48 },
    insight: {
      type: "attention",
      text: "Protein is still low today.",
      action: "Prefer a high-protein option next."
    },
    nutritionCompleteness: { sugarComplete: true },
    items: [
      {
        nutritionLogItemId: "demo-log-1",
        source: "open_food_facts",
        externalFoodId: "demo-yogurt",
        foodName: "Protein Yogurt",
        brand: "Fage",
        imageUrl: demoProducts[0].imageUrl,
        servingGrams: 50,
        calories: 60,
        protein: 6,
        evaluationStatus: "caution",
        evaluationReason: "Good protein source with moderate sugar. Fits the remaining calorie budget.",
        practicalSuggestion: "Good post-workout option.",
        guidanceSource: "groq",
        createDate: `${date}T09:42:00`
      },
      {
        nutritionLogItemId: "demo-log-2",
        source: "ai_estimate",
        externalFoodId: "demo-estimate-1",
        foodName: "Grilled Chicken Breast",
        brand: "Homemade",
        imageUrl: productFixtureImage("Chicken", "#c87835", "#fff0df"),
        servingGrams: 150,
        portionDescription: "Full plate",
        originalDescription: "grilled chicken breast with rice and salad, full plate",
        estimateConfidence: "medium",
        estimateAssumptions: ["Grilled chicken breast", "One serving of rice", "Light salad dressing"],
        calories: 240,
        protein: 46,
        evaluationStatus: "estimated",
        evaluationReason: "Estimated from the described full plate and typical homemade portions.",
        practicalSuggestion: "Values are approximate and can vary by recipe and serving size.",
        guidanceSource: "ai_estimate",
        createDate: `${date}T12:15:00`
      },
      {
        nutritionLogItemId: "demo-log-3",
        source: "open_food_facts",
        externalFoodId: "demo-oats",
        foodName: "Oatmeal",
        brand: "Quaker",
        imageUrl: productFixtureImage("Oatmeal", "#d9a735", "#fff8df"),
        servingGrams: 40,
        calories: 150,
        protein: 5,
        evaluationStatus: "neutral",
        evaluationReason: "A useful carbohydrate source with moderate calories.",
        practicalSuggestion: "Add yogurt or another protein source for better balance.",
        guidanceSource: "deterministic",
        createDate: `${date}T07:30:00`
      }
    ]
  };
}

function InfoTooltip({ label, children }) {
  return (
    <span className="nutrition-info">
      <button type="button" aria-label={label}>i</button>
      <span className="nutrition-info__content" role="tooltip">{children}</span>
    </span>
  );
}

function FoodVisual({ product, imageUrl, name, compact = false }) {
  const resolvedImage = getProductImage(product) || imageUrl;
  const resolvedName = product?.name || product?.foodName || name;
  return resolvedImage ? (
    <img className={compact ? "nutriscan-food-image compact" : "nutriscan-food-image"} src={resolvedImage} alt={`${resolvedName || "Food"} product`} loading="lazy" />
  ) : (
    <span className={compact ? "nutriscan-food-fallback compact" : "nutriscan-food-fallback"} aria-hidden="true">
      <Icon name="package" size={compact ? 20 : 28} />
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`nutrition-status nutrition-status--${status || "neutral"}`}>
      {statusLabels[status] || "Neutral"}
    </span>
  );
}

function WorkspaceEmpty({ icon = "package", title, message, steps = [] }) {
  return (
    <div className="nutriscan-empty">
      <span className="nutriscan-empty__icon"><Icon name={icon} size={22} /></span>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {steps.length ? (
          <span className="nutriscan-empty__steps">
            {steps.map((step) => <small key={step}><i><Icon name="check" size={11} /></i>{step}</small>)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NutritionProgress({ label, value, target, unit, icon }) {
  const percentage = target > 0 ? (Number(value) / Number(target)) * 100 : 0;
  const remaining = Math.max(0, Number(target || 0) - Number(value || 0));
  const state = progressState(value, target);
  return (
    <article className={`nutriscan-kpi nutriscan-kpi--${state}`}>
      <div className="nutriscan-kpi__label">
        <span className="nutriscan-kpi__icon"><Icon name={icon} size={17} /></span>
        <strong>{label}</strong>
        <InfoTooltip label={`How ${label.toLowerCase()} totals are calculated`}>
          Totals are calculated from foods added to today&apos;s log.
        </InfoTooltip>
      </div>
      <p><b>{formatNumber(value, 1)}</b> / {formatNumber(target, 1)} {unit}</p>
      <div className="nutriscan-progress"><span style={{ width: `${Math.min(100, percentage)}%` }} /></div>
      <small>{remaining > 0 ? `${formatNumber(remaining, 1)} ${unit} left` : state === "over" ? `${formatNumber(Number(value) - Number(target), 1)} ${unit} over` : "Target reached"}</small>
    </article>
  );
}

const emptyEstimateForm = {
  description: "",
  portionSize: "medium",
  customPortion: "",
  cookingStyle: "unknown"
};
const MAX_MEAL_PHOTO_BYTES = 3 * 1024 * 1024;
const MEAL_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function NutritionQuickActions({ active, onRecent, onFavorites, onEstimate }) {
  return (
    <div className="nutrition-quick-actions" aria-label="Nutrition quick actions">
      <button className={active === "recent" ? "active" : ""} type="button" onClick={onRecent}>Recent foods</button>
      <button className={active === "favorites" ? "active" : ""} type="button" onClick={onFavorites}><Icon name="star" size={14} />Favorites</button>
      <button className="estimate" type="button" onClick={onEstimate}><Icon name="add" size={14} />Estimate meal</button>
    </div>
  );
}

function MealEstimateModal({
  form,
  photo,
  estimateResult,
  error,
  status,
  editing,
  onChange,
  onPhotoChange,
  onRemovePhoto,
  onClose,
  onEstimate,
  onEdit,
  onReviewChange,
  onAdd
}) {
  if (!form) return null;
  const estimate = estimateResult?.estimate;
  return (
    <div className="nutrition-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="nutrition-meal-modal" role="dialog" aria-modal="true" aria-labelledby="estimate-meal-title">
        <header>
          <div><p className="eyebrow">AI estimate</p><h2 id="estimate-meal-title">Estimate custom meal</h2><span>Describe a homemade or non-packaged meal and let AI estimate the nutrition values.</span></div>
          <button type="button" aria-label="Close meal estimate" onClick={onClose}><Icon name="close" size={18} /></button>
        </header>
        {!estimate ? (
          <>
            <label>Meal description <small>Optional when a photo is provided</small><textarea name="description" value={form.description} onChange={onChange} placeholder="Example: stuffed chicken with potatoes, full plate" maxLength="500" /></label>
            <fieldset><legend>Portion size</legend><div className="nutrition-modal-chips">
              {[["small", "Small"], ["medium", "Medium"], ["full_plate", "Full plate"], ["large_plate", "Large plate"], ["custom", "Custom"]].map(([value, label]) => <button className={form.portionSize === value ? "active" : ""} type="button" key={value} onClick={() => onChange({ target: { name: "portionSize", value } })}>{label}</button>)}
            </div></fieldset>
            {form.portionSize === "custom" ? <label>Describe portion size<input name="customPortion" value={form.customPortion} onChange={onChange} maxLength="120" placeholder="Example: two bowls" /></label> : null}
            <label>Cooking style<select name="cookingStyle" value={form.cookingStyle} onChange={onChange}><option value="unknown">Unknown</option><option value="baked">Baked</option><option value="fried">Fried</option><option value="grilled">Grilled</option></select></label>
            <div className="nutrition-photo-upload">
              {photo?.previewUrl ? (
                <div className="nutrition-photo-preview">
                  <img src={photo.previewUrl} alt="Selected meal preview" />
                  <div><strong>{photo.file.name}</strong><small>{(photo.file.size / 1024 / 1024).toFixed(2)} MB · image kept in memory only</small></div>
                  <button type="button" onClick={onRemovePhoto} aria-label="Remove meal photo"><Icon name="close" size={16} /></button>
                </div>
              ) : (
                <label className="nutrition-photo-picker">
                  <Icon name="camera" size={19} />
                  <span><strong>Upload meal photo</strong><small>JPEG, PNG, or WebP · max 3 MB</small></span>
                  <input aria-label="Upload meal photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} />
                </label>
              )}
            </div>
            {error ? <div className="nutriscan-inline-state error">{error}</div> : null}
            <footer><button className="button button--ghost" type="button" onClick={onClose}>Cancel</button><button className="button button--primary" type="button" onClick={onEstimate} disabled={status === "estimating"}>{status === "estimating" ? "Estimating..." : photo?.file ? "Estimate from photo" : "Estimate meal"}</button></footer>
          </>
        ) : (
          <>
            {estimateResult?.estimateType === "photo" ? <p className="nutrition-photo-estimate-label"><Icon name="camera" size={15} />AI visual estimate</p> : null}
            <div className="nutrition-estimate-heading"><span><Icon name="insight" size={21} /></span><div><small>Estimated meal</small><h3>{estimate.mealName}</h3><p>{estimate.portionDescription} · {estimate.confidence} confidence</p></div></div>
            <div className="nutrition-estimate-macros">
              {[["calories", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["fat", "Fat", "g"], ["sugar", "Sugar", "g"]].map(([field, label, unit]) => <label key={field}><span>{label}</span>{editing ? <input name={field} type="number" min="0" step="0.1" value={estimate[field] ?? ""} onChange={onReviewChange} /> : <strong>~{formatNumber(estimate[field], 1)} {unit}</strong>}</label>)}
            </div>
            <div className="nutrition-estimate-explanation"><strong>Why estimated?</strong><p>{estimate.explanation}</p>{estimate.assumptions?.length ? <ul>{estimate.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul> : null}</div>
            {error ? <div className="nutriscan-inline-state error">{error}</div> : null}
            <footer><button className="button button--ghost" type="button" onClick={onClose}>Cancel</button><button className="button button--outline" type="button" onClick={onEdit}>{editing ? "Done editing" : "Edit estimate"}</button><button className="button button--primary" type="button" onClick={onAdd} disabled={status === "adding-estimate"}>{status === "adding-estimate" ? "Adding..." : "Add to Today"}</button></footer>
          </>
        )}
      </section>
    </div>
  );
}

function Nutrition() {
  const storedUser = getStoredUser();
  const date = useMemo(localDateKey, []);
  const demoMode = useMemo(
    () =>
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("nutritionDemo") === "1",
    []
  );
  const [profile, setProfile] = useState(null);
  const [traineeProfile, setTraineeProfile] = useState(null);
  const [targetSuggestion, setTargetSuggestion] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [targetsGenerated, setTargetsGenerated] = useState(false);
  const [today, setToday] = useState(null);
  const [status, setStatus] = useState("loading");
  const [pageError, setPageError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [productError, setProductError] = useState("");
  const [evaluationError, setEvaluationError] = useState("");
  const [logError, setLogError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [selectedFood, setSelectedFood] = useState(null);
  const [servingGrams, setServingGrams] = useState("100");
  const [evaluation, setEvaluation] = useState(null);
  const [actionStatus, setActionStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const [quickMode, setQuickMode] = useState("search");
  const [recentFoods, setRecentFoods] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [quickError, setQuickError] = useState("");
  const [mealEstimateForm, setMealEstimateForm] = useState(null);
  const [mealPhoto, setMealPhoto] = useState({ file: null, previewUrl: "" });
  const [mealEstimateResult, setMealEstimateResult] = useState(null);
  const [mealEstimateError, setMealEstimateError] = useState("");
  const [editingEstimate, setEditingEstimate] = useState(false);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(
    () => () => {
      if (mealPhoto.previewUrl) URL.revokeObjectURL(mealPhoto.previewUrl);
    },
    [mealPhoto.previewUrl]
  );

  async function refreshToday() {
    if (demoMode) {
      return today;
    }
    const todayData = await getNutritionToday(date);
    setToday(todayData);
    return todayData;
  }

  function applySuggestion(suggestion) {
    if (!suggestion?.canCalculate) return;
    setTargetSuggestion(suggestion);
    setTargetsGenerated(true);
    setProfileForm((current) => ({
      ...current,
      goal: suggestion.inputs?.nutritionGoal || current.goal,
      dailyCaloriesTarget: String(suggestion.suggestedCalories),
      dailyProteinTarget: String(suggestion.suggestedProtein),
      dietaryPreferences:
        suggestion.suggestedDietaryApproach || current.dietaryPreferences
    }));
  }

  useEffect(() => {
    if (storedUser?.userRole !== "trainee") return;
    if (demoMode) {
      const demoToday = createDemoToday(date);
      setProfile(demoToday.profile);
      setProfileForm({
        goal: demoToday.profile.goal,
        dailyCaloriesTarget: String(demoToday.profile.dailyCaloriesTarget),
        dailyProteinTarget: String(demoToday.profile.dailyProteinTarget),
        dietaryPreferences: "",
        allergies: "",
        medicalRestrictions: "",
        freeTextNeeds: ""
      });
      setTargetsGenerated(true);
      setToday(demoToday);
      setSearchQuery("protein yogurt");
      setLastSearchQuery("protein yogurt");
      setSearchResults(demoProducts);
      setSearchStatus("success");
      setSelectedFood(demoProducts[0]);
      setServingGrams("50");
      setEvaluation(createDemoEvaluation(demoProducts[0], 50));
      setExpandedItems(new Set(["demo-log-1"]));
      setRecentFoods([
        { source: "open_food_facts", barcode: "demo-yogurt", name: "Protein Yogurt", brand: "Fage", imageUrl: demoProducts[0].imageUrl, nutritionComplete: true },
        { source: "ai_estimate", name: "Grilled Chicken Breast", brand: "Homemade", originalDescription: "grilled chicken breast with rice and salad", portionDescription: "Full plate", nutritionComplete: true }
      ]);
      setFavorites([demoProducts[0]]);
      setStatus("ready");
      return;
    }
    Promise.allSettled([
      getNutritionProfile(),
      getNutritionToday(date),
      getTraineeProfile(storedUser.userId),
      getNutritionTargetSuggestion(),
      getRecentNutritionFoods(),
      getNutritionFavorites()
    ]).then(
      ([profileResult, todayResult, traineeResult, suggestionResult, recentResult, favoriteResult]) => {
        if (profileResult.status === "rejected" && todayResult.status === "rejected") {
          setPageError(todayResult.reason.message || profileResult.reason.message);
          setStatus("error");
          return;
        }
        const profileData = profileResult.status === "fulfilled"
          ? profileResult.value
          : todayResult.value?.profile || null;
        const traineeData =
          traineeResult.status === "fulfilled" ? traineeResult.value : null;
        const suggestionData =
          suggestionResult.status === "fulfilled" ? suggestionResult.value : null;
        setProfile(profileData);
        setTraineeProfile(traineeData);
        setTargetSuggestion(suggestionData);
        if (recentResult.status === "fulfilled") setRecentFoods(recentResult.value);
        if (favoriteResult.status === "fulfilled") setFavorites(favoriteResult.value);
        if (todayResult.status === "fulfilled") setToday(todayResult.value);
        else setPageError(todayResult.reason.message);
        if (profileData) {
          setProfileForm({
            goal: profileData.goal || "maintenance",
            dailyCaloriesTarget: String(profileData.dailyCaloriesTarget || ""),
            dailyProteinTarget: String(profileData.dailyProteinTarget || ""),
            dietaryPreferences: toText(profileData.dietaryPreferences),
            allergies: toText(profileData.allergies),
            medicalRestrictions: toText(profileData.medicalRestrictions),
            freeTextNeeds: profileData.freeTextNeeds || ""
          });
          setTargetsGenerated(true);
        } else if (suggestionData?.inputs?.nutritionGoal) {
          setProfileForm((current) => ({
            ...current,
            goal: suggestionData.inputs.nutritionGoal
          }));
        }
        setStatus("ready");
      }
    );
  }, [date, demoMode, storedUser?.userId, storedUser?.userRole]);

  if (storedUser?.userRole === "admin") return <Navigate to="/admin" replace />;
  if (status === "loading") return <LoadingState label="Loading NutriScan..." />;
  if (status === "error" && !today) return <ErrorState message={pageError} />;

  const configured = Boolean(today?.configured);
  const totals = today?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: null };
  const calorieTarget = Number(profile?.dailyCaloriesTarget || 0);
  const proteinTarget = Number(profile?.dailyProteinTarget || 0);
  const remainingCalories = Math.max(0, calorieTarget - Number(totals.calories || 0));
  const remainingProtein = Math.max(0, proteinTarget - Number(totals.protein || 0));
  const insight = normalizedInsight(today?.insight);
  const preview = portionNutrition(selectedFood, servingGrams);
  const validPortion = Number(servingGrams) >= 1 && Number(servingGrams) <= 2000;
  const sugarComplete = today?.nutritionCompleteness?.sugarComplete !== false;
  const favoriteBarcodes = new Set(favorites.map((favorite) => String(favorite.barcode)));
  const displayedResults =
    quickMode === "favorites"
      ? favorites
      : quickMode === "recent"
        ? recentFoods
        : searchResults;

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function handleGenerateTargets() {
    setActionStatus("generating-targets");
    setProfileError("");
    setMessage("");

    try {
      const missingFields = targetSuggestion?.missingFields || [];

      if (missingFields.length > 0) {
        const fieldLabels = {
          traineeProfile: "fitness profile",
          age: "age",
          weight: "weight",
          height: "height",
          biologicalSex: "biological sex",
          trainingDaysPerWeek: "training days per week"
        };
        throw new Error(
          `Update your Fitness Profile before asking the Nutritionist AI. Missing or invalid: ${missingFields
            .map((field) => fieldLabels[field] || field)
            .join(", ")}.`
        );
      }

      const requestedGoal =
        targetSuggestion?.inputs?.nutritionGoal || profileForm.goal;
      const nutritionContext = {
        dietaryPreferences: [],
        allergies: toList(profileForm.allergies),
        medicalRestrictions: toList(profileForm.medicalRestrictions),
        additionalContext: profileForm.freeTextNeeds.trim()
      };
      const suggestion = await getNutritionTargetSuggestion(
        requestedGoal,
        true,
        nutritionContext
      );
      setTargetSuggestion(suggestion);
      if (!suggestion.canCalculate) {
        const labels = {
          age: "age",
          weight: "weight",
          height: "height",
          biologicalSex: "biological sex",
          trainingDaysPerWeek: "training days per week"
        };
        const missing = (suggestion.missingFields || [])
          .filter((field) => field !== "traineeProfile")
          .map((field) => labels[field] || field);
        throw new Error(
          missing.length
            ? `To calculate nutrition targets, please complete ${missing.join(", ")}.`
            : "The fitness profile does not contain enough information to calculate nutrition targets."
        );
      }
      applySuggestion(suggestion);
      setMessage(
        suggestion.generationSource === "groq"
          ? `${suggestion.specialistName || "Nutritionist AI"} generated your targets.`
          : "Suggested targets are ready for your review."
      );
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileError("");
    setMessage("");

    const dailyCaloriesTarget = Number(profileForm.dailyCaloriesTarget);
    const dailyProteinTarget = Number(profileForm.dailyProteinTarget);
    if (
      !targetsGenerated ||
      !Number.isFinite(dailyCaloriesTarget) ||
      dailyCaloriesTarget < 500 ||
      dailyCaloriesTarget > 10000 ||
      !Number.isFinite(dailyProteinTarget) ||
      dailyProteinTarget < 10 ||
      dailyProteinTarget > 500
    ) {
      setProfileError(
        "Generate targets first, then save daily calories between 500 and 10000 and daily protein between 10 and 500 grams."
      );
      return;
    }

    setActionStatus("saving-profile");
    try {
      const saved = await updateNutritionProfile({
        goal: profileForm.goal,
        dailyCaloriesTarget,
        dailyProteinTarget,
        dietaryPreferences: toList(profileForm.dietaryPreferences),
        allergies: toList(profileForm.allergies),
        medicalRestrictions: toList(profileForm.medicalRestrictions),
        freeTextNeeds: profileForm.freeTextNeeds
      });
      setProfile(saved);
      setEditingProfile(false);
      await refreshToday();
      setMessage("Nutrition targets saved.");
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  async function runSearch(query) {
    setSearchStatus("loading");
    setSearchError("");
    setMessage("");
    setSelectedFood(null);
    setEvaluation(null);
    setQuickMode("search");
    if (demoMode) {
      const normalizedQuery = String(query || "").trim().toLowerCase();
      setSearchResults(
        demoProducts.filter((food) =>
          `${food.name} ${food.brand}`.toLowerCase().includes(normalizedQuery)
        )
      );
      setLastSearchQuery(query);
      setSearchStatus("success");
      return;
    }
    try {
      const results = await searchNutritionFoods(query);
      setSearchResults(results);
      setLastSearchQuery(query);
      setSearchStatus("success");
    } catch (error) {
      setSearchError(error.message);
      setSearchStatus("error");
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    runSearch(searchQuery.trim());
  }

  function openMealEstimate(prefill = {}) {
    setMealEstimateForm({
      ...emptyEstimateForm,
      description: prefill.description || "",
      portionSize: prefill.portionSize || "medium",
      customPortion: prefill.customPortion || "",
      cookingStyle: prefill.cookingStyle || "unknown"
    });
    setMealEstimateResult(null);
    setMealEstimateError("");
    setEditingEstimate(false);
    setMealPhoto((current) => {
      if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return { file: null, previewUrl: "" };
    });
  }

  async function showRecentFoods() {
    setQuickError("");
    setQuickMode("recent");
    if (demoMode || recentFoods.length) return;
    try {
      setRecentFoods(await getRecentNutritionFoods());
    } catch (error) {
      setQuickError(error.message);
    }
  }

  async function showFavorites() {
    setQuickError("");
    setQuickMode("favorites");
    if (demoMode || favorites.length) return;
    try {
      setFavorites(await getNutritionFavorites());
    } catch (error) {
      setQuickError(error.message);
    }
  }

  async function toggleFavorite(food) {
    if (!food?.barcode) return;
    const isFavorite = favoriteBarcodes.has(String(food.barcode));
    setActionStatus("favorite");
    setQuickError("");
    try {
      if (demoMode) {
        setFavorites((current) =>
          isFavorite
            ? current.filter((favorite) => String(favorite.barcode) !== String(food.barcode))
            : [food, ...current]
        );
      } else if (isFavorite) {
        await deleteNutritionFavorite(food.barcode);
        setFavorites((current) =>
          current.filter((favorite) => String(favorite.barcode) !== String(food.barcode))
        );
      } else {
        const saved = await addNutritionFavorite(food.barcode);
        setFavorites((current) => [
          {
            ...food,
            ...saved,
            nutritionPer100g: saved.nutritionPer100g || food.nutritionPer100g
          },
          ...current.filter((favorite) => String(favorite.barcode) !== String(food.barcode))
        ]);
      }
    } catch (error) {
      setQuickError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  function handleMealEstimateChange(event) {
    const { name, value } = event.target;
    setMealEstimateForm((current) => ({ ...current, [name]: value }));
    setMealEstimateError("");
  }

  function handleMealPhotoChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!MEAL_PHOTO_TYPES.has(file.type)) {
      setMealEstimateError("Choose a JPEG, PNG, or WebP meal photo.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_MEAL_PHOTO_BYTES) {
      setMealEstimateError("Meal photos must be 3 MB or smaller.");
      event.target.value = "";
      return;
    }
    setMealPhoto((current) => {
      if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
    setMealEstimateError("");
  }

  function removeMealPhoto() {
    setMealPhoto((current) => {
      if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return { file: null, previewUrl: "" };
    });
    setMealEstimateError("");
  }

  function closeMealEstimate() {
    removeMealPhoto();
    setMealEstimateForm(null);
    setMealEstimateResult(null);
    setMealEstimateError("");
  }

  async function handleEstimateMeal() {
    const description = mealEstimateForm.description.trim();
    if (!mealPhoto.file && description.length < 3) {
      setMealEstimateError("Describe the meal using at least 3 characters or upload a meal photo.");
      return;
    }
    if (description.length > 0 && description.length < 3) {
      setMealEstimateError("Optional meal description must use at least 3 characters.");
      return;
    }
    if (mealEstimateForm.portionSize === "custom" && !mealEstimateForm.customPortion.trim()) {
      setMealEstimateError("Describe the custom portion size.");
      return;
    }

    setActionStatus("estimating");
    setMealEstimateError("");
    try {
      if (demoMode) {
        setMealEstimateResult({
          estimateId: "demo-meal-estimate",
          estimateType: mealPhoto.file ? "photo" : "text",
          estimate: {
            mealName: "Stuffed chicken with potatoes",
            portionDescription: mealEstimateForm.portionSize === "full_plate" ? "Full plate" : "Medium portion",
            calories: 680,
            protein: 43,
            carbs: 58,
            fat: 26,
            sugar: 5,
            confidence: "medium",
            explanation: mealPhoto.file
              ? "Estimated from the meal photo, selected portion, visible ingredients, and possible cooking oil."
              : "Estimated from the meal description, portion size, chicken stuffing, potatoes, and possible cooking oil.",
            assumptions: ["Typical homemade recipe", "Moderate cooking oil", "One full plate"],
            warnings: ["Values are approximate and vary by recipe."]
          }
        });
      } else {
        setMealEstimateResult(
          await estimateNutritionMeal(
            {
              description,
              portionSize: mealEstimateForm.portionSize,
              customPortion: mealEstimateForm.customPortion.trim() || null,
              cookingStyle: mealEstimateForm.cookingStyle
            },
            mealPhoto.file
          )
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development" && error.details?.reason) {
        console.warn("Meal estimate details:", error.details.reason);
      }
      setMealEstimateError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  function handleEstimateReviewChange(event) {
    const { name, value } = event.target;
    setMealEstimateResult((current) => ({
      ...current,
      estimate: {
        ...current.estimate,
        [name]: value
      }
    }));
  }

  async function handleAddEstimatedMeal() {
    setActionStatus("adding-estimate");
    setMealEstimateError("");
    const reviewedNutrition = {
      calories: Number(mealEstimateResult.estimate.calories),
      protein: Number(mealEstimateResult.estimate.protein),
      carbs: Number(mealEstimateResult.estimate.carbs),
      fat: Number(mealEstimateResult.estimate.fat),
      sugar:
        mealEstimateResult.estimate.sugar === null ||
        mealEstimateResult.estimate.sugar === ""
          ? null
          : Number(mealEstimateResult.estimate.sugar)
    };
    try {
      if (demoMode) {
        setMessage("Demo mode: estimated meal previewed without saving.");
      } else {
        await addNutritionLogItem({
          estimateId: mealEstimateResult.estimateId,
          date,
          reviewedNutrition
        });
        await refreshToday();
        setMessage(`${mealEstimateResult.estimate.mealName} was added to today.`);
      }
      closeMealEstimate();
    } catch (error) {
      setMealEstimateError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  async function handleSelectFood(food) {
    if (food.source === "ai_estimate") {
      openMealEstimate({
        description: food.originalDescription || food.name,
        portionSize: food.portionDescription ? "custom" : "medium",
        customPortion: food.portionDescription || ""
      });
      return;
    }
    if (!food.nutritionComplete) return;
    setActionStatus("loading-food");
    setProductError("");
    setEvaluation(null);
    if (demoMode) {
      setSelectedFood(food);
      setServingGrams(String(food.barcode === "demo-yogurt" ? 50 : food.servingGrams || 100));
      setActionStatus("idle");
      return;
    }
    try {
      const details = await getNutritionFood(food.barcode);
      setSelectedFood(details);
      setServingGrams(String(details.servingGrams || 100));
    } catch (error) {
      setProductError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  function changePortion(value) {
    setServingGrams(String(value));
    setEvaluation(null);
    setEvaluationError("");
  }

  async function handleEvaluate() {
    if (!selectedFood || !validPortion) return;
    setActionStatus("evaluating");
    setEvaluationError("");
    setMessage("");
    if (demoMode) {
      setEvaluation(createDemoEvaluation(selectedFood, Number(servingGrams)));
      setActionStatus("idle");
      return;
    }
    try {
      setEvaluation(await evaluateNutritionFood({
        barcode: selectedFood.barcode,
        servingGrams: Number(servingGrams),
        date
      }));
    } catch (error) {
      setEvaluationError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  async function handleAddFood() {
    setActionStatus("adding");
    setEvaluationError("");
    setMessage("");
    if (demoMode) {
      setMessage("Demo mode: Add to Today previewed without saving.");
      setActionStatus("idle");
      return;
    }
    try {
      await addNutritionLogItem({ evaluationId: evaluation.evaluationId });
      await refreshToday();
      setEvaluation(null);
      setMessage(`${selectedFood.name} was added to today.`);
    } catch (error) {
      setEvaluationError(error.message);
      if (["EVALUATION_STALE", "EVALUATION_EXPIRED"].includes(error.code)) {
        setEvaluation(null);
      }
    } finally {
      setActionStatus("idle");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete ${item.foodName} from today’s food log?`)) return;
    setActionStatus(`deleting-${item.nutritionLogItemId}`);
    setLogError("");
    if (demoMode) {
      setToday((current) => ({
        ...current,
        items: current.items.filter(
          (currentItem) => currentItem.nutritionLogItemId !== item.nutritionLogItemId
        )
      }));
      setActionStatus("idle");
      return;
    }
    try {
      await deleteNutritionLogItem(item.nutritionLogItemId);
      await refreshToday();
    } catch (error) {
      setLogError(error.message);
    } finally {
      setActionStatus("idle");
    }
  }

  function toggleItem(itemId) {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function showInsightDetails() {
    document.getElementById("nutrition-today-insight")?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function showEvaluationWorkspace() {
    document.getElementById("nutrition-ai-result")?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function toggleAllDetails() {
    const itemIds = (today?.items || []).map((item) => item.nutritionLogItemId);
    setExpandedItems((current) =>
      current.size === itemIds.length ? new Set() : new Set(itemIds)
    );
  }

  if (!configured || editingProfile) {
    const missingFields = targetSuggestion?.missingFields || [];
    const profileNeedsUpdate = missingFields.length > 0;
    const targetFieldsReady =
      targetsGenerated &&
      Number(profileForm.dailyCaloriesTarget) > 0 &&
      Number(profileForm.dailyProteinTarget) > 0;
    const summaryInputs = targetSuggestion?.inputs || {};
    const summaryPlan = summaryInputs.workoutPlan || {};

    return (
      <div className="nutrition-page nutrition-setup-page">
        <header className="nutriscan-title">
          <span className="nutriscan-scan-icon"><Icon name="scan" size={28} /></span>
          <div><h1>NutriScan Workspace</h1><p>Review suggested targets from your fitness profile before tracking today&apos;s food.</p></div>
        </header>
        {profileError ? <ErrorState message={profileError} /> : null}
        <form className="nutrition-profile-card" onSubmit={handleProfileSubmit} noValidate>
          <div className="section-heading">
            <p className="eyebrow">Smart target setup</p>
            <h2>{profile ? "Review your nutrition targets" : "Generate suggested daily targets"}</h2>
            <p>The Nutritionist AI builds a recommendation from your fitness profile and workout plan. Add only the safety constraints or context that matter to you.</p>
          </div>
          {profileNeedsUpdate ? (
            <section className="nutrition-missing-profile">
              <div>
                <strong>Update your Fitness Profile</strong>
                <p>The Nutritionist AI only uses saved metric profile data. Missing or invalid: {missingFields.join(", ")}.</p>
              </div>
              <Link className="button button--ghost" to="/onboarding">Update Fitness Profile</Link>
            </section>
          ) : null}
          <section className="nutrition-profile-summary">
            <div className="section-heading">
              <p className="eyebrow">Fitness profile used by the AI</p>
              <h3>Your training context</h3>
            </div>
            <div className="nutrition-summary-grid">
              <span><small>Goal</small><strong>{summaryInputs.trainingGoal || traineeProfile?.goal || "Not set"}</strong></span>
              <span><small>Age</small><strong>{summaryInputs.age || traineeProfile?.age || "Not set"}</strong></span>
              <span><small>Height</small><strong>{summaryInputs.height ? `${formatNumber(summaryInputs.height, 1)} cm` : traineeProfile?.height ? `${traineeProfile.height} cm` : "Not set"}</strong></span>
              <span><small>Weight</small><strong>{summaryInputs.weight ? `${formatNumber(summaryInputs.weight, 1)} kg` : traineeProfile?.weight ? `${traineeProfile.weight} kg` : "Not set"}</strong></span>
              <span><small>Training level</small><strong>{summaryInputs.trainingLevel || traineeProfile?.level || "Not set"}</strong></span>
              <span><small>Training frequency</small><strong>{summaryInputs.trainingDaysPerWeek || traineeProfile?.trainingDaysPerWeek || "Not set"} days/week</strong></span>
              <span><small>Workout plan</small><strong>{summaryPlan.goal || traineeProfile?.preferredStyle || "No generated plan yet"}</strong></span>
              <span><small>Session style</small><strong>{summaryPlan.durationMinutes ? `${summaryPlan.durationMinutes} minutes` : traineeProfile?.preferredStyle || "Not set"}</strong></span>
              <span><small>Existing injuries</small><strong>{traineeProfile?.injuries?.length ? traineeProfile.injuries.join(", ") : "None recorded"}</strong></span>
              <span><small>Existing limitations</small><strong>{traineeProfile?.limitations?.length ? traineeProfile.limitations.join(", ") : "None recorded"}</strong></span>
            </div>
          </section>
          <div className="nutrition-profile-grid">
            <label>Allergies (optional)<input name="allergies" value={profileForm.allergies} onChange={handleProfileChange} placeholder="milk, peanuts, or leave blank" /></label>
            <label>Limitations (optional)<input name="medicalRestrictions" value={profileForm.medicalRestrictions} onChange={handleProfileChange} placeholder="lactose sensitivity, or leave blank" /></label>
          </div>
          <label>Anything else the nutritionist should know? (optional)<input name="freeTextNeeds" value={profileForm.freeTextNeeds} onChange={handleProfileChange} placeholder="Meal schedule, food preferences, energy concerns, or leave blank" /></label>
          <div className="section-heading">
            <p className="eyebrow">AI-generated targets</p>
            <p>These fields stay empty until you ask the Nutritionist AI, then remain editable.</p>
          </div>
          <div className="nutrition-profile-grid">
            <label>Daily calories<input name="dailyCaloriesTarget" type="number" min="500" max="10000" value={profileForm.dailyCaloriesTarget} onChange={handleProfileChange} placeholder="Not generated yet" readOnly={!targetsGenerated} /></label>
            <label>Daily protein (g)<input name="dailyProteinTarget" type="number" min="10" max="500" value={profileForm.dailyProteinTarget} onChange={handleProfileChange} placeholder="Not generated yet" readOnly={!targetsGenerated} /></label>
            <label>Suggested dietary approach<input name="dietaryPreferences" value={profileForm.dietaryPreferences} onChange={handleProfileChange} placeholder="Generated by the Nutritionist AI" /></label>
          </div>
          {targetSuggestion?.canCalculate && targetFieldsReady ? (
            <div className="nutrition-target-explanation">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>
                  {targetSuggestion.generationSource === "groq"
                    ? `Generated by ${targetSuggestion.specialistName || "Nutritionist AI"}`
                    : "Suggested from your fitness profile"}
                </strong>
                <p>{targetSuggestion.estimateNote}</p>
                {targetSuggestion.mealGuidance ? <p><strong>Meal direction:</strong> {targetSuggestion.mealGuidance}</p> : null}
              </div>
              <InfoTooltip label="How suggested nutrition targets are calculated">
                The backend calculates a validated Mifflin-St Jeor baseline from your profile and workout plan. The Nutritionist AI reviews that safe range and returns editable calorie and protein targets.
              </InfoTooltip>
            </div>
          ) : targetSuggestion?.missingFields?.includes("traineeProfile") ? (
            <div className="nutriscan-inline-state error">
              <strong>Fitness Profile required</strong>
              <span>Complete onboarding before generating nutrition targets.</span>
            </div>
          ) : null}
          <div className="button-row">
            <button className="button button--ghost" type="button" onClick={handleGenerateTargets} disabled={actionStatus === "generating-targets" || profileNeedsUpdate}>{actionStatus === "generating-targets" ? "Nutritionist AI is calculating..." : profile ? "Recalculate with Nutritionist AI" : "Ask Nutritionist AI"}</button>
            <button className="button button--primary" type="submit" disabled={actionStatus === "saving-profile" || !targetFieldsReady}>{actionStatus === "saving-profile" ? "Saving..." : "Save Nutrition Profile"}</button>
            {configured ? <button className="button button--ghost" type="button" onClick={() => setEditingProfile(false)}>Cancel</button> : null}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`nutrition-page nutriscan-workspace${demoMode ? " nutriscan-workspace--demo" : ""}`}>
      {demoMode ? <div className="nutriscan-demo-badge">Visual QA demo · no data is saved</div> : null}
      <section className="nutriscan-top">
        <header className="nutriscan-title">
          <span className="nutriscan-scan-icon"><Icon name="scan" size={28} /></span>
          <div>
            <h1>NutriScan Workspace</h1>
            <p>Track today&apos;s food, evaluate products and make smarter choices.</p>
          </div>
        </header>
        <div className="nutriscan-kpi-grid">
          <NutritionProgress label="Calories" value={totals.calories} target={calorieTarget} unit="kcal" icon="calories" />
          <NutritionProgress label="Protein" value={totals.protein} target={proteinTarget} unit="g" icon="protein" />
          <article className="nutriscan-kpi">
            <div className="nutriscan-kpi__label"><span className="nutriscan-kpi__icon"><Icon name="remaining" size={17} /></span><strong>Remaining</strong><InfoTooltip label="How remaining calories are calculated">Your calorie target minus foods logged today.</InfoTooltip></div>
            <p><b>{formatNumber(remainingCalories)}</b> kcal</p>
            <small>{calorieTarget ? `${Math.max(0, Math.round(remainingCalories / calorieTarget * 100))}% of daily goal left` : `${formatNumber(remainingProtein, 1)}g protein left`}</small>
          </article>
          <article className={`nutriscan-kpi nutriscan-kpi--insight nutriscan-kpi--${insight.type}`}>
            <div className="nutriscan-kpi__label"><span className="nutriscan-kpi__icon nutriscan-kpi__icon--amber"><Icon name="insight" size={17} /></span><strong>Today Insight</strong></div>
            <p><b>{insight.text}</b></p>
            <small>{insight.action}</small>
            <button className="nutriscan-text-cta" type="button" onClick={showInsightDetails}>View details <Icon name="arrow" size={14} /></button>
          </article>
        </div>
      </section>

      {pageError ? <div className="message message--error">{pageError}</div> : null}
      {message ? <div className="nutriscan-toast" role="status"><Icon name="check" size={16} />{message}</div> : null}

      <section className="nutriscan-flow-grid">
        <article className="nutriscan-card nutriscan-search">
          <div className="nutriscan-card__heading"><span className="nutriscan-section-icon"><Icon name="search" size={18} /></span><div><h2>1. Search &amp; Discover</h2><p>Find foods from Open Food Facts <InfoTooltip label="About Open Food Facts">Open Food Facts is the external source for product nutrition, serving, ingredient, and allergen data.</InfoTooltip></p></div></div>
          <form className="nutrition-search-form" onSubmit={handleSearch}>
            <span className="nutrition-search-input"><Icon name="search" size={17} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search food or brand" minLength="2" required /></span>
            <button className="button button--primary" type="submit" disabled={searchStatus === "loading"}>{searchStatus === "loading" ? "Searching..." : "Search"}</button>
          </form>
          <NutritionQuickActions active={quickMode} onRecent={showRecentFoods} onFavorites={showFavorites} onEstimate={() => openMealEstimate()} />
          {quickError ? <div className="nutriscan-inline-state error">{quickError}</div> : null}
          {quickMode === "search" && searchStatus === "idle" ? <WorkspaceEmpty icon="package" title="Discover packaged foods" message="Search by product or brand to compare verified nutrition data." steps={["Nutrition completeness", "Serving availability", "Safety-aware evaluation"]} /> : null}
          {searchError ? <div className="nutriscan-inline-state error"><strong>Food search is unavailable.</strong><span>{searchError}</span><button type="button" onClick={() => runSearch(lastSearchQuery || searchQuery)}>Retry</button></div> : null}
          {quickMode === "search" && searchStatus === "success" && displayedResults.length === 0 ? <WorkspaceEmpty icon="search" title="No products found" message="Try a brand name or a more specific packaged-food search." /> : null}
          {quickMode === "favorites" && displayedResults.length === 0 ? <WorkspaceEmpty icon="star" title="No favorites yet" message="Select a product and use the bookmark action to save it here." /> : null}
          {quickMode === "recent" && displayedResults.length === 0 ? <WorkspaceEmpty icon="remaining" title="No recent foods yet" message="Foods you log will appear here for safe re-selection." /> : null}
          {displayedResults.length ? <strong className="nutriscan-results-label">{quickMode === "favorites" ? "Favorites" : quickMode === "recent" ? "Recent foods" : "Search results"}</strong> : null}
          <div className="nutrition-search-results">
            {displayedResults.map((food) => {
              const selected = selectedFood?.barcode === food.barcode;
              return (
                <button key={`${food.source || "food"}-${food.barcode || food.name}`} type="button" disabled={food.source !== "ai_estimate" && !food.nutritionComplete || actionStatus === "loading-food"} className={selected ? "selected" : ""} onClick={() => handleSelectFood(food)}>
                  <FoodVisual product={food} compact />
                  <div>
                    <strong>{food.name}</strong>
                    <small>{food.brand || "Brand not listed"}</small>
                    <span className="nutrition-result-badges">
                      {food.source === "ai_estimate" ? <b className="estimated">AI estimate</b> : <b className={food.nutritionComplete ? "complete" : "missing"}>{food.nutritionComplete ? "Complete nutrition" : "Missing nutrition data"}</b>}
                      {food.servingGrams ? <b className="serving">Serving available</b> : null}
                    </span>
                  </div>
                  <i className={selected ? "selected" : ""}>{food.source === "ai_estimate" || food.nutritionComplete ? selected ? <Icon name="check" size={15} /> : <Icon name="arrow" size={15} /> : "Cannot be evaluated"}</i>
                </button>
              );
            })}
          </div>
          <footer className="nutriscan-source-row"><span>Data source: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a></span><small>Some products may have incomplete data.</small><b className={searchError ? "offline" : "online"}>{searchError ? "Service unavailable" : "Service online"}</b></footer>
        </article>

        <article className="nutriscan-card nutriscan-product">
          <div className="nutriscan-card__heading"><span className="nutriscan-section-icon"><Icon name="package" size={18} /></span><div><h2>2. Selected Product &amp; Portion</h2></div></div>
          {productError ? <div className="nutriscan-inline-state error"><strong>Product details could not be loaded.</strong><span>{productError}</span></div> : null}
          {selectedFood ? (
            <>
              <div className="nutriscan-selected-product">
                <FoodVisual product={selectedFood} />
                <div><h3>{selectedFood.name}</h3><p>{selectedFood.brand || "Brand not listed"}</p><span className={`nutrition-data-badge ${selectedFood.nutritionComplete ? "complete" : "missing"}`}>{selectedFood.nutritionComplete ? "Complete nutrition" : "Missing nutrition data"}</span></div>
                <button className={`nutrition-favorite-toggle ${favoriteBarcodes.has(String(selectedFood.barcode)) ? "active" : ""}`} type="button" onClick={() => toggleFavorite(selectedFood)} aria-label={favoriteBarcodes.has(String(selectedFood.barcode)) ? "Remove from favorites" : "Add to favorites"}><Icon name="star" size={18} /></button>
              </div>
              <div className="nutriscan-product-meta">
                <p><strong>Ingredients:</strong> {selectedFood.ingredients || "Unknown"}</p>
                <p><strong>Allergens:</strong> {selectedFood.allergensKnown ? selectedFood.allergens.join(", ") || "None listed" : "Unknown"}</p>
              </div>
              <div><strong className="nutriscan-field-title">Choose portion</strong><div className="nutrition-portion-picker">
                {[25, 50, 100].map((grams) => <button className={Number(servingGrams) === grams ? "active" : ""} key={grams} type="button" onClick={() => changePortion(grams)}>{grams}g</button>)}
                {selectedFood.servingGrams ? <button className={Number(servingGrams) === Number(selectedFood.servingGrams) ? "active" : ""} type="button" onClick={() => changePortion(selectedFood.servingGrams)}>1 serving ({formatNumber(selectedFood.servingGrams, 1)}g)</button> : null}
              </div></div>
              <label className="nutriscan-custom-portion">Custom (grams)<span><input type="number" min="1" max="2000" value={servingGrams} onChange={(event) => changePortion(event.target.value)} /> g</span></label>
              {preview && validPortion ? (
                <div className="nutriscan-portion-preview">
                  <h3>Portion Preview <small>({formatNumber(servingGrams, 1)}g)</small></h3>
                  <div>{[
                    ["Calories", preview.calories, "kcal", "calories"],
                    ["Protein", preview.protein, "g", "protein"],
                    ["Carbs", preview.carbs, "g", "package"],
                    ["Fat", preview.fat, "g", "calories"],
                    ["Sugar", preview.sugar, "g", "package"]
                  ].filter(([, value]) => value !== null).map(([label, value, unit, icon]) => <span key={label}><i><Icon name={icon} size={14} /></i><small>{label}</small><strong>{formatNumber(value, 1)}</strong><b>{unit}</b></span>)}</div>
                </div>
              ) : <div className="field-error">Enter a portion between 1g and 2000g.</div>}
              <div className="nutriscan-reevaluate-note"><Icon name="warning" size={17} />If you change the portion, you must re-evaluate for the new portion to get an accurate result.</div>
              <button className="button button--primary nutriscan-full-button" type="button" onClick={handleEvaluate} disabled={!validPortion || !selectedFood.nutritionComplete || actionStatus === "evaluating"}><Icon name="scan" size={18} />{actionStatus === "evaluating" ? "Evaluating..." : "Evaluate for this portion"}</button>
              <a className="nutrition-source-link" href={selectedFood.sourceUrl} target="_blank" rel="noreferrer">View source on Open Food Facts</a>
            </>
          ) : <WorkspaceEmpty icon="package" title="Choose a product" message="Select a complete search result to unlock portion controls." steps={["Choose a portion", "Preview real macros", "Evaluate for your targets"]} />}
        </article>

        <article className="nutriscan-card nutriscan-result" id="nutrition-ai-result">
          <div className="nutriscan-card__heading">
            <span className="nutriscan-section-icon"><Icon name="insight" size={18} /></span>
            <div><h2>3. AI Nutritionist Result <InfoTooltip label="How the nutrition result works">Open Food Facts provides nutrition numbers. AI explains suitability using backend-calculated values and does not provide medical advice.</InfoTooltip></h2></div>
            {evaluation ? <StatusBadge status={evaluation.status} /> : null}
          </div>
          {evaluationError ? <div className="nutriscan-inline-state error"><strong>Evaluation unavailable.</strong><span>{evaluationError}</span></div> : null}
          {evaluation ? (
            <>
              <div className={`nutriscan-result-banner nutrition-status-panel--${evaluation.status}`}><Icon name="shield" size={20} />{evaluation.status === "not_recommended" ? "This portion may not fit well today." : evaluation.status === "caution" ? "This choice is usable, with some considerations." : evaluation.status === "recommended" ? "This food fits your current nutrition targets well." : "This food can fit depending on the rest of your day."}</div>
              <section className="nutriscan-result-copy">
                <h3>Why this result</h3><p>{evaluation.explanation}</p>
                <h3>Practical suggestion</h3><div className="nutriscan-suggestion"><Icon name="insight" size={20} /><span>{evaluation.practicalSuggestion}</span></div>
                {evaluation.portionGuidance ? (
                  <>
                    <h3>Portion guidance</h3>
                    <div className="nutriscan-suggestion">
                      <Icon name="remaining" size={20} />
                      <span><strong>{evaluation.portionGuidance.label}</strong><br />{evaluation.portionGuidance.message}{evaluation.portionGuidance.suggestedServingGrams ? ` Try about ${formatNumber(evaluation.portionGuidance.suggestedServingGrams, 1)}g if you want this food today.` : ""}</span>
                    </div>
                  </>
                ) : null}
              </section>
              <section><h3>Projected totals after adding ({formatNumber(evaluation.servingGrams, 1)}g)</h3><div className="nutriscan-projected-grid">
                {[
                  ["Calories", evaluation.projectedTotals.calories, evaluation.targets.calories, "kcal", "calories"],
                  ["Protein", evaluation.projectedTotals.protein, evaluation.targets.protein, "g", "protein"],
                  ["Carbs", evaluation.projectedTotals.carbs, evaluation.targets.carbs || null, "g", "package"],
                  ["Fat", evaluation.projectedTotals.fat, evaluation.targets.fat || null, "g", "calories"]
                ].map(([label, value, target, unit, icon]) => <div key={label}><span><Icon name={icon} size={15} />{label}</span><strong>{formatNumber(value, 1)}{target ? ` / ${formatNumber(target, 1)}` : ""} {unit}</strong>{target ? <><div className="nutriscan-progress"><span style={{ width: `${Math.min(100, value / target * 100)}%` }} /></div><small>{Math.round(value / target * 100)}%</small></> : null}</div>)}
              </div></section>
              <section className="nutriscan-safety"><h3>Allergen &amp; Safety</h3>
                {evaluation.warnings.length ? evaluation.warnings.map((warning) => <p className={/allergen/i.test(warning) ? "critical" : ""} key={warning}><Icon name="warning" size={16} />{warning}</p>) : <p><Icon name="shield" size={16} />No target or allergen warnings were triggered.</p>}
                <small>{evaluation.guidanceSource === "groq" ? "AI explanation based on verified values." : evaluation.guidanceSource === "safety_override" ? "Safety rules determined this result without an AI call." : "Deterministic guidance shown because AI was unavailable."}</small>
              </section>
              <div className="nutriscan-disclaimer"><span>i</span>Open Food Facts provides nutrition numbers. AI explains suitability, not medical advice.</div>
              <div className="nutriscan-result-actions"><button className="button button--primary nutriscan-full-button" type="button" onClick={handleAddFood} disabled={actionStatus === "adding"}><Icon name="add" size={19} />{actionStatus === "adding" ? "Adding..." : "Add to Today"}</button><button className={`nutriscan-bookmark ${favoriteBarcodes.has(String(selectedFood?.barcode)) ? "active" : ""}`} type="button" onClick={() => toggleFavorite(selectedFood)} aria-label={favoriteBarcodes.has(String(selectedFood?.barcode)) ? "Remove product from favorites" : "Add product to favorites"}><Icon name="bookmark" size={20} /></button></div>
            </>
          ) : <WorkspaceEmpty icon="shield" title="Your personalized result will appear here" message="Choose a complete product and evaluate a portion to see suitability, projected totals, and safety guidance." steps={["Real Open Food Facts values", "Personalized target comparison", "Practical AI explanation"]} />}
        </article>
      </section>

      <section className="nutriscan-bottom-grid">
        <article className="nutriscan-card nutriscan-log">
          <div className="nutriscan-card__heading"><span className="nutriscan-section-icon"><Icon name="package" size={18} /></span><div><h2>4. Today&apos;s Food Log</h2></div></div>
          {logError ? <div className="nutriscan-inline-state error">{logError}</div> : null}
          {today?.items?.length ? (
            <div className="nutriscan-log-table">
              <div className="nutriscan-log-head"><span>Food</span><span>Brand</span><span>Portion</span><span>Calories</span><span>Protein</span><span>Status</span><span>Added</span><span>Actions</span></div>
              {today.items.map((item) => (
                <div className="nutriscan-log-group" key={item.nutritionLogItemId}>
                  <div className="nutriscan-log-row">
                    <div className="nutriscan-log-food"><FoodVisual product={item} compact /><span><strong>{item.foodName}</strong></span></div>
                    <span>{item.brand || "Open Food Facts"}</span><span>{item.portionDescription || (item.servingGrams ? `${formatNumber(item.servingGrams, 1)}g` : "Estimated portion")}</span><span>{item.source === "ai_estimate" ? "~" : ""}{formatNumber(item.calories)} kcal</span><span>{item.source === "ai_estimate" ? "~" : ""}{formatNumber(item.protein, 1)}g</span><StatusBadge status={item.evaluationStatus} /><span>{item.createDate ? new Date(item.createDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}</span>
                    <div className="nutriscan-log-actions"><button type="button" onClick={() => toggleItem(item.nutritionLogItemId)}>{expandedItems.has(item.nutritionLogItemId) ? "Hide" : item.source === "ai_estimate" ? "Why estimated?" : item.evaluationStatus === "recommended" ? "Why recommended?" : "Reason"}</button><button className="delete" type="button" aria-label={`Delete ${item.foodName}`} onClick={() => handleDelete(item)} disabled={actionStatus === `deleting-${item.nutritionLogItemId}`}><Icon name="trash" size={16} /></button></div>
                  </div>
                  {expandedItems.has(item.nutritionLogItemId) ? <div className="nutriscan-log-details"><p><strong>{item.source === "ai_estimate" ? "Why estimated:" : "Saved reason:"}</strong> {item.evaluationReason}</p>{item.estimateAssumptions?.length ? <p><strong>Assumptions:</strong> {item.estimateAssumptions.join(", ")}</p> : null}<p><strong>{item.source === "ai_estimate" ? "Uncertainty:" : "Suggestion:"}</strong> {item.practicalSuggestion}</p><small>Guidance: {item.source === "ai_estimate" ? `AI estimate${item.estimateConfidence ? ` · ${item.estimateConfidence} confidence` : ""}` : item.guidanceSource === "groq" ? "AI explanation" : item.guidanceSource === "safety_override" ? "Safety override" : "Deterministic fallback"}</small></div> : null}
                </div>
              ))}
              <div className="nutriscan-log-total"><strong>Daily total</strong><span>{formatNumber(totals.calories)} kcal</span><span>{formatNumber(totals.protein, 1)}g protein</span><button type="button" onClick={toggleAllDetails}>{expandedItems.size === today.items.length ? "Hide details" : "View full log"} <Icon name="arrow" size={14} /></button></div>
            </div>
          ) : <WorkspaceEmpty icon="add" title="Build today’s food log" message="Search above, evaluate a portion, and add your first food. Your totals and saved recommendation will appear here." />}
        </article>

        <aside className={`nutriscan-card nutriscan-insight nutriscan-insight--${insight.type}`} id="nutrition-today-insight">
          <div className="nutriscan-card__heading"><span className="nutriscan-section-icon"><Icon name="insight" size={18} /></span><div><h2>Today Insight</h2></div></div>
          <div className="nutriscan-insight-ring" style={{ "--progress": `${Math.min(100, proteinTarget ? totals.protein / proteinTarget * 100 : 0)}%` }}><strong>{proteinTarget ? Math.round(totals.protein / proteinTarget * 100) : 0}%</strong><span>of protein goal</span></div>
          <div><p>You&apos;ve logged <strong>{formatNumber(totals.protein, 1)}g</strong> of protein so far.</p><h3>{remainingProtein > 0 ? `You have ${formatNumber(remainingProtein, 1)}g left to reach your goal.` : "You reached today’s protein goal."}</h3><p>{formatNumber(remainingCalories)} kcal remaining today.</p><div className="nutriscan-focus-next"><strong>Focus next:</strong><span><i><Icon name="check" size={11} /></i>{remainingProtein > 0 ? "Add a lean protein source" : "Keep meals balanced"}</span><span><i><Icon name="check" size={11} /></i>{remainingCalories > 0 ? "Choose a portion within remaining calories" : "Keep remaining choices light"}</span></div></div>
          <div className="nutriscan-secondary-macros"><span><strong>{formatNumber(totals.carbs, 1)}g</strong> carbs</span><span><strong>{formatNumber(totals.fat, 1)}g</strong> fat</span><span><strong>{totals.sugar === null ? "—" : `${formatNumber(totals.sugar, 1)}g`}</strong> {sugarComplete ? "sugar" : "known sugar"}</span></div>
          <button className="nutriscan-insight-cta" type="button" onClick={showEvaluationWorkspace}>See personalized recommendations <Icon name="arrow" size={17} /></button>
          <button className="nutriscan-edit-targets" type="button" onClick={() => setEditingProfile(true)}>Edit nutrition targets</button>
        </aside>
      </section>
      <MealEstimateModal
        form={mealEstimateForm}
        photo={mealPhoto}
        estimateResult={mealEstimateResult}
        error={mealEstimateError}
        status={actionStatus}
        editing={editingEstimate}
        onChange={handleMealEstimateChange}
        onPhotoChange={handleMealPhotoChange}
        onRemovePhoto={removeMealPhoto}
        onClose={closeMealEstimate}
        onEstimate={handleEstimateMeal}
        onEdit={() => setEditingEstimate((current) => !current)}
        onReviewChange={handleEstimateReviewChange}
        onAdd={handleAddEstimatedMeal}
      />
    </div>
  );
}

export default Nutrition;
