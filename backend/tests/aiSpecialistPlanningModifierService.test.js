const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_PLANNING_MODIFIERS_VERSION,
  MAX_SOFT_SCORE_DELTA,
  buildFitnessPlanningModifiers
} = require("../services/aiSpecialistPlanningModifierService");

function knowledge(id, topic = id, principle = "", coachingUse = "") {
  return { id, topic, principle, coachingUse, confidence: "medium", sourceLabel: "test" };
}

function assertBounded(modifiers) {
  Object.values(modifiers.scoreBoosts).forEach((value) => {
    assert.ok(Math.abs(value) <= MAX_SOFT_SCORE_DELTA);
  });
  Object.values(modifiers.scorePenalties).forEach((value) => {
    assert.ok(Math.abs(value) <= MAX_SOFT_SCORE_DELTA);
  });
}

test("female beginner knowledge produces lower-body bias and upper-body maintenance modifiers", () => {
  const modifiers = buildFitnessPlanningModifiers({
    specialistContext: {
      profile: {
        level: "beginner",
        biologicalSex: "female",
        coachIntake: {
          trainingArchetype: "female_beginner_balanced_lower_body_bias",
          maintenanceMuscleGroups: ["shoulders", "back"],
          avoidSpecialization: ["upper_body_width"]
        }
      }
    },
    knowledgeItems: [
      knowledge("fit_kb_025_female_beginner_lower_body_bias"),
      knowledge("fit_kb_026_upper_body_maintenance")
    ]
  });

  assert.equal(modifiers.version, FITNESS_PLANNING_MODIFIERS_VERSION);
  assert.equal(modifiers.flags.biasLowerBodyButMaintainUpper, true);
  assert.equal(modifiers.flags.upperBodyMaintenance, true);
  assert.ok(modifiers.scoreBoosts.glutes > 0);
  assert.ok(modifiers.scoreBoosts.upperBodyMaintenance > 0);
  assertBounded(modifiers);
});

test("advanced bodybuilding does not receive female beginner defaults", () => {
  const modifiers = buildFitnessPlanningModifiers({
    specialistContext: {
      profile: {
        goal: "bodybuilding hypertrophy",
        level: "advanced",
        biologicalSex: "female",
        coachIntake: {
          mainGoal: "bodybuilding",
          trainingArchetype: "advanced_bodybuilding_split",
          priorityMuscleGroups: ["upper_body"]
        }
      }
    },
    knowledgeItems: [
      knowledge("fit_kb_025_female_beginner_lower_body_bias"),
      knowledge("fit_kb_026_upper_body_maintenance")
    ]
  });

  assert.equal(modifiers.flags.biasLowerBodyButMaintainUpper, false);
  assert.equal(modifiers.flags.upperBodyMaintenance, false);
  assert.equal(modifiers.scoreBoosts.glutes, 0);
});

test("knee pain produces bounded lower-risk boosts and soft penalties", () => {
  const modifiers = buildFitnessPlanningModifiers({
    specialistContext: {
      profile: {
        injuries: ["knee pain"],
        limitations: ["lunges cause discomfort"]
      }
    },
    knowledgeItems: [
      knowledge("fit_kb_020_lower_risk_substitutions", "substitution safety", "knee pain")
    ]
  });

  assert.equal(modifiers.flags.preferLowerRiskSubstitutions, true);
  assert.equal(modifiers.flags.avoidAggressiveProgression, true);
  assert.ok(modifiers.scoreBoosts.stableLowerBody > 0);
  assert.ok(modifiers.scorePenalties.lunge < 0);
  assert.ok(modifiers.scorePenalties.quadDominant < 0);
  assertBounded(modifiers);
});

test("low adherence produces simplification with minimum-count adjustment", () => {
  const modifiers = buildFitnessPlanningModifiers({
    specialistContext: {
      sessions: {
        recentCount: 5,
        completionRate: 40
      }
    },
    knowledgeItems: [knowledge("fit_kb_030_adherence_simplify")]
  });

  assert.equal(modifiers.flags.simplifyForAdherence, true);
  assert.equal(modifiers.exerciseCountAdjustment, -1);
  assert.ok(modifiers.scorePenalties.excessiveAccessories < 0);
  assertBounded(modifiers);
});

test("hypertrophy guidance uses selective failure wording", () => {
  const modifiers = buildFitnessPlanningModifiers({
    specialistContext: {
      profile: {
        goal: "muscle gain"
      }
    },
    knowledgeItems: [
      knowledge(
        "fit_kb_001_hypertrophy_close_to_failure",
        "hypertrophy RIR",
        "close-to-failure matters"
      ),
      knowledge("fit_kb_002_failure_selective_allowed", "selective failure")
    ]
  });
  const guidance = modifiers.prescriptionGuidance.join(" ");

  assert.equal(modifiers.flags.hypertrophySelectiveFailureGuidance, true);
  assert.match(guidance, /Close-to-failure matters/i);
  assert.match(guidance, /failure is useful and allowed/i);
  assert.match(guidance, /selective/i);
  assert.doesNotMatch(guidance, /failure is unnecessary/i);
});

test("empty knowledge returns no-op modifiers", () => {
  const modifiers = buildFitnessPlanningModifiers({
    specialistContext: {
      profile: {
        goal: "muscle gain",
        injuries: ["knee pain"]
      }
    },
    knowledgeItems: []
  });

  assert.equal(modifiers.flags.simplifyForAdherence, false);
  assert.equal(modifiers.flags.preferLowerRiskSubstitutions, false);
  assert.equal(modifiers.exerciseCountAdjustment, 0);
  assert.deepEqual(modifiers.prescriptionGuidance, []);
  assert.equal(Object.values(modifiers.scoreBoosts).every((value) => value === 0), true);
  assert.equal(Object.values(modifiers.scorePenalties).every((value) => value === 0), true);
});
