const BLOCKED_ACTIONS = Object.freeze({
  aggressiveProgression: "aggressive_progression",
  increaseVolume: "increase_volume",
  highIntensityProgression: "high_intensity_progression",
  increaseRelatedLoad: "increase_load_on_related_movements"
});

const REASON_CODES = Object.freeze({
  BLOCKED_CHANGES_REJECTED: "blocked_changes_rejected",
  DECLINING_PERFORMANCE: "declining_performance",
  EQUIPMENT_UNAVAILABLE: "equipment_unavailable",
  FATIGUE_SIGNAL: "fatigue_signal",
  INSUFFICIENT_DATA: "insufficient_data",
  INSUFFICIENT_EXERCISE_HISTORY: "insufficient_exercise_history",
  LOW_ADHERENCE: "low_adherence",
  LOW_SET_COMPLETION: "low_set_completion",
  MOTIVATION: "motivation",
  NO_CLEAR_LOAD_CHANGE: "no_clear_load_change",
  PAIN_BLOCKS_PROGRESSION: "pain_blocks_progression",
  PAIN_SIGNAL: "pain_signal",
  PLATEAU_3_PLUS_EXPOSURES: "plateau_3_plus_exposures",
  PROGRESSING_NO_PAIN: "progressing_no_pain",
  RECOVERY_BLOCKS_PROGRESSION: "recovery_blocks_progression",
  RECOVERY_RISK: "recovery_risk",
  RECURRING_CHECK_IN_PAIN: "recurring_check_in_pain",
  RECURRING_PAIN: "recurring_pain",
  REPEATED_EQUIPMENT_CONSTRAINT: "repeated_equipment_constraint",
  REPEATED_FATIGUE_SIGNAL: "repeated_fatigue_signal",
  REPEATED_TIME_CONSTRAINT: "repeated_time_constraint",
  STRENGTH_GOAL: "strength_goal",
  SUFFICIENT_EXPOSURES: "sufficient_exposures",
  TIME_CONSTRAINT: "time_constraint",
  TOO_HARD: "too_hard"
});

const REVIEW_ACTION_TYPES = Object.freeze({
  CAUTIOUS_PROGRESSION: "cautious_progression",
  COLLECT_MORE_DATA: "collect_more_data",
  HIGH_INTENSITY_PROGRESSION: "high_intensity_progression",
  INCREASE_VOLUME: "increase_volume",
  MAINTAIN_CURRENT_PRESCRIPTION: "maintain_current_prescription",
  REDUCE_LOAD_OR_VOLUME: "reduce_load_or_volume",
  REVIEW_OR_ADJUST: "review_or_adjust",
  REVIEW_SUBSTITUTION_CANDIDATE: "review_substitution_candidate",
  SIMPLIFY_SESSION: "simplify_session"
});

const PLAN_UPDATE_DECISIONS = Object.freeze({
  COLLECT_MORE_DATA: "collect_more_data",
  MAINTAIN: "maintain",
  NEEDS_REVIEW: "needs_review",
  PROPOSE_CHANGES: "propose_changes"
});

const READINESS_DECISIONS = Object.freeze({
  CONSERVATIVE: "conservative",
  NEEDS_REVIEW: "needs_review",
  NORMAL: "normal",
  RECOVERY_FOCUS: "recovery_focus"
});

const EXERCISE_DECISIONS = Object.freeze({
  COLLECT_MORE_DATA: "collect_more_data",
  PROGRESS_CAUTIOUSLY: "progress_cautiously",
  REDUCE_OR_RECOVER: "reduce_or_recover",
  REVIEW_OR_ADJUST: "review_or_adjust"
});

function hasReason(reasonCodes = [], reasonCode) {
  return Array.isArray(reasonCodes) && reasonCodes.includes(reasonCode);
}

function hasAnyReason(reasonCodes = [], candidates = []) {
  return candidates.some((candidate) => hasReason(reasonCodes, candidate));
}

module.exports = {
  BLOCKED_ACTIONS,
  EXERCISE_DECISIONS,
  PLAN_UPDATE_DECISIONS,
  READINESS_DECISIONS,
  REASON_CODES,
  REVIEW_ACTION_TYPES,
  hasAnyReason,
  hasReason
};
