const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_WEEKLY_COACH_BRIEF_VERSION,
  buildFitnessWeeklyCoachBrief
} = require("../services/aiSpecialistWeeklyCoachBriefService");

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

function proposal(overrides = {}) {
  return {
    updateDecision: "maintain",
    proposedChanges: [],
    rejectedChanges: [],
    blockedActions: [],
    reasonCodes: [],
    confidence: "medium",
    validationSummary: {
      isSafeProposal: true,
      warnings: [],
      rejectedCount: 0
    },
    ...overrides
  };
}

function change(type, overrides = {}) {
  return {
    type,
    action: type,
    exerciseId: 10,
    exerciseName: "Bench Chest Press",
    reasonCodes: [],
    confidence: "medium",
    ...overrides
  };
}

test("weekly coach brief returns collect more data for empty history", () => {
  const brief = buildFitnessWeeklyCoachBrief({});

  assert.equal(brief.version, FITNESS_WEEKLY_COACH_BRIEF_VERSION);
  assert.equal(brief.reviewDecision, "collect_more_data");
  assert.equal(brief.confidence, "low");
  assert.deepEqual(brief.reviewActions, []);
  assert.equal(brief.coachNote, "Keep logging this week so the coach can read the trend.");
  assert.ok(brief.keyFindings.includes("No recent training history is available yet."));
  assert.ok(brief.coachQuestions[0].includes("log sets"));
});

test("progressing safe proposal returns minor adjustments with cautious progression finding", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [
        change("cautious_progression", {
          action: "increase_reps_or_small_load",
          reasonCodes: ["progressing_no_pain", "sufficient_exposures"],
          confidence: "high"
        })
      ],
      reasonCodes: ["progressing_no_pain", "sufficient_exposures"],
      confidence: "high"
    })
  });

  assert.equal(brief.reviewDecision, "minor_adjustments");
  assert.ok(brief.keyFindings.some((finding) => finding.includes("cautious progression")));
  assert.equal(brief.recommendedNextStep, "Apply only cautious progression where the proposal allows it.");
  assert.deepEqual(brief.reviewActions, []);
  assert.equal(brief.coachNote, "Nice consistency. The coach is watching trends before changing anything.");
  assert.equal(brief.confidence, "high");
});

test("plateau returns review finding and coach question", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation({
      exerciseDecisions: [
        {
          exerciseId: 20,
          exerciseName: "Lat Pulldown",
          status: "plateau",
          decision: "review_or_adjust",
          reasonCodes: ["plateau_3_plus_exposures"],
          confidence: "medium",
          blockedActions: []
        }
      ]
    }),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [
        change("review_or_adjust", {
          action: "review_rep_range_or_substitution",
          exerciseName: "Lat Pulldown",
          reasonCodes: ["plateau_3_plus_exposures"]
        })
      ],
      reasonCodes: ["plateau_3_plus_exposures"]
    })
  });

  assert.equal(brief.reviewDecision, "minor_adjustments");
  assert.ok(brief.keyFindings.some((finding) => finding.includes("Lat Pulldown looks stuck")));
  assert.ok(brief.coachQuestions.some((question) => question.includes("load, technique, or recovery")));
  assert.equal(brief.reviewActions[0].type, "review_or_adjust");
  assert.equal(brief.reviewActions[0].status, "preview_only");
});

test("low adherence returns simplification recommendation and no volume increase recommendation", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary({
      adherenceSummary: {
        recentSessions: 4,
        completedSessions: 1,
        completionRate: 25,
        averageSetCompletionPercent: 55
      },
      readinessFlags: ["low_adherence", "low_set_completion", "avoid_aggressive_progression"]
    }),
    adaptationDecisions: adaptation({
      readinessDecision: "conservative",
      readinessReasonCodes: ["low_adherence", "low_set_completion"],
      blockedActions: ["aggressive_progression", "increase_volume"]
    }),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("simplify_session", { action: "reduce_optional_volume" })],
      rejectedChanges: [
        change("increase_volume", {
          action: "increase_volume",
          reasonCodes: ["low_adherence"],
          blockedBy: ["increase_volume"]
        })
      ],
      blockedActions: ["aggressive_progression", "increase_volume"],
      reasonCodes: ["low_adherence", "low_set_completion"],
      validationSummary: {
        isSafeProposal: true,
        warnings: ["blocked_changes_rejected"],
        rejectedCount: 1
      }
    })
  });

  assert.equal(brief.reviewDecision, "minor_adjustments");
  assert.equal(brief.recommendedNextStep, "Simplify the week and avoid increasing volume.");
  assert.ok(brief.keyFindings.some((finding) => finding.includes("simplify")));
  assert.ok(brief.keyFindings.some((finding) => finding.includes("Volume increase rejected")));
  assert.equal(brief.reviewActions[0].type, "simplify_session");
  assert.ok(!brief.recommendedNextStep.startsWith("Increase volume"));
});

