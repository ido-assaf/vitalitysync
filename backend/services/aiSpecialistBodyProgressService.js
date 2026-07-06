const { withEvidence } = require("./aiSpecialistProfessionalRulePackService");

const BODY_PROGRESS_VERSION = "fitness_body_progress_v0.1";
const MIN_MEASUREMENTS = 2;

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function measurementTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function measurementsFromProfile(profile = {}) {
  const data = plain(profile) || {};
  const preferences =
    data.specialtyPreferences && typeof data.specialtyPreferences === "object"
      ? data.specialtyPreferences
      : {};
  const measurements = Array.isArray(preferences.bodyProgressMeasurements)
    ? preferences.bodyProgressMeasurements
    : [];

  return measurements
    .map((measurement) => ({
      measuredAt: measurement.measuredAt || measurement.date || null,
      bodyWeightKg: numeric(measurement.bodyWeightKg ?? measurement.weightKg ?? measurement.weight),
      waistCm: numeric(measurement.waistCm),
      chestCm: numeric(measurement.chestCm),
      armCm: numeric(measurement.armCm),
      thighCm: numeric(measurement.thighCm),
      bodyFatPercent: numeric(measurement.bodyFatPercent),
      bodyFatMethod: normalizedText(measurement.bodyFatMethod || measurement.measurementMethod || "unknown")
    }))
    .sort((left, right) => measurementTime(left.measuredAt) - measurementTime(right.measuredAt));
}

function delta(first, last, field) {
  const firstValue = numeric(first?.[field]);
  const lastValue = numeric(last?.[field]);

  return firstValue === null || lastValue === null ? null : round(lastValue - firstValue);
}

function isDown(value, threshold = 0.1) {
  return Number.isFinite(Number(value)) && Number(value) < -threshold;
}

function isUp(value, threshold = 0.1) {
  return Number.isFinite(Number(value)) && Number(value) > threshold;
}

function isStable(value, threshold = 1) {
  return Number.isFinite(Number(value)) && Math.abs(Number(value)) <= threshold;
}

function goalType(profile = {}) {
  const goal = normalizedText(profile.goal);

  if (goal.includes("strength")) return "strength";
  if (goal.includes("muscle") || goal.includes("mass") || goal.includes("hypertrophy")) return "muscle_gain";
  if (goal.includes("fat") || goal.includes("weight loss") || goal.includes("lean")) return "fat_loss";
  return "general_health";
}

function hasStablePerformance(progressSummary = {}) {
  const progress = Array.isArray(progressSummary.exerciseProgress) ? progressSummary.exerciseProgress : [];

  if (progress.length === 0) return false;

  return !progress.some((item) => item.trend === "declining");
}

function waistToHeight(waistCm, heightCm) {
  const waist = numeric(waistCm);
  const height = numeric(heightCm);

  return waist && height ? round(waist / height) : null;
}

function ratioDelta(firstWaistCm, lastWaistCm, heightCm) {
  const firstRatio = waistToHeight(firstWaistCm, heightCm);
  const lastRatio = waistToHeight(lastWaistCm, heightCm);

  return firstRatio === null || lastRatio === null ? null : round(lastRatio - firstRatio);
}

function buildBodyProgressSignal({ profile = {}, progressSummary = {} } = {}) {
  const measurements = measurementsFromProfile(profile);
  const base = {
    version: BODY_PROGRESS_VERSION,
    applyMode: "preview_only",
    measurementCount: measurements.length,
    status: "insufficient_data",
    role: "supporting_trend_signal",
    signals: [],
    deltas: {},
    recommendation: "Collect repeated body measurements before using them as progress signals."
  };

  if (measurements.length < MIN_MEASUREMENTS) {
    return withEvidence(
      {
        ...base,
        reasonCodes: ["insufficient_body_measurement_history"]
      },
      "rule_body_trend_only",
      { confidence: "low" }
    );
  }

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const deltas = {
    bodyWeightKg: delta(first, last, "bodyWeightKg"),
    waistCm: delta(first, last, "waistCm"),
    chestCm: delta(first, last, "chestCm"),
    armCm: delta(first, last, "armCm"),
    thighCm: delta(first, last, "thighCm"),
    bodyFatPercent: delta(first, last, "bodyFatPercent"),
    waistToHeightRatio: ratioDelta(first.waistCm, last.waistCm, profile.height)
  };
  const performanceStable = hasStablePerformance(progressSummary);
  const goal = goalType(profile);
  const signals = [];

  if (isDown(deltas.bodyWeightKg) && isDown(deltas.waistCm) && performanceStable) {
    signals.push("fat_loss_trend_supported");
  }
  if (isDown(deltas.waistCm) && isDown(deltas.bodyFatPercent, 0.2) && performanceStable) {
    signals.push("recomposition_trend_supported");
  }
  if (
    (isUp(deltas.chestCm) || isUp(deltas.armCm) || isUp(deltas.thighCm)) &&
    isStable(deltas.waistCm) &&
    performanceStable
  ) {
    signals.push("muscle_gain_trend_supported");
  }
  if (isUp(deltas.waistCm) || isUp(deltas.bodyFatPercent, 0.2)) {
    signals.push("central_adiposity_or_body_fat_increase");
  }

  const ruleId = signals.includes("fat_loss_trend_supported") && goal === "fat_loss"
    ? "rule_body_fat_loss_support"
    : signals.includes("recomposition_trend_supported")
      ? "rule_body_recomp_support"
      : signals.includes("fat_loss_trend_supported") || signals.includes("central_adiposity_or_body_fat_increase")
      ? "rule_body_fat_loss_support"
      : "rule_body_trend_only";

  return withEvidence(
    {
      ...base,
      status: signals.length > 0 ? "trend_detected" : "no_clear_trend",
      goalContext: goal,
      signals,
      deltas,
      latestWaistToHeightRatio: waistToHeight(last.waistCm, profile.height),
      latestBodyFatMethod: last.bodyFatMethod || "unknown",
      reasonCodes: signals.length > 0 ? signals : ["no_clear_body_trend"],
      recommendation:
        "Use body measurements only as supporting trend signals alongside performance, pain, recovery, and adherence."
    },
    ruleId
  );
}

module.exports = {
  BODY_PROGRESS_VERSION,
  buildBodyProgressSignal,
  _internals: {
    goalType,
    measurementsFromProfile
  }
};
