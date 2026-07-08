const FITNESS_PLAN_UPDATE_PROPOSAL_VERSION = "fitness_plan_update_proposal_v0.1";

const {
  BLOCKED_ACTIONS,
  EXERCISE_DECISIONS,
  PLAN_UPDATE_DECISIONS,
  REASON_CODES,
  REVIEW_ACTION_TYPES,
  hasAnyReason,
  hasReason
} = require("../constants/aiSpecialistReasonCodes");

const ACTION_BLOCKERS = {
  increase_volume: [BLOCKED_ACTIONS.increaseVolume],
  increase_reps_or_small_load: [BLOCKED_ACTIONS.increaseRelatedLoad],
  aggressive_progression: [BLOCKED_ACTIONS.aggressiveProgression],
  high_intensity_progression: [BLOCKED_ACTIONS.highIntensityProgression]
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasAdaptationData(adaptationDecisions) {
  return Boolean(
    adaptationDecisions &&
      (adaptationDecisions.readinessDecision ||
        (adaptationDecisions.reasonCodes || []).length > 0 ||
        (adaptationDecisions.readinessReasonCodes || []).length > 0 ||
        (adaptationDecisions.blockedActions || []).length > 0 ||
        (adaptationDecisions.exerciseDecisions || []).length > 0)
  );
}

function blockedBy(action, blockedActions) {
  return (ACTION_BLOCKERS[action] || []).filter((blockedAction) => blockedActions.includes(blockedAction));
}

function change({
  type,
  action,
  exerciseId = null,
  exerciseName = null,
  reasonCodes = [],
  confidence = "medium"
}) {
  return {
    type,
    action,
    exerciseId,
    exerciseName,
    reasonCodes: unique(reasonCodes),
    confidence
  };
}

function rejectChange(changeItem, blockedByActions, extraReasonCodes = []) {
  return {
    ...changeItem,
    blockedBy: unique(blockedByActions),
    reasonCodes: unique([...changeItem.reasonCodes, ...extraReasonCodes])
  };
}

function canProposeChange(changeItem, blockedActions) {
  const blockers = blockedBy(changeItem.action, blockedActions);

  if (blockers.length > 0) {
    return { allowed: false, blockers };
  }

  if (
    changeItem.confidence === "low" &&
    ![
      REVIEW_ACTION_TYPES.COLLECT_MORE_DATA,
      REVIEW_ACTION_TYPES.MAINTAIN_CURRENT_PRESCRIPTION,
      REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE
    ].includes(changeItem.type)
  ) {
    return { allowed: false, blockers: ["low_confidence"] };
  }

  return { allowed: true, blockers: [] };
}

function addValidatedChange({ proposedChanges, rejectedChanges, changeItem, blockedActions, extraRejectReasons = [] }) {
  const validation = canProposeChange(changeItem, blockedActions);

  if (validation.allowed) {
    proposedChanges.push(changeItem);
  } else {
    rejectedChanges.push(rejectChange(changeItem, validation.blockers, extraRejectReasons));
  }
}

function readinessChanges(adaptationDecisions) {
  const reasonCodes = adaptationDecisions.readinessReasonCodes || [];
  const confidence = adaptationDecisions.readinessConfidence || "medium";
  const changes = [];
  const rejectedCandidates = [];

  if (hasAnyReason(reasonCodes, [REASON_CODES.LOW_ADHERENCE, REASON_CODES.LOW_SET_COMPLETION])) {
    changes.push(
      change({
        type: REVIEW_ACTION_TYPES.SIMPLIFY_SESSION,
        action: "reduce_optional_volume",
        reasonCodes: reasonCodes.filter((reason) =>
          [REASON_CODES.LOW_ADHERENCE, REASON_CODES.LOW_SET_COMPLETION].includes(reason)
        ),
        confidence
      })
    );
    rejectedCandidates.push(
      change({
        type: REVIEW_ACTION_TYPES.INCREASE_VOLUME,
        action: "increase_volume",
        reasonCodes: [REASON_CODES.LOW_ADHERENCE],
        confidence
      })
    );
  }

  if (hasReason(reasonCodes, REASON_CODES.RECURRING_PAIN)) {
    changes.push(
      change({
        type: REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE,
        action: "mark_substitution_review_candidate",
        reasonCodes: [REASON_CODES.RECURRING_PAIN],
        confidence
      })
    );
    rejectedCandidates.push(
      change({
        type: REVIEW_ACTION_TYPES.CAUTIOUS_PROGRESSION,
        action: "increase_reps_or_small_load",
        reasonCodes: [REASON_CODES.RECURRING_PAIN],
        confidence
      })
    );
  }

  if (hasReason(reasonCodes, REASON_CODES.EQUIPMENT_UNAVAILABLE)) {
    changes.push(
      change({
        type: REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE,
        action: "mark_substitution_review_candidate",
        reasonCodes: [REASON_CODES.EQUIPMENT_UNAVAILABLE],
        confidence
      })
    );
  }

  if (hasAnyReason(reasonCodes, [REASON_CODES.RECOVERY_RISK, REASON_CODES.DECLINING_PERFORMANCE])) {
    changes.push(
      change({
        type: REVIEW_ACTION_TYPES.REDUCE_LOAD_OR_VOLUME,
        action: "reduce_intensity_or_volume",
        reasonCodes: reasonCodes.filter(
          (reason) =>
            [REASON_CODES.RECOVERY_RISK, REASON_CODES.DECLINING_PERFORMANCE, REASON_CODES.TOO_HARD].includes(reason)
        ),
        confidence
      })
    );
    rejectedCandidates.push(
      change({
        type: REVIEW_ACTION_TYPES.HIGH_INTENSITY_PROGRESSION,
        action: "high_intensity_progression",
        reasonCodes: [REASON_CODES.RECOVERY_RISK],
        confidence
      })
    );
  }

  return { changes, rejectedCandidates };
}

function exerciseChangeForDecision(exerciseDecision) {
  const base = {
    exerciseId: exerciseDecision.exerciseId ?? null,
    exerciseName: exerciseDecision.exerciseName || "Unknown exercise",
    reasonCodes: exerciseDecision.reasonCodes || [],
    confidence: exerciseDecision.confidence || "medium"
  };

  if (exerciseDecision.decision === EXERCISE_DECISIONS.PROGRESS_CAUTIOUSLY) {
    return change({
      ...base,
      type: REVIEW_ACTION_TYPES.CAUTIOUS_PROGRESSION,
      action: "increase_reps_or_small_load"
    });
  }

  if (exerciseDecision.decision === EXERCISE_DECISIONS.REVIEW_OR_ADJUST) {
    return change({
      ...base,
      type: REVIEW_ACTION_TYPES.REVIEW_OR_ADJUST,
      action: "review_rep_range_or_substitution"
    });
  }

  if (exerciseDecision.decision === EXERCISE_DECISIONS.REDUCE_OR_RECOVER) {
    return change({
      ...base,
      type: REVIEW_ACTION_TYPES.REDUCE_LOAD_OR_VOLUME,
      action: "reduce_load_or_volume"
    });
  }

  return change({
    ...base,
    type: REVIEW_ACTION_TYPES.COLLECT_MORE_DATA,
    action: "collect_more_data"
  });
}

function proposalConfidence({ adaptationDecisions, proposedChanges }) {
  const confidenceValues = [
    adaptationDecisions.readinessConfidence,
    ...proposedChanges.map((item) => item.confidence)
  ].filter(Boolean);

  if (confidenceValues.length === 0 || confidenceValues.includes("low")) return "low";
  if (confidenceValues.every((value) => value === "high")) return "high";
  return "medium";
}

function updateDecisionFor({ adaptationDecisions, proposedChanges }) {
  if (!hasAdaptationData(adaptationDecisions)) return PLAN_UPDATE_DECISIONS.MAINTAIN;
  if (adaptationDecisions.readinessDecision === PLAN_UPDATE_DECISIONS.NEEDS_REVIEW) {
    return PLAN_UPDATE_DECISIONS.NEEDS_REVIEW;
  }
  if (
    proposedChanges.some((item) => item.type === REVIEW_ACTION_TYPES.COLLECT_MORE_DATA) &&
    proposedChanges.length === 1
  ) {
    return PLAN_UPDATE_DECISIONS.COLLECT_MORE_DATA;
  }
  if (proposedChanges.some((item) => item.type !== REVIEW_ACTION_TYPES.MAINTAIN_CURRENT_PRESCRIPTION)) {
    return PLAN_UPDATE_DECISIONS.PROPOSE_CHANGES;
  }
  return PLAN_UPDATE_DECISIONS.MAINTAIN;
}

function validationSummaryFor({ rejectedChanges, invalidProposals }) {
  return {
    isSafeProposal: invalidProposals.length === 0,
    warnings: rejectedChanges.length > 0 ? [REASON_CODES.BLOCKED_CHANGES_REJECTED] : [],
    rejectedCount: rejectedChanges.length
  };
}

function buildFitnessPlanUpdateProposal({
  adaptationDecisions
} = {}) {
  if (!hasAdaptationData(adaptationDecisions)) {
    return {
      version: FITNESS_PLAN_UPDATE_PROPOSAL_VERSION,
      updateDecision: PLAN_UPDATE_DECISIONS.MAINTAIN,
      proposedChanges: [],
      rejectedChanges: [],
      blockedActions: [],
      reasonCodes: [],
      confidence: "low",
      validationSummary: {
        isSafeProposal: true,
        warnings: [],
        rejectedCount: 0
      }
    };
  }

  const blockedActions = unique(adaptationDecisions.blockedActions || []);
  const proposedChanges = [];
  const rejectedChanges = [];
  const invalidProposals = [];
  const readiness = readinessChanges(adaptationDecisions);

  readiness.changes.forEach((changeItem) =>
    addValidatedChange({ proposedChanges, rejectedChanges, changeItem, blockedActions })
  );
  readiness.rejectedCandidates.forEach((changeItem) =>
    addValidatedChange({
      proposedChanges,
      rejectedChanges,
      changeItem,
      blockedActions,
      extraRejectReasons: adaptationDecisions.readinessReasonCodes || []
    })
  );

  (adaptationDecisions.exerciseDecisions || []).forEach((exerciseDecision) => {
    const changeItem = exerciseChangeForDecision(exerciseDecision);
    const exerciseBlockedActions = unique([...blockedActions, ...(exerciseDecision.blockedActions || [])]);
    addValidatedChange({
      proposedChanges,
      rejectedChanges,
      changeItem,
      blockedActions: exerciseBlockedActions,
      extraRejectReasons: exerciseDecision.reasonCodes || []
    });
  });

  proposedChanges.forEach((changeItem) => {
    const blockers = blockedBy(changeItem.action, blockedActions);
    if (blockers.length > 0) {
      invalidProposals.push(rejectChange(changeItem, blockers));
    }
  });

  return {
    version: FITNESS_PLAN_UPDATE_PROPOSAL_VERSION,
    updateDecision: updateDecisionFor({ adaptationDecisions, proposedChanges }),
    proposedChanges,
    rejectedChanges,
    blockedActions,
    reasonCodes: unique([
      ...(adaptationDecisions.readinessReasonCodes || []),
      ...proposedChanges.flatMap((item) => item.reasonCodes),
      ...rejectedChanges.flatMap((item) => item.reasonCodes)
    ]),
    confidence: proposalConfidence({ adaptationDecisions, proposedChanges }),
    validationSummary: validationSummaryFor({ rejectedChanges, invalidProposals })
  };
}

module.exports = {
  FITNESS_PLAN_UPDATE_PROPOSAL_VERSION,
  buildFitnessPlanUpdateProposal,
  _internals: {
    blockedBy,
    canProposeChange,
    updateDecisionFor
  }
};