test("recurring pain returns needs review with safety note and no cautious progression recommendation", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary({
      issueSummary: {
        recentIssueCount: 2,
        recurringPainPatterns: ["knee pain on lunges"],
        fatigueSignals: []
      },
      readinessFlags: ["recurring_pain_reported", "avoid_aggressive_progression"]
    }),
    adaptationDecisions: adaptation({
      readinessDecision: "needs_review",
      readinessReasonCodes: ["recurring_pain"],
      readinessConfidence: "high",
      blockedActions: ["increase_load_on_related_movements"]
    }),
    planUpdateProposal: proposal({
      updateDecision: "needs_review",
      proposedChanges: [change("review_substitution_candidate", { action: "mark_substitution_review_candidate" })],
      rejectedChanges: [
        change("cautious_progression", {
          action: "increase_reps_or_small_load",
          blockedBy: ["increase_load_on_related_movements"],
          reasonCodes: ["recurring_pain"]
        })
      ],
      blockedActions: ["increase_load_on_related_movements"],
      reasonCodes: ["recurring_pain"],
      confidence: "high",
      validationSummary: {
        isSafeProposal: true,
        warnings: ["blocked_changes_rejected"],
        rejectedCount: 1
      }
    })
  });

  assert.equal(brief.reviewDecision, "needs_review");
  assert.ok(brief.safetyNotes.includes("Do not progress painful movements until reviewed."));
  assert.ok(brief.keyFindings.some((finding) => finding.includes("substitution review")));
  assert.equal(brief.reviewActions[0].type, "review_substitution_candidate");
  assert.equal(brief.reviewActions[0].priority, 1);
  assert.equal(brief.coachNote, "These are review suggestions, not automatic plan changes.");
  assert.ok(!brief.recommendedNextStep.includes("cautious progression"));
});

test("recovery risk returns recovery-focused brief and safety note", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary({
      issueSummary: {
        recentIssueCount: 1,
        recurringPainPatterns: [],
        fatigueSignals: ["poor recovery"]
      },
      readinessFlags: ["limited_recovery_signal", "avoid_aggressive_progression"]
    }),
    adaptationDecisions: adaptation({
      readinessDecision: "recovery_focus",
      readinessReasonCodes: ["recovery_risk"],
      blockedActions: ["high_intensity_progression"]
    }),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("reduce_load_or_volume", { action: "reduce_intensity_or_volume" })],
      rejectedChanges: [
        change("high_intensity_progression", {
          action: "high_intensity_progression",
          reasonCodes: ["recovery_risk"],
          blockedBy: ["high_intensity_progression"]
        })
      ],
      reasonCodes: ["recovery_risk"],
      blockedActions: ["high_intensity_progression"]
    })
  });

  assert.equal(brief.reviewDecision, "minor_adjustments");
  assert.equal(brief.recommendedNextStep, "Use a recovery-focused adjustment before progressing intensity.");
  assert.ok(brief.safetyNotes.includes("Avoid high-intensity progression while recovery risk is present."));
  assert.equal(brief.reviewActions[0].type, "reduce_load_or_volume");
  assert.ok(brief.coachQuestions.some((question) => question.includes("sleep, soreness, and energy")));
});

test("rejected changes appear as compact findings", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation({
      readinessReasonCodes: ["low_adherence"],
      blockedActions: ["increase_volume"]
    }),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("simplify_session", { action: "reduce_optional_volume" })],
      rejectedChanges: [
        change("increase_volume", {
          action: "increase_volume",
          blockedBy: ["increase_volume"]
        })
      ],
      reasonCodes: ["low_adherence"],
      blockedActions: ["increase_volume"]
    })
  });

  assert.ok(brief.keyFindings.includes("Volume increase rejected by readiness signals."));
});

test("unsafe proposal validation failure forces needs review", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("cautious_progression", { action: "increase_reps_or_small_load" })],
      validationSummary: {
        isSafeProposal: false,
        warnings: ["unsafe_proposal"],
        rejectedCount: 0
      }
    })
  });

  assert.equal(brief.reviewDecision, "needs_review");
  assert.ok(brief.safetyNotes.includes("Proposal validation failed; review before applying changes."));
});

