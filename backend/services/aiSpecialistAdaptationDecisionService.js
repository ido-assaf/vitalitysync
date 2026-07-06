const FITNESS_ADAPTATION_DECISION_VERSION = "fitness_adaptation_decision_v0.1";

const BLOCKED_ACTIONS = {
  aggressiveProgression: "aggressive_progression",
  increaseVolume: "increase_volume",
  highIntensityProgression: "high_intensity_progression",
  increaseRelatedLoad: "increase_load_on_related_movements"
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizedSignals(checkInSignals) {
  return unique(Array.isArray(checkInSignals) ? checkInSignals.map((signal) => String(signal || "").trim()) : []);
}

function hasProgressData(progressSummary) {
  return Boolean(
    progressSummary &&
      (progressSummary.hasProgressData ||
        (progressSummary.exerciseProgress || []).length > 0 ||
        Number(progressSummary.adherenceSummary?.recentSessions) > 0 ||
        Number(progressSummary.issueSummary?.recentIssueCount) > 0)
  );
}

function hasCheckInSignals(checkInSignals) {
  return normalizedSignals(checkInSignals).length > 0;
}

function readinessConfidence({ progressSummary, reasonCodes, checkInSignals = [] }) {
  if (!hasProgressData(progressSummary)) {
    if (reasonCodes.includes("recurring_pain") || reasonCodes.includes("recovery_risk")) return "medium";
    return hasCheckInSignals(checkInSignals) ? "medium" : "low";
  }
  if (reasonCodes.includes("recurring_pain") || reasonCodes.includes("recovery_risk")) {
    return Number(progressSummary.issueSummary?.recentIssueCount) >= 2 ? "high" : "medium";
  }
  if (reasonCodes.includes("declining_performance")) return "high";
  if (reasonCodes.length > 0) return "medium";
  return "medium";
}

function applyCheckInSignals({ signals, reasonCodes, blockedActions }) {
  if (signals.includes("time_constraint") || signals.includes("repeated_time_constraint")) {
    reasonCodes.push("time_constraint", "low_adherence");
    if (signals.includes("repeated_time_constraint")) reasonCodes.push("repeated_time_constraint");
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (signals.includes("motivation")) {
    reasonCodes.push("motivation", "low_adherence");
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (signals.includes("pain_signal") || signals.includes("recurring_check_in_pain")) {
    reasonCodes.push("pain_signal", "recurring_pain");
    if (signals.includes("recurring_check_in_pain")) reasonCodes.push("recurring_check_in_pain");
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseRelatedLoad
    );
  }

  if (signals.includes("fatigue_signal") || signals.includes("repeated_fatigue_signal")) {
    reasonCodes.push("fatigue_signal", "recovery_risk");
    if (signals.includes("repeated_fatigue_signal")) reasonCodes.push("repeated_fatigue_signal");
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseVolume
    );
  }

  if (signals.includes("too_hard")) {
    reasonCodes.push("too_hard", "recovery_risk");
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseVolume
    );
  }

  if (signals.includes("equipment_unavailable") || signals.includes("repeated_equipment_constraint")) {
    reasonCodes.push("equipment_unavailable");
    if (signals.includes("repeated_equipment_constraint")) reasonCodes.push("repeated_equipment_constraint");
  }
}

function decisionFromReasonCodes(reasonCodes) {
  if (reasonCodes.includes("recurring_pain")) return "needs_review";
  if (reasonCodes.includes("recovery_risk") || reasonCodes.includes("declining_performance")) {
    return "recovery_focus";
  }
  if (
    reasonCodes.includes("low_adherence") ||
    reasonCodes.includes("low_set_completion") ||
    reasonCodes.includes("equipment_unavailable")
  ) {
    return "conservative";
  }

  return "normal";
}

