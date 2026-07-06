const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_WEEKLY_REVIEW_VERSION,
  buildFitnessWeeklyReview
} = require("../services/aiSpecialistWeeklyReviewService");

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
    exposures: 5,
    loggedSets: 15,
    completedSetCount: 15,
    trend: "progressing",
    recommendation: "progress_cautiously",
    latestBestWeight: 55,
    latestBestReps: 10,
    latestVolume: 1650,
    ...overrides
  };
}

function proposedType(review, type) {
  return review.planUpdateProposal.proposedChanges.find((item) => item.type === type);
}

function rejectedType(review, type) {
  return review.planUpdateProposal.rejectedChanges.find((item) => item.type === type);
}

test("weekly review orchestrator returns a complete safe chain with no progress data", () => {
  const review = buildFitnessWeeklyReview({});

  assert.equal(review.version, FITNESS_WEEKLY_REVIEW_VERSION);
  assert.equal(review.progressSummary, null);
  assert.equal(review.adaptationDecisions.readinessDecision, "normal");
  assert.equal(review.planUpdateProposal.updateDecision, "maintain");
  assert.equal(review.weeklyCoachBrief.reviewDecision, "collect_more_data");
  assert.equal(review.weeklyCoachBrief.confidence, "low");
});

test("weekly review turns progressing exercise history into cautious progression brief", () => {
  const review = buildFitnessWeeklyReview({
    progressSummary: progressSummary({
      exerciseProgress: [exercise()]
    })
  });

  assert.equal(review.adaptationDecisions.exerciseDecisions[0].decision, "progress_cautiously");
  assert.ok(proposedType(review, "cautious_progression"));
  assert.equal(review.planUpdateProposal.updateDecision, "propose_changes");
  assert.equal(review.weeklyCoachBrief.reviewDecision, "minor_adjustments");
  assert.ok(review.weeklyCoachBrief.keyFindings.some((finding) => finding.includes("cautious progression")));
});

test("weekly review carries low adherence through decisions, rejected changes, and brief", () => {
  const review = buildFitnessWeeklyReview({
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

  assert.equal(review.adaptationDecisions.readinessDecision, "conservative");
  assert.ok(review.adaptationDecisions.blockedActions.includes("increase_volume"));
  assert.ok(proposedType(review, "simplify_session"));
  assert.ok(rejectedType(review, "increase_volume"));
  assert.equal(review.weeklyCoachBrief.recommendedNextStep, "Simplify the week and avoid increasing volume.");
});

test("weekly review carries recurring pain into needs-review brief", () => {
  const review = buildFitnessWeeklyReview({
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ exerciseName: "Forward Lunge" })],
      issueSummary: {
        recentIssueCount: 2,
        recurringPainPatterns: ["knee pain on lunges"],
        fatigueSignals: []
      },
      readinessFlags: ["recurring_pain_reported", "avoid_aggressive_progression"]
    })
  });

  assert.equal(review.adaptationDecisions.readinessDecision, "needs_review");
  assert.ok(review.planUpdateProposal.blockedActions.includes("increase_load_on_related_movements"));
  assert.ok(proposedType(review, "review_substitution_candidate"));
  assert.ok(rejectedType(review, "cautious_progression"));
  assert.equal(review.weeklyCoachBrief.reviewDecision, "needs_review");
  assert.ok(review.weeklyCoachBrief.safetyNotes.includes("Do not progress painful movements until reviewed."));
});

test("weekly review uses check-in time constraint to propose simplification without progress history", () => {
  const review = buildFitnessWeeklyReview({
    checkInSignals: ["time_constraint"]
  });

  assert.equal(review.adaptationDecisions.readinessDecision, "conservative");
  assert.ok(review.planUpdateProposal.proposedChanges.some((item) => item.type === "simplify_session"));
  assert.equal(review.weeklyCoachBrief.reviewDecision, "minor_adjustments");
  assert.equal(review.weeklyCoachBrief.recommendedNextStep, "Simplify the week and avoid increasing volume.");
  assert.ok(review.weeklyCoachBrief.reasonCodes.includes("time_constraint"));
});