test("weekly coach brief output stays compact", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary({
      readinessFlags: [
        "low_adherence",
        "low_set_completion",
        "recurring_pain_reported",
        "limited_recovery_signal",
        "avoid_aggressive_progression"
      ]
    }),
    adaptationDecisions: adaptation({
      readinessDecision: "needs_review",
      readinessReasonCodes: ["low_adherence", "low_set_completion", "recurring_pain", "recovery_risk"],
      exerciseDecisions: [
        { decision: "collect_more_data" },
        { decision: "collect_more_data" }
      ]
    }),
    planUpdateProposal: proposal({
      updateDecision: "needs_review",
      proposedChanges: [
        change("simplify_session", { action: "reduce_optional_volume" }),
        change("review_substitution_candidate", { action: "mark_substitution_review_candidate" }),
        change("reduce_load_or_volume", { action: "reduce_intensity_or_volume" }),
        change("collect_more_data", { action: "collect_more_data" })
      ],
      rejectedChanges: [
        change("increase_volume", { action: "increase_volume" }),
        change("cautious_progression", { action: "increase_reps_or_small_load" }),
        change("high_intensity_progression", { action: "high_intensity_progression" })
      ],
      reasonCodes: ["low_adherence", "low_set_completion", "recurring_pain", "recovery_risk"]
    })
  });

  assert.ok(brief.keyFindings.length <= 4);
  assert.ok(brief.coachQuestions.length <= 3);
  assert.ok(brief.safetyNotes.length <= 3);
  assert.ok(brief.reviewActions.length <= 3);
});

test("maintain without meaningful signals returns no actions and calm coach note", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal()
  });

  assert.equal(brief.reviewDecision, "keep_plan");
  assert.deepEqual(brief.reviewActions, []);
  assert.equal(brief.coachNote, "Keep the current plan. No plan change is needed right now.");
});

test("equipment signal creates substitution preview action only from matching proposed change", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("review_substitution_candidate", { reasonCodes: ["equipment_unavailable"] })],
      reasonCodes: ["equipment_unavailable"]
    })
  });

  assert.deepEqual(brief.reviewActions, [
    {
      type: "review_substitution_candidate",
      label: "Review an available substitute",
      reason: "Equipment availability may require a similar replacement.",
      status: "preview_only",
      priority: 4
    }
  ]);
});

test("repeated time signal creates simplify preview action", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("simplify_session")],
      reasonCodes: ["repeated_time_constraint"]
    })
  });

  assert.deepEqual(brief.reviewActions, [
    {
      type: "simplify_session",
      label: "Simplify this week",
      reason: "Time constraints repeated, so simplify before adding work.",
      status: "preview_only",
      priority: 3
    }
  ]);
});

test("too hard signal creates recovery preview action", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [change("reduce_load_or_volume", { reasonCodes: ["too_hard"] })],
      reasonCodes: ["too_hard"]
    })
  });

  assert.deepEqual(brief.reviewActions, [
    {
      type: "reduce_load_or_volume",
      label: "Use a recovery-focused adjustment",
      reason: "Recovery or difficulty signals suggest reducing load or volume.",
      status: "preview_only",
      priority: 2
    }
  ]);
});

test("review actions ignore collect more data, rejected changes, and low-confidence proposed changes", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [
        change("collect_more_data", { reasonCodes: ["low_adherence"] }),
        change("simplify_session", { confidence: "low", reasonCodes: ["low_adherence"] })
      ],
      rejectedChanges: [change("review_substitution_candidate", { reasonCodes: ["recurring_pain"] })],
      reasonCodes: ["low_adherence", "recurring_pain"]
    })
  });

  assert.deepEqual(brief.reviewActions, []);
});

test("review actions are limited to three and sorted by priority", () => {
  const brief = buildFitnessWeeklyCoachBrief({
    progressSummary: progressSummary(),
    adaptationDecisions: adaptation(),
    planUpdateProposal: proposal({
      updateDecision: "propose_changes",
      proposedChanges: [
        change("review_or_adjust", { exerciseName: "Lat Pulldown", reasonCodes: ["plateau_3_plus_exposures"] }),
        change("simplify_session", { reasonCodes: ["low_adherence"] }),
        change("review_substitution_candidate", { exerciseName: "Lunge", reasonCodes: ["equipment_unavailable"] }),
        change("reduce_load_or_volume", { reasonCodes: ["fatigue_signal"] }),
        change("review_substitution_candidate", { exerciseName: "Squat", reasonCodes: ["pain_signal"] })
      ],
      reasonCodes: [
        "plateau_3_plus_exposures",
        "low_adherence",
        "equipment_unavailable",
        "fatigue_signal",
        "pain_signal"
      ]
    })
  });

  assert.deepEqual(
    brief.reviewActions.map((action) => action.priority),
    [1, 2, 3]
  );
});
