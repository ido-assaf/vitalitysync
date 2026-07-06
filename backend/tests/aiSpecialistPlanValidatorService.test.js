const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_PLAN_VALIDATOR_VERSION,
  validateFitnessPlanQuality
} = require("../services/aiSpecialistPlanValidatorService");

const baseProfile = {
  goal: "muscle gain",
  level: "beginner",
  biologicalSex: "female",
  trainingDaysPerWeek: 3,
  injuries: [],
  limitations: [],
  dislikedExercises: []
};

function exercise(exerciseId, name, mainMuscleGroup, subMuscleGroup, movementPattern) {
  return {
    exerciseId,
    name,
    mainMuscleGroup,
    muscleGroup: mainMuscleGroup,
    subMuscleGroup,
    movementPattern,
    equipment: "gym",
    level: "beginner"
  };
}

const exercises = [
  exercise(1, "Bench Chest Press", "Chest", "Mid Chest", "horizontal push"),
  exercise(2, "Seated Cable Row", "Back", "Mid Back", "horizontal pull"),
  exercise(3, "Barbell Hip Thrust", "Legs", "Glutes", "hinge/posterior chain"),
  exercise(4, "Dead Bug", "Core", "Anti-Rotation", "core stability"),
  exercise(5, "Forward Lunge", "Legs", "Glutes", "squat/lunge"),
  exercise(6, "Bike Sprint", "Legs", "Quads", "conditioning/power"),
  exercise(7, "Dumbbell Shoulder Press", "Shoulders", "Front Delts", "vertical push")
];

function assignment(exerciseId, dayLabel = "Day 1 - Full Body", targetSets = 3) {
  return {
    exerciseId,
    dayLabel,
    orderIndex: exerciseId,
    targetSets,
    targetReps: "8-12"
  };
}

function warningCodes(report) {
  return report.warnings.map((warning) => warning.code);
}

test("balanced plan passes with a high quality score", () => {
  const report = validateFitnessPlanQuality({
    profile: baseProfile,
    assignments: [assignment(1), assignment(2), assignment(3), assignment(4)],
    exercises
  });

  assert.equal(report.version, FITNESS_PLAN_VALIDATOR_VERSION);
  assert.equal(report.passed, true);
  assert.ok(report.qualityScore >= 90);
  assert.equal(report.summary.hasPush, true);
  assert.equal(report.summary.hasPull, true);
  assert.equal(report.summary.hasLower, true);
  assert.equal(report.summary.hasCore, true);
});

test("missing major movement patterns produces critical balance findings", () => {
  const report = validateFitnessPlanQuality({
    profile: baseProfile,
    assignments: [assignment(3), assignment(4)],
    exercises
  });

  assert.equal(report.passed, false);
  assert.ok(warningCodes(report).includes("complete.too_few_exercises"));
  assert.ok(warningCodes(report).includes("balance.missing_push"));
  assert.ok(warningCodes(report).includes("balance.missing_pull"));
  assert.ok(report.corrections.some((correction) => correction.action === "add_push_slot"));
});

test("knee pain flags explicitly painful lunges but preserves safer lower-body alternatives", () => {
  const report = validateFitnessPlanQuality({
    profile: {
      ...baseProfile,
      injuries: ["knee pain"],
      limitations: ["lunges cause discomfort"]
    },
    assignments: [assignment(1), assignment(2), assignment(3), assignment(4), assignment(5)],
    exercises
  });

  assert.equal(report.passed, false);
  assert.ok(warningCodes(report).includes("safety.explicit_painful_lunge"));
  assert.equal(report.summary.hasLower, true);
  assert.ok(report.corrections.some((correction) => correction.action === "substitute_exercise"));
});

test("knee pain with safer lower-body work can pass", () => {
  const report = validateFitnessPlanQuality({
    profile: {
      ...baseProfile,
      injuries: ["knee pain"],
      limitations: ["lunges cause discomfort"]
    },
    assignments: [assignment(1), assignment(2), assignment(3), assignment(4)],
    exercises
  });

  assert.equal(report.passed, true);
  assert.ok(!warningCodes(report).includes("safety.knee_removed_lower_body"));
  assert.ok(!warningCodes(report).includes("safety.explicit_painful_lunge"));
});

test("female beginner lower-body bias requires upper-body maintenance", () => {
  const report = validateFitnessPlanQuality({
    profile: baseProfile,
    assignments: [assignment(3), assignment(4), assignment(3, "Day 2 - Lower", 3)],
    exercises,
    planningModifiers: {
      flags: {
        biasLowerBodyButMaintainUpper: true
      }
    }
  });

  assert.equal(report.passed, false);
  assert.ok(warningCodes(report).includes("balance.missing_upper_maintenance"));
});

test("low adherence simplification still requires complete daily structure", () => {
  const report = validateFitnessPlanQuality({
    profile: baseProfile,
    assignments: [assignment(1), assignment(2)],
    exercises,
    planningModifiers: {
      flags: {
        simplifyForAdherence: true
      }
    }
  });

  assert.equal(report.passed, false);
  assert.ok(warningCodes(report).includes("complete.too_few_exercises"));
});

test("disliked exercises and excessive beginner volume are flagged without changing the plan", () => {
  const report = validateFitnessPlanQuality({
    profile: {
      ...baseProfile,
      dislikedExercises: ["bike"]
    },
    assignments: [
      assignment(1, "Day 1 - Full Body", 6),
      assignment(2, "Day 1 - Full Body", 6),
      assignment(3, "Day 1 - Full Body", 6),
      assignment(4, "Day 1 - Full Body", 6),
      assignment(6, "Day 1 - Full Body", 4)
    ],
    exercises
  });

  assert.equal(report.passed, true);
  assert.ok(warningCodes(report).includes("volume.high_daily_sets"));
  assert.ok(warningCodes(report).includes("preference.disliked_exercise"));
  assert.ok(report.qualityScore < 100);
});
