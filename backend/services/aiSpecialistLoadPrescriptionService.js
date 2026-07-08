const { withEvidence } = require("./aiSpecialistProfessionalRulePackService");
const { REASON_CODES } = require("../constants/aiSpecialistReasonCodes");

const LOAD_PRESCRIPTION_VERSION = "fitness_load_prescription_v0.1";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function profileGoal(profile = {}) {
  const text = normalizedText(profile?.goal);

  if (text.includes("strength") || text.includes("power")) return "strength";
  if (text.includes("muscle") || text.includes("hypertrophy") || text.includes("mass")) return "hypertrophy";
  if (text.includes("fat") || text.includes("weight loss") || text.includes("lean")) return "fat_loss";
  return "general";
}

function readinessReasonCodes(adaptationDecisions = {}) {
  return unique([
    ...(adaptationDecisions.readinessReasonCodes || []),
    ...(adaptationDecisions.reasonCodes || [])
  ]);
}

function hasAny(values, candidates) {
  return candidates.some((candidate) => values.includes(candidate));
}

function baseRecommendation(exerciseProgress, reasonCodes = []) {
  return {
    exerciseId: exerciseProgress?.exerciseId ?? null,
    exerciseName: exerciseProgress?.exerciseName || "Unknown exercise",
    applyMode: "preview_only",
    reasonCodes: unique(reasonCodes)
  };
}

function recommendationForExercise({ exerciseProgress, adaptationDecisions = {}, profile = {} }) {
  const readinessReasons = readinessReasonCodes(adaptationDecisions);
  const exerciseReasons = exerciseProgress.reasonCodes || [];
  const reasonCodes = unique([...readinessReasons, ...exerciseReasons]);
  const trend = exerciseProgress.trend || "insufficient_data";
  const exposures = Number(exerciseProgress.exposures || 0);
  const goal = profileGoal(profile);

  if (hasAny(reasonCodes, [REASON_CODES.RECURRING_PAIN, REASON_CODES.PAIN_SIGNAL, REASON_CODES.RECURRING_CHECK_IN_PAIN])) {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.PAIN_BLOCKS_PROGRESSION]),
        decision: "pause_progression",
        strategy: "review_pain_before_load_change",
        recommendation: "Pause load progression and review the painful pattern before changing load."
      },
      "rule_pause_progression_on_pain"
    );
  }

  if (
    hasAny(reasonCodes, [
      REASON_CODES.RECOVERY_RISK,
      REASON_CODES.FATIGUE_SIGNAL,
      REASON_CODES.REPEATED_FATIGUE_SIGNAL,
      REASON_CODES.TOO_HARD
    ])
  ) {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.RECOVERY_BLOCKS_PROGRESSION]),
        decision: "reduce_load_or_volume_preview",
        strategy: "reduce_training_stress",
        recommendation: "Use a conservative reduction in load, volume, or difficulty before progressing."
      },
      "rule_reduce_on_recovery_risk"
    );
  }

  if (trend === "declining") {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.DECLINING_PERFORMANCE]),
        decision: "reduce_load_or_volume_preview",
        strategy: "reduce_training_stress",
        recommendation: "Do not increase load while recent performance is declining."
      },
      "rule_reduce_on_recovery_risk"
    );
  }

  if (exposures < 3 || trend === "insufficient_data") {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.INSUFFICIENT_EXERCISE_HISTORY]),
        decision: "collect_more_data",
        strategy: "repeat_and_log",
        recommendation: "Keep logging sets, reps, load, and completion before changing the prescription."
      },
      "rule_load_cautious_progression",
      { confidence: "low" }
    );
  }

  if (trend === "plateau") {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.PLATEAU_3_PLUS_EXPOSURES]),
        decision: "keep_load",
        strategy: "review_reps_setup_or_recovery",
        recommendation: "Keep load stable and review reps, setup, technique, or recovery before a larger change."
      },
      "rule_load_cautious_progression"
    );
  }

  if (trend === "progressing" && goal === "strength") {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [
          ...reasonCodes,
          REASON_CODES.PROGRESSING_NO_PAIN,
          REASON_CODES.STRENGTH_GOAL
        ]),
        decision: "increase_load_preview",
        strategy: "small_load_increase_when_completed",
        recommendation: "Consider a small load increase only after the current prescription is completed cleanly."
      },
      "rule_load_strength_priority"
    );
  }

  if (trend === "progressing") {
    return withEvidence(
      {
        ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.PROGRESSING_NO_PAIN]),
        decision: "add_reps_first",
        strategy: "add_reps_before_load",
        recommendation: "Prefer adding reps first or a small load increase only if completion stays stable."
      },
      "rule_load_hypertrophy_rep_flexibility"
    );
  }

  return withEvidence(
    {
      ...baseRecommendation(exerciseProgress, [...reasonCodes, REASON_CODES.NO_CLEAR_LOAD_CHANGE]),
      decision: "keep_load",
      strategy: "maintain_current_prescription",
      recommendation: "Keep load stable until the trend becomes clearer."
    },
    "rule_load_cautious_progression"
  );
}

function buildLoadPrescriptionRecommendations({
  progressSummary,
  adaptationDecisions = {},
  profile = {}
} = {}) {
  const exerciseProgress = Array.isArray(progressSummary?.exerciseProgress)
    ? progressSummary.exerciseProgress
    : [];

  return {
    version: LOAD_PRESCRIPTION_VERSION,
    applyMode: "preview_only",
    recommendations: exerciseProgress.map((item) =>
      recommendationForExercise({ exerciseProgress: item, adaptationDecisions, profile })
    )
  };
}

module.exports = {
  LOAD_PRESCRIPTION_VERSION,
  buildLoadPrescriptionRecommendations,
  _internals: {
    profileGoal,
    recommendationForExercise
  }
};
