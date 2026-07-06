const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_PLAN_UPDATE_PROPOSAL_VERSION,
  buildFitnessPlanUpdateProposal
} = require("../services/aiSpecialistPlanUpdateProposalService");

function adaptation(overrides = {}) {
  return {
    readinessDecision: "normal",
    readinessReasonCodes: [],
    readinessConfidence: "medium",
    blockedActions: [],
    exerciseDecisions: [],
    ...overrides
  };
}

function exerciseDecision(overrides = {}) {
  return {
    exerciseId: 10,
    exerciseName: "Bench Chest Press",
    status: "progressing",
    decision: "progress_cautiously",
    reasonCodes: ["progressing_no_pain", "sufficient_exposures"],
    confidence: "medium",
    blockedActions: [],
    ...overrides
  };
}

function byType(proposal, type) {
  return proposal.proposedChanges.find((item) => item.type === type);
}

function rejectedByType(proposal, type) {
  return proposal.rejectedChanges.find((item) => item.type === type);
}

test("plan update proposal returns safe maintain defaults with no adaptation data", () => {
  const proposal = buildFitnessPlanUpdateProposal({});

  assert.equal(proposal.version, FITNESS_PLAN_UPDATE_PROPOSAL_VERSION);
  assert.equal(proposal.updateDecision, "maintain");
  assert.deepEqual(proposal.proposedChanges, []);
  assert.deepEqual(proposal.rejectedChanges, []);
  assert.deepEqual(proposal.blockedActions, []);
  assert.deepEqual(proposal.reasonCodes, []);
  assert.equal(proposal.confidence, "low");
  assert.equal(proposal.validationSummary.isSafeProposal, true);
});

test("progressing exercise proposes cautious progression when not blocked", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      exerciseDecisions: [exerciseDecision({ confidence: "high" })],
      readinessConfidence: "high"
    })
  });
  const progression = byType(proposal, "cautious_progression");

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.equal(progression.action, "increase_reps_or_small_load");
  assert.equal(progression.exerciseName, "Bench Chest Press");
  assert.deepEqual(progression.reasonCodes, ["progressing_no_pain", "sufficient_exposures"]);
  assert.equal(proposal.confidence, "high");
  assert.equal(proposal.validationSummary.isSafeProposal, true);
});

test("insufficient exercise data proposes collect more data only", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      exerciseDecisions: [
        exerciseDecision({
          status: "insufficient_data",
          decision: "collect_more_data",
          reasonCodes: ["insufficient_data"],
          confidence: "low"
        })
      ]
    })
  });

  assert.equal(proposal.updateDecision, "collect_more_data");
  assert.equal(proposal.proposedChanges.length, 1);
  assert.equal(proposal.proposedChanges[0].type, "collect_more_data");
  assert.equal(proposal.confidence, "low");
});

test("plateau exercise proposes review or adjustment without mutating the plan", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      exerciseDecisions: [
        exerciseDecision({
          status: "plateau",
          decision: "review_or_adjust",
          reasonCodes: ["plateau_3_plus_exposures"]
        })
      ]
    })
  });
  const review = byType(proposal, "review_or_adjust");

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.equal(review.action, "review_rep_range_or_substitution");
  assert.deepEqual(review.reasonCodes, ["plateau_3_plus_exposures"]);
});

test("declining exercise proposes reducing load or volume", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "recovery_focus",
      readinessReasonCodes: ["declining_performance"],
      readinessConfidence: "high",
      blockedActions: ["aggressive_progression", "high_intensity_progression"],
      exerciseDecisions: [
        exerciseDecision({
          status: "declining",
          decision: "reduce_or_recover",
          reasonCodes: ["declining_performance"],
          confidence: "high",
          blockedActions: ["aggressive_progression", "high_intensity_progression"]
        })
      ]
    })
  });

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.ok(byType(proposal, "reduce_load_or_volume"));
  assert.ok(rejectedByType(proposal, "high_intensity_progression"));
  assert.equal(proposal.validationSummary.isSafeProposal, true);
});

