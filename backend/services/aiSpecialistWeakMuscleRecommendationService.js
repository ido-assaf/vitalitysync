const { withEvidence } = require("./aiSpecialistProfessionalRulePackService");

const WEAK_MUSCLE_RECOMMENDATION_VERSION = "fitness_weak_muscle_recommendation_v0.1";
const MIN_ADVANCED_EXERCISE_EXPOSURES = 4;

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function profileLevel(profile = {}) {
  return normalizedText(profile?.level);
}

function isEligibleLevel(profile = {}) {
  const level = profileLevel(profile);
  return level === "intermediate" || level === "advanced" || level === "expert";
}

function reasonCodesFrom({ adaptationDecisions = {}, bodyProgress = {} } = {}) {
  return unique([
    ...(adaptationDecisions.readinessReasonCodes || []),
    ...(adaptationDecisions.reasonCodes || []),
    ...(bodyProgress.reasonCodes || [])
  ]);
}

function hasBlocker(reasonCodes) {
  return reasonCodes.some((reason) =>
    [
      "recurring_pain",
      "pain_signal",
      "recurring_check_in_pain",
      "recovery_risk",
      "fatigue_signal",
      "repeated_fatigue_signal",
      "low_adherence",
      "low_set_completion",
      "declining_performance"
    ].includes(reason)
  );
}

function laggingCandidates(progressSummary = {}) {
  const progress = Array.isArray(progressSummary.exerciseProgress) ? progressSummary.exerciseProgress : [];

  return progress.filter(
    (item) =>
      Number(item.exposures || 0) >= MIN_ADVANCED_EXERCISE_EXPOSURES &&
      (item.trend === "plateau" || item.trend === "declining")
  );
}

function buildWeakMuscleRecommendation({
  profile = {},
  progressSummary = {},
  adaptationDecisions = {},
  bodyProgress = {}
} = {}) {
  const reasonCodes = reasonCodesFrom({ adaptationDecisions, bodyProgress });
  const base = {
    version: WEAK_MUSCLE_RECOMMENDATION_VERSION,
    applyMode: "preview_only",
    role: "advanced_supporting_signal",
    reasonCodes
  };

  if (!isEligibleLevel(profile)) {
    return withEvidence(
      {
        ...base,
        status: "not_applicable",
        decision: "do_not_specialize",
        recommendation: "Do not flag weak-muscle specialization for beginners by default.",
        reasonCodes: unique([...reasonCodes, "beginner_specialization_blocked"])
      },
      "rule_lagging_muscle_candidate"
    );
  }

  if (hasBlocker(reasonCodes)) {
    return withEvidence(
      {
        ...base,
        status: "blocked_by_readiness",
        decision: "do_not_specialize",
        recommendation: "Do not add weak-muscle specialization while safety, adherence, or recovery blockers are present.",
        reasonCodes: unique([...reasonCodes, "readiness_blocks_specialization"])
      },
      "rule_lagging_muscle_intervention_preview"
    );
  }

  const candidates = laggingCandidates(progressSummary);

  if (candidates.length === 0) {
    return withEvidence(
      {
        ...base,
        status: "insufficient_or_no_lagging_signal",
        decision: "collect_more_data",
        recommendation: "Keep collecting exercise history before flagging a lagging muscle."
      },
      "rule_lagging_muscle_candidate",
      { confidence: "low" }
    );
  }

  return withEvidence(
    {
      ...base,
      status: "candidate_detected",
      decision: "weak_muscle_focus_preview",
      candidateExercises: candidates.slice(0, 3).map((item) => ({
        exerciseId: item.exerciseId ?? null,
        exerciseName: item.exerciseName || "Unknown exercise",
        trend: item.trend,
        exposures: item.exposures
      })),
      recommendation:
        "Preview a weak-muscle focus by placing the target earlier, adding limited direct sets, or distributing volume if recovery stays stable."
    },
    "rule_lagging_muscle_intervention_preview"
  );
}

module.exports = {
  WEAK_MUSCLE_RECOMMENDATION_VERSION,
  buildWeakMuscleRecommendation,
  _internals: {
    isEligibleLevel,
    laggingCandidates
  }
};
