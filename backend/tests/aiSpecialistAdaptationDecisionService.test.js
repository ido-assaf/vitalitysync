const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_ADAPTATION_DECISION_VERSION,
  buildFitnessAdaptationDecisions
} = require("../services/aiSpecialistAdaptationDecisionService");

function progressSummary(overrides = {}) {
  return {
    hasProgressData: true,
    adherenceSummary: {
      recentSessions: 4,
      completedSessions: 4,
      completionRate: 100,
      averageSetCompletionPercent: 100
    },
    exerciseProgress: [],
    issueSummary: {
      recentIssueCount: 0,
      recurringPainPatterns: [],
      fatigueSignals: []
    },
    readinessFlags: [],
    ...overrides
  };
}

function exercise(overrides = {}) {
  return {
    exerciseId: 10,
    exerciseName: "Bench Chest Press",
    exposures: 3,
    loggedSets: 9,
    completedSetCount: 9,
    trend: "progressing",
    recommendation: "progress_cautiously",
    latestBestWeight: 50,
    latestBestReps: 10,
    latestVolume: 1500,
    ...overrides
  };
}

function firstDecision(decisions) {
  return decisions.exerciseDecisions[0];
}

test("adaptation decisions return safe no-op defaults for empty progress", () => {
  const decisions = buildFitnessAdaptationDecisions({});

  assert.equal(decisions.version, FITNESS_ADAPTATION_DECISION_VERSION);
  assert.equal(decisions.readinessDecision, "normal");
  assert.deepEqual(decisions.readinessReasonCodes, []);
  assert.equal(decisions.readinessConfidence, "low");
  assert.deepEqual(decisions.blockedActions, []);
  assert.deepEqual(decisions.checkInSignals, []);
  assert.deepEqual(decisions.exerciseDecisions, []);
});

test("progressing exercise gets cautious progression with deterministic reason codes", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ exposures: 5, trend: "progressing" })]
    })
  });
  const bench = firstDecision(decisions);

  assert.equal(decisions.readinessDecision, "normal");
  assert.equal(bench.decision, "progress_cautiously");
  assert.deepEqual(bench.reasonCodes, ["progressing_no_pain", "sufficient_exposures"]);
  assert.equal(bench.confidence, "high");
  assert.deepEqual(bench.blockedActions, []);
});

test("plateau exercise gets review or adjust", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ exposures: 4, trend: "plateau", recommendation: "review_or_adjust" })]
    })
  });
  const bench = firstDecision(decisions);

  assert.equal(bench.status, "plateau");
  assert.equal(bench.decision, "review_or_adjust");
  assert.deepEqual(bench.reasonCodes, ["plateau_3_plus_exposures"]);
  assert.equal(bench.confidence, "medium");
});

test("declining exercise gets reduce or recover and blocks aggressive progression", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ exposures: 5, trend: "declining", recommendation: "reduce_or_recover" })],
      readinessFlags: ["declining_exercise_performance", "avoid_aggressive_progression"]
    })
  });
  const bench = firstDecision(decisions);

  assert.equal(decisions.readinessDecision, "recovery_focus");
  assert.deepEqual(decisions.readinessReasonCodes, ["declining_performance"]);
  assert.equal(bench.decision, "reduce_or_recover");
  assert.deepEqual(bench.reasonCodes, ["declining_performance"]);
  assert.equal(bench.confidence, "high");
  assert.ok(bench.blockedActions.includes("aggressive_progression"));
  assert.ok(bench.blockedActions.includes("high_intensity_progression"));
});

test("insufficient exercise data gets collect more data", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ exposures: 2, trend: "insufficient_data", recommendation: "collect_more_data" })]
    })
  });
  const bench = firstDecision(decisions);

  assert.equal(bench.decision, "collect_more_data");
  assert.deepEqual(bench.reasonCodes, ["insufficient_data"]);
  assert.equal(bench.confidence, "low");
});

test("low adherence and low set completion create conservative readiness", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      adherenceSummary: {
        recentSessions: 4,
        completedSessions: 1,
        completionRate: 25,
        averageSetCompletionPercent: 55
      },
      readinessFlags: ["low_adherence", "low_set_completion", "avoid_aggressive_progression"]
    })
  });

  assert.equal(decisions.readinessDecision, "conservative");
  assert.deepEqual(decisions.readinessReasonCodes, ["low_adherence", "low_set_completion"]);
  assert.equal(decisions.readinessConfidence, "medium");
  assert.ok(decisions.blockedActions.includes("aggressive_progression"));
  assert.ok(decisions.blockedActions.includes("increase_volume"));
});

test("recurring pain creates needs-review readiness and safety blocked actions", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      issueSummary: {
        recentIssueCount: 2,
        recurringPainPatterns: ["knee pain on lunges"],
        fatigueSignals: []
      },
      readinessFlags: ["recurring_pain_reported", "avoid_aggressive_progression"]
    })
  });

  assert.equal(decisions.readinessDecision, "needs_review");
  assert.deepEqual(decisions.readinessReasonCodes, ["recurring_pain"]);
  assert.equal(decisions.readinessConfidence, "high");
  assert.ok(decisions.blockedActions.includes("aggressive_progression"));
  assert.ok(decisions.blockedActions.includes("high_intensity_progression"));
  assert.ok(decisions.blockedActions.includes("increase_load_on_related_movements"));
});

