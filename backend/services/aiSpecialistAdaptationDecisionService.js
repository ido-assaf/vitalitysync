const FITNESS_ADAPTATION_DECISION_VERSION = "fitness_adaptation_decision_v0.1";

const {
  BLOCKED_ACTIONS,
  EXERCISE_DECISIONS,
  READINESS_DECISIONS,
  REASON_CODES,
  hasAnyReason,
  hasReason
} = require("../constants/aiSpecialistReasonCodes");

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
    if (hasAnyReason(reasonCodes, [REASON_CODES.RECURRING_PAIN, REASON_CODES.RECOVERY_RISK])) return "medium";
    return hasCheckInSignals(checkInSignals) ? "medium" : "low";
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.RECURRING_PAIN, REASON_CODES.RECOVERY_RISK])) {
    return Number(progressSummary.issueSummary?.recentIssueCount) >= 2 ? "high" : "medium";
  }
  if (hasReason(reasonCodes, REASON_CODES.DECLINING_PERFORMANCE)) return "high";
  if (reasonCodes.length > 0) return "medium";
  return "medium";
}

function applyCheckInSignals({ signals, reasonCodes, blockedActions }) {
  if (signals.includes(REASON_CODES.TIME_CONSTRAINT) || signals.includes(REASON_CODES.REPEATED_TIME_CONSTRAINT)) {
    reasonCodes.push(REASON_CODES.TIME_CONSTRAINT, REASON_CODES.LOW_ADHERENCE);
    if (signals.includes(REASON_CODES.REPEATED_TIME_CONSTRAINT)) {
      reasonCodes.push(REASON_CODES.REPEATED_TIME_CONSTRAINT);
    }
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (signals.includes(REASON_CODES.MOTIVATION)) {
    reasonCodes.push(REASON_CODES.MOTIVATION, REASON_CODES.LOW_ADHERENCE);
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (signals.includes(REASON_CODES.PAIN_SIGNAL) || signals.includes(REASON_CODES.RECURRING_CHECK_IN_PAIN)) {
    reasonCodes.push(REASON_CODES.PAIN_SIGNAL, REASON_CODES.RECURRING_PAIN);
    if (signals.includes(REASON_CODES.RECURRING_CHECK_IN_PAIN)) {
      reasonCodes.push(REASON_CODES.RECURRING_CHECK_IN_PAIN);
    }
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseRelatedLoad
    );
  }

  if (signals.includes(REASON_CODES.FATIGUE_SIGNAL) || signals.includes(REASON_CODES.REPEATED_FATIGUE_SIGNAL)) {
    reasonCodes.push(REASON_CODES.FATIGUE_SIGNAL, REASON_CODES.RECOVERY_RISK);
    if (signals.includes(REASON_CODES.REPEATED_FATIGUE_SIGNAL)) {
      reasonCodes.push(REASON_CODES.REPEATED_FATIGUE_SIGNAL);
    }
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseVolume
    );
  }

  if (signals.includes(REASON_CODES.TOO_HARD)) {
    reasonCodes.push(REASON_CODES.TOO_HARD, REASON_CODES.RECOVERY_RISK);
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseVolume
    );
  }

  if (
    signals.includes(REASON_CODES.EQUIPMENT_UNAVAILABLE) ||
    signals.includes(REASON_CODES.REPEATED_EQUIPMENT_CONSTRAINT)
  ) {
    reasonCodes.push(REASON_CODES.EQUIPMENT_UNAVAILABLE);
    if (signals.includes(REASON_CODES.REPEATED_EQUIPMENT_CONSTRAINT)) {
      reasonCodes.push(REASON_CODES.REPEATED_EQUIPMENT_CONSTRAINT);
    }
  }
}

function decisionFromReasonCodes(reasonCodes) {
  if (hasReason(reasonCodes, REASON_CODES.RECURRING_PAIN)) return READINESS_DECISIONS.NEEDS_REVIEW;
  if (hasAnyReason(reasonCodes, [REASON_CODES.RECOVERY_RISK, REASON_CODES.DECLINING_PERFORMANCE])) {
    return READINESS_DECISIONS.RECOVERY_FOCUS;
  }
  if (
    hasAnyReason(reasonCodes, [
      REASON_CODES.LOW_ADHERENCE,
      REASON_CODES.LOW_SET_COMPLETION,
      REASON_CODES.EQUIPMENT_UNAVAILABLE
    ])
  ) {
    return READINESS_DECISIONS.CONSERVATIVE;
  }

  return READINESS_DECISIONS.NORMAL;
}

function buildReadinessDecision(progressSummary, checkInSignals = []) {
  const flags = progressSummary?.readinessFlags || [];
  const signals = normalizedSignals(checkInSignals);
  const reasonCodes = [];
  const blockedActions = [];

  if (flags.includes(REASON_CODES.LOW_ADHERENCE)) {
    reasonCodes.push(REASON_CODES.LOW_ADHERENCE);
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (flags.includes(REASON_CODES.LOW_SET_COMPLETION)) {
    reasonCodes.push(REASON_CODES.LOW_SET_COMPLETION);
    blockedActions.push(BLOCKED_ACTIONS.aggressiveProgression, BLOCKED_ACTIONS.increaseVolume);
  }

  if (flags.includes("recurring_pain_reported")) {
    reasonCodes.push(REASON_CODES.RECURRING_PAIN);
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseRelatedLoad
    );
  }

  if (flags.includes("limited_recovery_signal")) {
    reasonCodes.push(REASON_CODES.RECOVERY_RISK);
    blockedActions.push(
      BLOCKED_ACTIONS.aggressiveProgression,
      BLOCKED_ACTIONS.highIntensityProgression,
      BLOCKED_ACTIONS.increaseVolume
    );
  }

  if (flags.includes("declining_exercise_performance")) {
    reasonCodes.push(REASON_CODES.DECLINING_PERFORMANCE);
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
      decision: EXERCISE_DECISIONS.PROGRESS_CAUTIOUSLY,
      reasonCodes: [REASON_CODES.PROGRESSING_NO_PAIN, REASON_CODES.SUFFICIENT_EXPOSURES],
      blockedActions: unique(readinessBlockedActions)
    };
  }

  if (trend === "plateau") {
    return {
      ...base,
      decision: EXERCISE_DECISIONS.REVIEW_OR_ADJUST,
      reasonCodes: [REASON_CODES.PLATEAU_3_PLUS_EXPOSURES],
      blockedActions: unique(readinessBlockedActions)
    };
  }

  if (trend === "declining") {
    return {
      ...base,
      decision: EXERCISE_DECISIONS.REDUCE_OR_RECOVER,
      reasonCodes: [REASON_CODES.DECLINING_PERFORMANCE],
      blockedActions: unique([
        ...readinessBlockedActions,
        BLOCKED_ACTIONS.aggressiveProgression,
        BLOCKED_ACTIONS.highIntensityProgression
      ])
    };
  }

  return {
    ...base,
    decision: EXERCISE_DECISIONS.COLLECT_MORE_DATA,
    reasonCodes: [REASON_CODES.INSUFFICIENT_DATA],
    blockedActions: unique(readinessBlockedActions)
  };
}

function buildFitnessAdaptationDecisions({
  progressSummary,
  checkInSignals = []
} = {}) {
  if (!hasProgressData(progressSummary) && !hasCheckInSignals(checkInSignals)) {
    return {
      version: FITNESS_ADAPTATION_DECISION_VERSION,
      readinessDecision: READINESS_DECISIONS.NORMAL,
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
