const test = require("node:test");
const assert = require("node:assert/strict");
const {
  attachRulesToContext,
  buildSpecialistRules
} = require("../services/aiSpecialistRuleService");

test("fitness rules flag injuries, low adherence, and reported issues", () => {
  const rules = buildSpecialistRules({
    specialist: {
      domain: "training",
      specialty: "strength training"
    },
    specialistContext: {
      profile: {
        level: "beginner",
        trainingDaysPerWeek: 3,
        injuries: ["knee discomfort"],
        limitations: []
      },
      sessions: {
        recentCount: 5,
        completionRate: 40,
        averageSetCompletionPercent: 65
      },
      issues: {
        recentCount: 1,
        issueThemes: ["knee pain during lunges"]
      },
      currentPlan: {
        daysPerWeek: 3,
        assignmentCount: 12
      }
    }
  });

  assert.equal(rules.ruleSetId, "strength_training");
  assert.equal(rules.productRole, "fitness_coach");
  assert.match(rules.warnings.join(" "), /injury|adherence|set completion|issues/i);
  assert.match(rules.recommendedAdjustments.join(" "), /simple|manageable|beginner/i);
  assert.equal(rules.hardStops.length, 0);
});

test("fitness rules translate coach intake into balanced emphasis guidance", () => {
  const rules = buildSpecialistRules({
    specialist: {
      domain: "training",
      specialty: "strength training"
    },
    specialistContext: {
      profile: {
        goal: "muscle gain",
        level: "beginner",
        trainingDaysPerWeek: 3,
        injuries: [],
        limitations: [],
        coachIntake: {
          mainGoal: "hypertrophy",
          trainingArchetype: "female_beginner_balanced_lower_body_bias",
          avoidSpecialization: ["upper_body_width"]
        }
      },
      sessions: {
        recentCount: 0
      },
      issues: {
        recentCount: 0
      },
      currentPlan: {}
    }
  });

  assert.match(rules.recommendedAdjustments.join(" "), /lower-body|glute|maintenance/i);
  assert.match(rules.explanationHints.join(" "), /failure used selectively|push, pull/i);
});

test("nutrition rules enforce allergies and low protein guidance without replacing backend target validation", () => {
  const rules = buildSpecialistRules({
    specialist: {
      domain: "nutrition",
      specialty: "sports nutrition"
    },
    specialistContext: {
      profile: {
        allergies: ["milk"],
        medicalRestrictions: ["low sodium"]
      },
      recentLogging: {
        loggedDayCount: 4,
        averageProteinVsTargetPercent: 60,
        averageCaloriesVsTargetPercent: 112
      },
      guidancePatterns: {
        cautionFoods: [{ value: "Chocolate Bar", count: 2 }],
        lowConfidenceEstimateCount: 1
      }
    },
    baseline: {
      canCalculate: true,
      suggestedCalories: 2200,
      suggestedProtein: 140
    }
  });

  assert.equal(rules.ruleSetId, "sports_nutrition");
  assert.match(rules.hardStops.join(" "), /milk/);
  assert.match(rules.warnings.join(" "), /protein|calorie|Chocolate Bar|low confidence/i);
  assert.match(rules.recommendedAdjustments.join(" "), /protein-forward|portion control|uncertain/i);
  assert.match(rules.explanationHints.join(" "), /generated outputs|validated backend/i);
});

test("future specialist rules expose disabled skeletons", () => {
  const rules = buildSpecialistRules({
    specialist: {
      domain: "training",
      specialty: "football"
    },
    specialistContext: {}
  });

  assert.equal(rules.ruleSetId, "football_performance");
  assert.equal(rules.productRole, "football_coach");
  assert.match(rules.hardStops.join(" "), /not available/);
  assert.match(rules.explanationHints.join(" "), /speed|agility|impact/i);
});

test("rules attach to context without losing summary data", () => {
  const context = {
    domain: "nutrition",
    recentLogging: {
      averageProteinVsTargetPercent: 75
    }
  };
  const rules = {
    hardStops: ["Avoid allergens."],
    warnings: [],
    recommendedAdjustments: [],
    explanationHints: []
  };

  assert.deepEqual(attachRulesToContext(context, rules), {
    ...context,
    expertRules: rules
  });
});