test("fatigue and recovery signals create recovery-focused readiness", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      issueSummary: {
        recentIssueCount: 1,
        recurringPainPatterns: [],
        fatigueSignals: ["felt tired and recovery was poor"]
      },
      readinessFlags: ["limited_recovery_signal", "avoid_aggressive_progression"]
    })
  });

  assert.equal(decisions.readinessDecision, "recovery_focus");
  assert.deepEqual(decisions.readinessReasonCodes, ["recovery_risk"]);
  assert.equal(decisions.readinessConfidence, "medium");
  assert.ok(decisions.blockedActions.includes("aggressive_progression"));
  assert.ok(decisions.blockedActions.includes("increase_volume"));
  assert.ok(decisions.blockedActions.includes("high_intensity_progression"));
});

test("reason codes and confidence remain deterministic with mixed readiness signals", () => {
  const decisions = buildFitnessAdaptationDecisions({
    progressSummary: progressSummary({
      issueSummary: {
        recentIssueCount: 3,
        recurringPainPatterns: ["shoulder pain pressing"],
        fatigueSignals: ["poor recovery"]
      },
      readinessFlags: [
        "low_adherence",
        "low_set_completion",
        "recurring_pain_reported",
        "limited_recovery_signal",
        "declining_exercise_performance",
        "avoid_aggressive_progression"
      ],
      exerciseProgress: [exercise({ trend: "declining", exposures: 3 })]
    })
  });

  assert.equal(decisions.readinessDecision, "needs_review");
  assert.deepEqual(decisions.readinessReasonCodes, [
    "low_adherence",
    "low_set_completion",
    "recurring_pain",
    "recovery_risk",
    "declining_performance"
  ]);
  assert.equal(decisions.readinessConfidence, "high");
  assert.deepEqual(decisions.blockedActions, [
    "aggressive_progression",
    "increase_volume",
    "high_intensity_progression",
    "increase_load_on_related_movements"
  ]);
  assert.equal(firstDecision(decisions).confidence, "medium");
});

test("check-in time and motivation signals create conservative readiness without progress history", () => {
  const decisions = buildFitnessAdaptationDecisions({
    checkInSignals: ["time_constraint", "motivation"]
  });

  assert.equal(decisions.readinessDecision, "conservative");
  assert.equal(decisions.readinessConfidence, "medium");
  assert.deepEqual(decisions.checkInSignals, ["time_constraint", "motivation"]);
  assert.ok(decisions.readinessReasonCodes.includes("time_constraint"));
  assert.ok(decisions.readinessReasonCodes.includes("motivation"));
  assert.ok(decisions.readinessReasonCodes.includes("low_adherence"));
  assert.ok(decisions.blockedActions.includes("increase_volume"));
  assert.deepEqual(decisions.exerciseDecisions, []);
});

test("check-in pain and fatigue signals block unsafe progression without progress history", () => {
  const decisions = buildFitnessAdaptationDecisions({
    checkInSignals: ["pain_signal", "fatigue_signal"]
  });

  assert.equal(decisions.readinessDecision, "needs_review");
  assert.equal(decisions.readinessConfidence, "medium");
  assert.ok(decisions.readinessReasonCodes.includes("pain_signal"));
  assert.ok(decisions.readinessReasonCodes.includes("recurring_pain"));
  assert.ok(decisions.readinessReasonCodes.includes("fatigue_signal"));
  assert.ok(decisions.readinessReasonCodes.includes("recovery_risk"));
  assert.ok(decisions.blockedActions.includes("increase_load_on_related_movements"));
  assert.ok(decisions.blockedActions.includes("high_intensity_progression"));
});

test("check-in equipment and difficulty signals create reviewable readiness", () => {
  const decisions = buildFitnessAdaptationDecisions({
    checkInSignals: ["equipment_unavailable", "too_hard"]
  });

  assert.equal(decisions.readinessDecision, "recovery_focus");
  assert.ok(decisions.readinessReasonCodes.includes("equipment_unavailable"));
  assert.ok(decisions.readinessReasonCodes.includes("too_hard"));
  assert.ok(decisions.readinessReasonCodes.includes("recovery_risk"));
  assert.ok(decisions.blockedActions.includes("increase_volume"));
});

test("recurring check-in signals behave like stronger readiness signals", () => {
  const decisions = buildFitnessAdaptationDecisions({
    checkInSignals: ["recurring_check_in_pain", "repeated_fatigue_signal", "repeated_equipment_constraint"]
  });

  assert.equal(decisions.readinessDecision, "needs_review");
  assert.ok(decisions.readinessReasonCodes.includes("recurring_check_in_pain"));
  assert.ok(decisions.readinessReasonCodes.includes("repeated_fatigue_signal"));
  assert.ok(decisions.readinessReasonCodes.includes("repeated_equipment_constraint"));
  assert.ok(decisions.readinessReasonCodes.includes("recurring_pain"));
  assert.ok(decisions.readinessReasonCodes.includes("recovery_risk"));
  assert.ok(decisions.readinessReasonCodes.includes("equipment_unavailable"));
});