function buildReadinessDecision(progressSummary, checkInSignals = []) {
  const flags = progressSummary?.readinessFlags || [];
  const signals = normalizedSignals(checkInSignals);
  const reasonCodes = [];
  const blockedActions = [];

  if (flags.includes("low_adherence")) {
    reasonCodes.push("low_adherence");
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (flags.includes("low_set_completion")) {
    reasonCodes.push("low_set_completion");
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (flags.includes("recurring_pain_reported")) {
    reasonCodes.push("recurring_pain");
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseRelatedLoad
    );
  }

  if (flags.includes("limited_recovery_signal")) {
    reasonCodes.push("recovery_risk");
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseVolume
    );
  }

  if (flags.includes("declining_exercise_performance")) {
    reasonCodes.push("declining_performance");
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.highIntensityProgression);
  }

  applyCheckInSignals({ signals, reasonCodes, blockedActions });

  return {
    readinessDecision: decisionFromReasonCodes(reasonCodes),
    readinessReasonCodes: unique(reasonCodes),
    readinessConfidence: readinessConfidence({ progressSummary, reasonCodes, checkInSignals: signals }),
    blockedActions: unique(blockedActions),
    checkInSignals: signals
  };
}

function exerciseConfidence(exerciseProgress) {
  const exposures = Number(exerciseProgress.exposures || 0);
  const trend = exerciseProgress.trend || "insufficient_data";

  if (trend === "insufficient_data" || exposures < 3) return "low";
  if (trend === "plateau") return "medium";
  return exposures >= 5 ? "high" : "medium";
}

function exerciseDecision(exerciseProgress, readinessBlockedActions) {
  const trend = exerciseProgress.trend || "insufficient_data";
  const base = {
    exerciseId: exerciseProgress.exerciseId ?? null,
    exerciseName: exerciseProgress.exerciseName || "Unknown exercise",
    status: trend,
    confidence: exerciseConfidence(exerciseProgress)
  };

  if (trend === "progressing") {
    return {
      ...base,
      decision: "progress_cautiously",
      reasonCodes: ["progressing_no_pain", "sufficient_exposures"],
      blockedActions: unique(readinessBlockedActions)
    };
  }

  if (trend === "plateau") {
    return {
      ...base,
      decision: "review_or_adjust",
      reasonCodes: ["plateau_3_plus_exposures"],
      blockedActions: unique(readinessBlockedActions)
    };
  }

  if (trend === "declining") {
    return {
      ...base,
      decision: "reduce_or_recover",
      reasonCodes: ["declining_performance"],
      blockedActions: unique([
        ...readinessBlockedActions,
        BLOCKED_ACTIONS.aggressiveProgression,
        BLOCKED_ACTIONS.highIntensityProgression
      ])
    };
  }

  return {
    ...base,
    decision: "collect_more_data",
    reasonCodes: ["insufficient_data"],
    blockedActions: unique(readinessBlockedActions)
  };
}

function buildFitnessAdaptationDecisions({
  progressSummary,
  profile = null,
  expertRules = [],
  knowledgeItems = [],
  checkInSignals = []
} = {}) {
  void profile;
  void expertRules;
  void knowledgeItems;

  if (!hasProgressData(progressSummary) && !hasCheckInSignals(checkInSignals)) {
    return {
      version: FITNESS_ADAPTATION_DECISION_VERSION,
      readinessDecision: "normal",
      readinessReasonCodes: [],
      readinessConfidence: "low",
      blockedActions: [],
      checkInSignals: [],
      exerciseDecisions: []
    };
  }

  const readiness = buildReadinessDecision(progressSummary, checkInSignals);

  return {
    version: FITNESS_ADAPTATION_DECISION_VERSION,
    ...readiness,
    exerciseDecisions: (progressSummary?.exerciseProgress || []).map((item) =>
      exerciseDecision(item, readiness.blockedActions)
    )
  };
}

module.exports = {
  FITNESS_ADAPTATION_DECISION_VERSION,
  buildFitnessAdaptationDecisions,
  _internals: {
    exerciseConfidence,
    buildReadinessDecision
  }
};
