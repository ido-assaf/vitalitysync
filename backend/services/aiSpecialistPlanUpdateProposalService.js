const FITNESS_PLAN_UPDATE_PROPOSAL_VERSION = "fitness_plan_update_proposal_v0.1";

const BLOCKED_ACTIONS = {
  aggressiveProgression: "aggressive_progression",
  increaseVolume: "increase_volume",
  highIntensityProgression: "high_intensity_progression",
  increaseRelatedLoad: "increase_load_on_related_movements"
};

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
    !["collect_more_data", "maintain_current_prescription", "review_substitution_candidate"].includes(
      changeItem.type
    )
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

  if (reasonCodes.includes("low_adherence") || reasonCodes.includes("low_set_completion")) {
    changes.push(
      change({
        type: "simplify_session",
        action: "reduce_optional_volume",
        reasonCodes: reasonCodes.filter((reason) => reason === "low_adherence" || reason === "low_set_completion"),
        confidence
      })
    );
    rejectedCandidates.push(
      change({
        type: "increase_volume",
        action: "increase_volume",
        reasonCodes: ["low_adherence"],
        confidence
      })
    );
  }

  if (reasonCodes.includes("recurring_pain")) {
    changes.push(
      change({
        type: "review_substitution_candidate",
        action: "mark_substitution_review_candidate",
        reasonCodes: ["recurring_pain"],
        confidence
      })
    );
    rejectedCandidates.push(
      change({
        type: "cautious_progression",
        action: "increase_reps_or_small_load",
        reasonCodes: ["recurring_pain"],
        confidence
      })
    );
  }

  if (reasonCodes.includes("equipment_unavailable")) {
    changes.push(
      change({
        type: "review_substitution_candidate",
        action: "mark_substitution_review_candidate",
        reasonCodes: ["equipment_unavailable"],
        confidence
      })
    );
  }

  if (reasonCodes.includes("recovery_risk") || reasonCodes.includes("declining_performance")) {
    changes.push(
      change({
        type: "reduce_load_or_volume",
        action: "reduce_intensity_or_volume",
        reasonCodes: reasonCodes.filter(
          (reason) => reason === "recovery_risk" || reason === "declining_performance" || reason === "too_hard"
        ),
        confidence
      })
    );
    rejectedCandidates.push(
      change({
        type: "high_intensity_progression",
        action: "high_intensity_progression",
        reasonCodes: ["recovery_risk"],
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

  if (exerciseDecision.decision === "progress_cautiously") {
    return change({
      ...base,
      type: "cautious_progression",
      action: "increase_reps_or_small_load"
    });
  }

  if (exerciseDecision.decision === "review_or_adjust") {
    return change({
      ...base,
      type: "review_or_adjust",
      action: "review_rep_range_or_substitution"
    });
  }

  if (exerciseDecision.decision === "reduce_or_recover") {
    return change({
      ...base,
      type: "reduce_load_or_volume",
      action: "reduce_load_or_volume"
    });
  }

  return change({
    ...base,
    type: "collect_more_data",
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
  if (!hasAdaptationData(adaptationDecisions)) return "maintain";
  if (adaptationDecisions.readinessDecision === "needs_review") return "needs_review";
  if (proposedChanges.some((item) => item.type === "collect_more_data") && proposedChanges.length === 1) {
    return "collect_more_data";
  }
  if (proposedChanges.some((item) => item.type !== "maintain_current_prescription")) {
    return "propose_changes";
  }
  return "maintain";
}

function validationSummaryFor({ rejectedChanges, invalidProposals }) {
  return {
    isSafeProposal: invalidProposals.length === 0,
    warnings: rejectedChanges.length > 0 ? ["blocked_changes_rejected"] : [],
    rejectedCount: rejectedChanges.length
  };
}

function buildFitnessPlanUpdateProposal({
  adaptationDecisions,
  profile = null,
  expertRules = [],
  knowledgeItems = []
} = {}) {
  void profile;
  void expertRules;
  void knowledgeItems;

  if (!hasAdaptationData(adaptationDecisions)) {
    return {
      version: FITNESS_PLAN_UPDATE_PROPOSAL_VERSION,
      updateDecision: "maintain",
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