test("weekly review uses check-in pain signal to require review and block progression", () => {
  const review = buildFitnessWeeklyReview({
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ exerciseName: "Forward Lunge" })]
    }),
    checkInSignals: ["pain_signal"]
  });

  assert.equal(review.adaptationDecisions.readinessDecision, "needs_review");
  assert.ok(proposedType(review, "review_substitution_candidate"));
  assert.ok(rejectedType(review, "cautious_progression"));
  assert.equal(review.weeklyCoachBrief.reviewDecision, "needs_review");
  assert.ok(review.weeklyCoachBrief.safetyNotes.includes("Do not progress painful movements until reviewed."));
});

test("weekly review uses equipment check-in signal for substitution review", () => {
  const review = buildFitnessWeeklyReview({
    checkInSignals: ["equipment_unavailable"]
  });

  assert.equal(review.adaptationDecisions.readinessDecision, "conservative");
  assert.ok(proposedType(review, "review_substitution_candidate"));
  assert.equal(review.weeklyCoachBrief.reviewDecision, "minor_adjustments");
  assert.ok(review.weeklyCoachBrief.keyFindings.includes("Equipment availability makes a substitution review appropriate."));
  assert.ok(review.weeklyCoachBrief.reasonCodes.includes("equipment_unavailable"));
});

test("weekly review uses fatigue and too-hard check-in signals for recovery-focused reduction", () => {
  const review = buildFitnessWeeklyReview({
    checkInSignals: ["fatigue_signal", "too_hard"]
  });

  assert.equal(review.adaptationDecisions.readinessDecision, "recovery_focus");
  assert.ok(proposedType(review, "reduce_load_or_volume"));
  assert.equal(review.weeklyCoachBrief.reviewDecision, "minor_adjustments");
  assert.equal(review.weeklyCoachBrief.recommendedNextStep, "Use a recovery-focused adjustment before progressing intensity.");
  assert.ok(review.weeklyCoachBrief.safetyNotes.includes("Avoid high-intensity progression while recovery risk is present."));
  assert.ok(review.weeklyCoachBrief.reasonCodes.includes("fatigue_signal"));
  assert.ok(review.weeklyCoachBrief.reasonCodes.includes("too_hard"));
});

test("weekly review preserves compact weekly brief limits", () => {
  const review = buildFitnessWeeklyReview({
    progressSummary: progressSummary({
      exerciseProgress: [
        exercise({ exerciseId: 1, exerciseName: "Bench Chest Press", trend: "plateau" }),
        exercise({ exerciseId: 2, exerciseName: "Shoulder Press", trend: "declining" }),
        exercise({ exerciseId: 3, exerciseName: "Lat Pulldown", trend: "insufficient_data", exposures: 2 })
      ],
      adherenceSummary: {
        recentSessions: 4,
        completedSessions: 1,
        completionRate: 25,
        averageSetCompletionPercent: 55
      },
      issueSummary: {
        recentIssueCount: 3,
        recurringPainPatterns: ["shoulder pain pressing"],
        fatigueSignals: ["poor recovery"]
      },
      readinessFlags: [
        "low_adherence",
        "low_set_completion",
        "possible_plateau",
        "declining_exercise_performance",
        "recurring_pain_reported",
        "limited_recovery_signal",
        "avoid_aggressive_progression"
      ]
    })
  });

  assert.ok(review.weeklyCoachBrief.keyFindings.length <= 4);
  assert.ok(review.weeklyCoachBrief.coachQuestions.length <= 3);
  assert.ok(review.weeklyCoachBrief.safetyNotes.length <= 3);
  assert.ok(review.weeklyCoachBrief.reasonCodes.includes("recurring_pain"));
  assert.ok(review.weeklyCoachBrief.reasonCodes.includes("recovery_risk"));
});