test("low adherence proposes simplification and rejects volume increases", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "conservative",
      readinessReasonCodes: ["low_adherence", "low_set_completion"],
      blockedActions: ["aggressive_progression", "increase_volume"],
      exerciseDecisions: []
    })
  });
  const simplification = byType(proposal, "simplify_session");
  const rejectedVolume = rejectedByType(proposal, "increase_volume");

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.equal(simplification.action, "reduce_optional_volume");
  assert.ok(rejectedVolume);
  assert.deepEqual(rejectedVolume.blockedBy, ["increase_volume"]);
  assert.equal(proposal.validationSummary.rejectedCount, 1);
  assert.equal(proposal.validationSummary.isSafeProposal, true);
});

test("recurring pain rejects load progression and marks substitution review", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "needs_review",
      readinessReasonCodes: ["recurring_pain"],
      readinessConfidence: "high",
      blockedActions: [
        "aggressive_progression",
        "high_intensity_progression",
        "increase_load_on_related_movements"
      ],
      exerciseDecisions: [exerciseDecision({ confidence: "high" })]
    })
  });
  const substitutionReview = byType(proposal, "review_substitution_candidate");
  const rejectedProgression = rejectedByType(proposal, "cautious_progression");

  assert.equal(proposal.updateDecision, "needs_review");
  assert.equal(substitutionReview.action, "mark_substitution_review_candidate");
  assert.ok(rejectedProgression);
  assert.ok(rejectedProgression.blockedBy.includes("increase_load_on_related_movements"));
  assert.ok(proposal.reasonCodes.includes("recurring_pain"));
  assert.equal(proposal.validationSummary.isSafeProposal, true);
});

test("recovery risk rejects high-intensity progression", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "recovery_focus",
      readinessReasonCodes: ["recovery_risk"],
      readinessConfidence: "medium",
      blockedActions: ["aggressive_progression", "high_intensity_progression", "increase_volume"]
    })
  });
  const recoveryChange = byType(proposal, "reduce_load_or_volume");
  const rejectedIntensity = rejectedByType(proposal, "high_intensity_progression");

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.equal(recoveryChange.action, "reduce_intensity_or_volume");
  assert.ok(rejectedIntensity);
  assert.deepEqual(rejectedIntensity.blockedBy, ["high_intensity_progression"]);
});

test("check-in equipment signal proposes substitution review without mutating the plan", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "conservative",
      readinessReasonCodes: ["equipment_unavailable"],
      readinessConfidence: "medium",
      checkInSignals: ["equipment_unavailable"]
    })
  });
  const substitutionReview = byType(proposal, "review_substitution_candidate");

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.equal(substitutionReview.action, "mark_substitution_review_candidate");
  assert.deepEqual(substitutionReview.reasonCodes, ["equipment_unavailable"]);
  assert.ok(proposal.reasonCodes.includes("equipment_unavailable"));
});

test("check-in difficulty signal proposes reducing load or volume", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "recovery_focus",
      readinessReasonCodes: ["too_hard", "recovery_risk"],
      readinessConfidence: "medium",
      blockedActions: ["aggressive_progression", "high_intensity_progression", "increase_volume"],
      checkInSignals: ["too_hard"]
    })
  });
  const reduction = byType(proposal, "reduce_load_or_volume");

  assert.equal(proposal.updateDecision, "propose_changes");
  assert.equal(reduction.action, "reduce_intensity_or_volume");
  assert.ok(reduction.reasonCodes.includes("too_hard"));
  assert.ok(reduction.reasonCodes.includes("recovery_risk"));
  assert.ok(rejectedByType(proposal, "high_intensity_progression"));
});

test("blocked actions prevent unsafe proposed changes from surviving validation", () => {
  const proposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions: adaptation({
      readinessDecision: "needs_review",
      readinessReasonCodes: ["recurring_pain"],
      blockedActions: ["increase_load_on_related_movements"],
      exerciseDecisions: [exerciseDecision()]
    })
  });

  assert.equal(byType(proposal, "cautious_progression"), undefined);
  assert.ok(rejectedByType(proposal, "cautious_progression"));
  assert.equal(proposal.validationSummary.isSafeProposal, true);
  assert.deepEqual(proposal.validationSummary.warnings, ["blocked_changes_rejected"]);
});
