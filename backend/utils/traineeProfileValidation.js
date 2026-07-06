const textFieldMessage =
  "Use fitness-related text only; remove links, emails, websites, or unrelated requests.";

const textFields = [
  "equipmentAccess",
  "injuries",
  "limitations",
  "likedExercises",
  "dislikedExercises"
];

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function hasJunkText(value) {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  return [
    /https?:\/\//i,
    /\bwww\./i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\bstack\s*overflow\b/i,
    /\bstackoverflow\b/i,
    /\bgithub\b/i,
    /\bchatgpt\b/i,
    /\bplease\s+(go|visit|open|search|look up|google|browse|click)\b/i,
    /```|<script|select\s+\*|drop\s+table|console\.log/i
  ].some((pattern) => pattern.test(text));
}

function valuesForTextField(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value.split(",");
  }

  return [];
}

function validateProfileMetrics(body) {
  const details = {};
  const age = optionalNumber(body.age);
  const weight = optionalNumber(body.weight);
  const height = optionalNumber(body.height);

  if (age === null) {
    details.age = "age is required and must be between 10 and 100.";
  } else if (!Number.isInteger(age) || age < 10 || age > 100) {
    details.age = "age must be a whole number between 10 and 100.";
  }

  if (weight === null) {
    details.weight = "weight is required and must be between 30 and 350 kilograms.";
  } else if (!Number.isFinite(weight) || weight < 30 || weight > 350) {
    details.weight = "weight must be between 30 and 350 kilograms.";
  }

  if (height === null) {
    details.height = "height is required and must be between 100 and 250 centimeters.";
  } else if (!Number.isFinite(height) || height < 100 || height > 250) {
    details.height = "height must be between 100 and 250 centimeters.";
  }

  return details;
}

function validateProfileTextFields(body) {
  const details = {};

  textFields.forEach((field) => {
    const invalid = valuesForTextField(body[field]).some(hasJunkText);

    if (invalid) {
      details[field] = textFieldMessage;
    }
  });

  const specialtyPreferences =
    typeof body.specialtyPreferences === "object" && body.specialtyPreferences !== null
      ? body.specialtyPreferences
      : {};

  if (hasJunkText(specialtyPreferences.focus)) {
    details["specialtyPreferences.focus"] = textFieldMessage;
  }

  if (hasJunkText(specialtyPreferences.notes)) {
    details["specialtyPreferences.notes"] = textFieldMessage;
  }

  const coachIntake =
    typeof specialtyPreferences.coachIntake === "object" && specialtyPreferences.coachIntake !== null
      ? specialtyPreferences.coachIntake
      : typeof body.coachIntake === "object" && body.coachIntake !== null
        ? body.coachIntake
        : {};

  [
    "desiredOutcome",
    "whatMattersMost",
    "concerns",
    "specificLook",
    "trainingPlace",
    "lifeStage",
    "sexContext",
    "healthContext"
  ].forEach((field) => {
    if (hasJunkText(coachIntake[field])) {
      details[`coachIntake.${field}`] = textFieldMessage;
    }
  });

  if (hasJunkText(body.freeTextNotes)) {
    details.freeTextNotes = textFieldMessage;
  }

  return details;
}

function validateProfileReadyForPlan(profile) {
  const details = validateProfileMetrics(profile || {});

  return Object.keys(details).length > 0 ? details : null;
}

module.exports = {
  optionalNumber,
  textFieldMessage,
  validateProfileMetrics,
  validateProfileReadyForPlan,
  validateProfileTextFields
};
