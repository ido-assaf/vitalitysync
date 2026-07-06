const test = require("node:test");
const assert = require("node:assert/strict");
const { Exercise } = require("../models");
const workoutPlansController = require("../controllers/workoutPlansController");
const { buildSpecialistRules } = require("../services/aiSpecialistRuleService");
const { retrieveFitnessKnowledge } = require("../services/aiSpecialistKnowledgeService");
const { buildFitnessPlanningModifiers } = require("../services/aiSpecialistPlanningModifierService");
const { validateFitnessPlanQuality } = require("../services/aiSpecialistPlanValidatorService");

const { choosePlanExercises } = workoutPlansController._internals;

const coach = {
  domain: "training",
  specialty: "strength training",
  coachSpecialty: "strength training"
};

function exercise(
  exerciseId,
  name,
  mainMuscleGroup,
  subMuscleGroup,
  movementPattern,
  equipment = "gym",
  level = "beginner",
  goalTags = []
) {
  return {
    exerciseId,
    name,
    mainMuscleGroup,
    muscleGroup: mainMuscleGroup,
    subMuscleGroup,
    movementPattern,
    equipment,
    level,
    goalTags
  };
}

const exerciseLibrary = [
  exercise(1, "Bench Chest Press", "Chest", "Mid Chest", "horizontal push", "gym", "beginner", [
    "compound",
    "hypertrophy"
  ]),
  exercise(2, "Incline Chest Press", "Chest", "Upper Chest", "horizontal push", "gym", "beginner", [
    "compound"
  ]),
  exercise(3, "Push-Up", "Chest", "Mid Chest", "horizontal push", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(4, "Incline Push-Up", "Chest", "Upper Chest", "horizontal push", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(5, "Parallel Bar Dip", "Chest", "Lower Chest", "vertical push", "gym", "intermediate", [
    "compound"
  ]),
  exercise(6, "Seated Cable Row", "Back", "Mid Back", "horizontal pull", "gym", "beginner", [
    "compound",
    "hypertrophy"
  ]),
  exercise(7, "Lat Pulldown", "Back", "Lats", "vertical pull", "gym", "beginner", ["compound"]),
  exercise(8, "Inverted Row", "Back", "Mid Back", "horizontal pull", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(9, "Towel Door Row", "Back", "Lats", "vertical pull", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(10, "Dumbbell Shoulder Press", "Shoulders", "Front Delts", "vertical push", "gym", "beginner", [
    "compound"
  ]),
  exercise(11, "Cable Lateral Raise", "Shoulders", "Side Delts", "isolation", "gym", "beginner", [
    "hypertrophy"
  ]),
  exercise(12, "Scapular Wall Slide", "Shoulders", "Rotator Cuff", "isolation", "bodyweight", "beginner", [
    "stability"
  ]),
  exercise(13, "Cable Face Pull", "Shoulders", "Rear Delts", "horizontal pull", "gym", "beginner", [
    "hypertrophy"
  ]),
  exercise(14, "Prone Y Raise", "Shoulders", "Rear Delts", "isolation", "bodyweight", "beginner", [
    "stability"
  ]),
  exercise(15, "Triceps Pushdown", "Arms", "Triceps", "arm isolation", "gym", "beginner", [
    "isolation"
  ]),
  exercise(16, "Close-Grip Push-Up", "Arms", "Triceps", "arm isolation", "bodyweight", "beginner", [
    "isolation"
  ]),
  exercise(17, "Dumbbell Curl", "Arms", "Biceps", "arm isolation", "gym", "beginner", ["isolation"]),
  exercise(18, "Backpack Curl", "Arms", "Biceps", "arm isolation", "bodyweight", "beginner", [
    "isolation"
  ]),
  exercise(19, "Barbell Hip Thrust", "Legs", "Glutes", "hinge/posterior chain", "gym", "beginner", [
    "compound",
    "hypertrophy"
  ]),
  exercise(20, "Glute Bridge", "Legs", "Glutes", "hinge/posterior chain", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(21, "Hamstring Curl Machine", "Legs", "Hamstrings", "hinge/posterior chain", "gym", "beginner", [
    "hypertrophy"
  ]),
  exercise(22, "Towel Hamstring Curl", "Legs", "Hamstrings", "hinge/posterior chain", "bodyweight", "beginner", [
    "hypertrophy"
  ]),
  exercise(23, "Box Squat to Bench", "Legs", "Glutes", "squat/lunge", "gym", "beginner", [
    "compound"
  ]),
  exercise(24, "Chair Box Squat", "Legs", "Glutes", "squat/lunge", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(25, "Forward Lunge", "Legs", "Glutes", "squat/lunge", "gym", "beginner", [
    "compound"
  ]),
  exercise(26, "Supported Step Up", "Legs", "Glutes", "squat/lunge", "gym", "beginner", [
    "compound"
  ]),
  exercise(27, "Bodyweight Step Up", "Legs", "Glutes", "squat/lunge", "bodyweight", "beginner", [
    "compound"
  ]),
  exercise(28, "Leg Press", "Legs", "Quads", "squat/lunge", "gym", "beginner", ["compound"]),
  exercise(29, "Standing Calf Raise", "Legs", "Calves", "calf raise", "gym", "beginner", [
    "isolation"
  ]),
  exercise(30, "Single-Leg Calf Raise", "Legs", "Calves", "calf raise", "bodyweight", "beginner", [
    "isolation"
  ]),
  exercise(31, "Dead Bug", "Core", "Anti-Rotation", "core stability", "bodyweight", "beginner", [
    "core"
  ]),
  exercise(32, "Plank", "Core", "Abs", "core stability", "bodyweight", "beginner", ["core"]),
  exercise(33, "Bike Sprint", "Legs", "Quads", "conditioning/power", "gym", "beginner", [
    "conditioning"
  ]),
  exercise(34, "Mountain Climber", "Core", "Abs", "conditioning/power", "bodyweight", "beginner", [
    "conditioning"
  ]),
  exercise(35, "Barbell Bench Press", "Chest", "Mid Chest", "horizontal push", "gym", "advanced", [
    "compound",
    "strength",
    "hypertrophy"
  ]),
  exercise(36, "Weighted Pull-Up", "Back", "Lats", "vertical pull", "gym", "advanced", [
    "compound",
    "strength",
    "hypertrophy"
  ]),
  exercise(37, "Romanian Deadlift", "Legs", "Hamstrings", "hinge/posterior chain", "gym", "advanced", [
    "compound",
    "hypertrophy"
  ]),
  exercise(38, "Cable Chest Fly", "Chest", "Chest Isolation", "horizontal push", "gym", "intermediate", [
    "hypertrophy"
  ]),
  exercise(39, "Machine Row", "Back", "Mid Back", "horizontal pull", "gym", "intermediate", [
    "hypertrophy"
  ]),
  exercise(40, "Hip Airplane Support", "Legs", "Glutes", "hinge/posterior chain", "bodyweight", "intermediate", [
    "stability"
  ])
];

const baseProfile = {
  goal: "muscle gain",
  level: "beginner",
  biologicalSex: "female",
  age: 30,
  trainingDaysPerWeek: 3,
  preferredStyle: "balanced",
  equipmentAccess: ["gym", "bodyweight"],
  injuries: [],
  limitations: [],
  likedExercises: [],
  dislikedExercises: [],
  coachIntake: {}
};

function withExerciseLibrary(run) {
  const originalFindAll = Exercise.findAll;

  Exercise.findAll = async () => exerciseLibrary;

  return Promise.resolve()
    .then(run)
    .finally(() => {
      Exercise.findAll = originalFindAll;
    });
}

function buildContext(profile, overrides = {}) {
  return {
    profile,
    sessions: {
      recentCount: 0,
      completedCount: 0,
      completionRate: null,
      averageSetCompletionPercent: null,
      ...(overrides.sessions || {})
    },
    issues: {
      recentCount: 0,
      issueThemes: [],
      ...(overrides.issues || {})
    },
    currentPlan: {
      hasCurrentPlan: false,
      ...(overrides.currentPlan || {})
    }
  };
}

function byId() {
  return new Map(exerciseLibrary.map((item) => [String(item.exerciseId), item]));
}

function selectedExercises(assignments) {
  const exerciseById = byId();
  return assignments.map((assignment) => exerciseById.get(String(assignment.exerciseId))).filter(Boolean);
}

function text(value) {
  return String(value || "").toLowerCase();
}

function patternIncludes(exercise, value) {
  return text(exercise.movementPattern).includes(value);
}

function isPush(exercise) {
  return patternIncludes(exercise, "push") || ["chest", "shoulders"].includes(text(exercise.mainMuscleGroup));
}

function isPull(exercise) {
  return patternIncludes(exercise, "pull") || text(exercise.mainMuscleGroup) === "back";
}

function isLower(exercise) {
  return (
    text(exercise.mainMuscleGroup) === "legs" ||
    patternIncludes(exercise, "squat") ||
    patternIncludes(exercise, "lunge") ||
    patternIncludes(exercise, "hinge")
  );
}

function isCore(exercise) {
  return text(exercise.mainMuscleGroup) === "core" || patternIncludes(exercise, "core");
}

function isUpper(exercise) {
  return ["chest", "back", "shoulders", "arms"].includes(text(exercise.mainMuscleGroup));
}

function isGymOnly(exercise) {
  const equipment = text(exercise.equipment);
  return (
    equipment.includes("gym") ||
    equipment.includes("cable") ||
    equipment.includes("machine") ||
    equipment.includes("barbell") ||
    equipment.includes("dumbbell")
  );
}

function countByDay(assignments) {
  return assignments.reduce((counts, assignment) => {
    counts[assignment.dayLabel] = (counts[assignment.dayLabel] || 0) + 1;
    return counts;
  }, {});
}

function warningCodes(report, severity = null) {
  return report.warnings
    .filter((warning) => !severity || warning.severity === severity)
    .map((warning) => warning.code);
}

function knowledgeText(knowledgeItems) {
  return knowledgeItems
    .map((item) => [item.id, item.topic, item.principle, item.coachingUse].join(" "))
    .join(" ");
}

async function runGoldenProfile({ profile, contextOverrides = {}, expertRuleOverrides = {} }) {
  const specialistContext = buildContext(profile, contextOverrides);
  const expertRules = {
    ...buildSpecialistRules({
      specialist: coach,
      specialistContext
    }),
    ...expertRuleOverrides
  };
  const knowledgeItems = retrieveFitnessKnowledge({
    specialistContext,
    expertRules,
    limit: 6
  });
  const planningModifiers = buildFitnessPlanningModifiers({
    specialistContext,
    expertRules,
    knowledgeItems
  });
  const assignments = await choosePlanExercises(profile, coach, planningModifiers);
  const selected = selectedExercises(assignments);
  const report = validateFitnessPlanQuality({
    profile,
    assignments,
    exercises: exerciseLibrary,
    knowledgeItems,
    planningModifiers
  });

  return {
    assignments,
    dayCounts: countByDay(assignments),
    expertRules,
    knowledgeItems,
    knowledgeIds: knowledgeItems.map((item) => item.id),
    modifiers: planningModifiers,
    report,
    selected,
    selectedNames: selected.map((exercise) => exercise.name)
  };
}

function assertNoCriticalWarnings(result) {
  assert.deepEqual(warningCodes(result.report, "critical"), []);
}

function assertQuality(result, minimum = 85) {
  assert.equal(result.report.passed, true);
  assert.ok(
    result.report.qualityScore >= minimum,
    `Expected quality score >= ${minimum}, got ${result.report.qualityScore}`
  );
}

function assertFullBodyStructure(result) {
  assert.ok(result.selected.some(isPush), "expected push work");
  assert.ok(result.selected.some(isPull), "expected pull work");
  assert.ok(result.selected.some(isLower), "expected lower-body work");
  assert.ok(result.selected.some(isCore), "expected core work");
}

function assertMinimumStrengthStructure(result) {
  assert.ok(result.selected.some(isPush), "expected push work");
  assert.ok(result.selected.some(isPull), "expected pull work");
  assert.ok(result.selected.some(isLower), "expected lower-body work");
}

test("golden profile: female beginner glutes keeps lower bias and upper maintenance", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      coachIntake: {
        mainGoal: "hypertrophy",
        trainingArchetype: "female_beginner_balanced_lower_body_bias",
        priorityMuscleGroups: ["glutes", "hamstrings", "quads"],
        maintenanceMuscleGroups: ["shoulders", "back"],
        avoidSpecialization: ["upper_body_width"]
      }
    };
    const result = await runGoldenProfile({ profile });

    assertQuality(result, 85);
    assertNoCriticalWarnings(result);
    assertFullBodyStructure(result);
    assert.equal(result.modifiers.flags.biasLowerBodyButMaintainUpper, true);
    assert.equal(result.modifiers.flags.upperBodyMaintenance, true);
    assert.ok(result.selected.some((exercise) => /glute|hamstring/i.test(exercise.subMuscleGroup)));
    assert.ok(result.selected.some(isUpper));
  });
});

test("golden profile: knee pain and lunge discomfort avoids painful lunges", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      injuries: ["knee pain"],
      limitations: ["lunges cause discomfort"]
    };
    const result = await runGoldenProfile({
      profile,
      contextOverrides: {
        issues: {
          recentCount: 1,
          issueThemes: ["knee discomfort on lunges"]
        }
      }
    });

    assertQuality(result, 80);
    assertNoCriticalWarnings(result);
    assertFullBodyStructure(result);
    assert.ok(!result.selectedNames.some((name) => /lunge/i.test(name)));
    assert.ok(result.selected.some((exercise) => /hip thrust|hamstring|box squat|step up|glute/i.test(exercise.name)));
  });
});

test("golden profile: low adherence simplifies without incomplete days", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      biologicalSex: "male",
      coachIntake: {
        mainGoal: "general fitness"
      }
    };
    const standard = await runGoldenProfile({ profile });
    const lowAdherence = await runGoldenProfile({
      profile,
      contextOverrides: {
        sessions: {
          recentCount: 5,
          completedCount: 2,
          completionRate: 40,
          averageSetCompletionPercent: 65
        }
      }
    });

    assertQuality(lowAdherence, 80);
    assertNoCriticalWarnings(lowAdherence);
    assert.equal(lowAdherence.modifiers.flags.simplifyForAdherence, true);
    assert.ok(lowAdherence.assignments.length < standard.assignments.length);
    assert.equal(Object.values(lowAdherence.dayCounts).every((count) => count >= 3), true);
    assertMinimumStrengthStructure(lowAdherence);
  });
});

test("golden profile: advanced bodybuilding avoids beginner defaults", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      goal: "bodybuilding hypertrophy",
      level: "advanced",
      biologicalSex: "female",
      trainingDaysPerWeek: 5,
      coachIntake: {
        mainGoal: "bodybuilding",
        trainingArchetype: "advanced_bodybuilding_split",
        priorityMuscleGroups: ["upper_body"]
      }
    };
    const result = await runGoldenProfile({ profile });

    assertQuality(result, 85);
    assertNoCriticalWarnings(result);
    assert.equal(result.modifiers.flags.biasLowerBodyButMaintainUpper, false);
    assert.equal(result.modifiers.flags.simplifyForAdherence, false);
    assert.ok(!result.knowledgeIds.includes("fit_kb_025_female_beginner_lower_body_bias"));
  });
});

test("golden profile: no gym bodyweight plan avoids gym-only exercises", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      biologicalSex: "male",
      equipmentAccess: ["bodyweight", "home"],
      coachIntake: {
        mainGoal: "general fitness"
      }
    };
    const result = await runGoldenProfile({ profile });

    assertQuality(result, 80);
    assertNoCriticalWarnings(result);
    assert.ok(result.assignments.length > 0);
    assertFullBodyStructure(result);
    assert.deepEqual(result.selected.filter(isGymOnly).map((exercise) => exercise.name), []);
  });
});

test("golden profile: disliked squats avoids squat names while preserving lower body", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      dislikedExercises: ["squat"]
    };
    const result = await runGoldenProfile({ profile });

    assertQuality(result, 80);
    assertNoCriticalWarnings(result);
    assert.ok(!result.selectedNames.some((name) => /squat/i.test(name)));
    assert.ok(result.selected.some(isLower));
  });
});

test("golden profile: short sessions avoid excessive volume", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      preferredStyle: "short sessions",
      trainingDaysPerWeek: 3
    };
    const result = await runGoldenProfile({ profile });

    assertQuality(result, 85);
    assertNoCriticalWarnings(result);
    assertFullBodyStructure(result);
    assert.ok(!warningCodes(result.report).includes("volume.high_daily_sets"));
  });
});

test("golden profile: intermediate hypertrophy retrieves selective failure guidance", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      biologicalSex: "male",
      goal: "muscle gain hypertrophy",
      level: "intermediate",
      coachIntake: {
        mainGoal: "hypertrophy"
      }
    };
    const result = await runGoldenProfile({ profile });
    const combinedKnowledge = knowledgeText(result.knowledgeItems);
    const combinedGuidance = result.modifiers.prescriptionGuidance.join(" ");

    assertQuality(result, 85);
    assertNoCriticalWarnings(result);
    assert.match(combinedKnowledge, /close to failure|close-to-failure|selective failure/i);
    assert.doesNotMatch(`${combinedKnowledge} ${combinedGuidance}`, /failure is unnecessary/i);
  });
});

test("golden profile: weight loss beginner keeps strength structure", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      biologicalSex: "male",
      goal: "weight loss fat loss",
      coachIntake: {
        mainGoal: "fat loss"
      }
    };
    const result = await runGoldenProfile({ profile });
    const conditioningCount = result.selected.filter((exercise) =>
      patternIncludes(exercise, "conditioning")
    ).length;

    assertQuality(result, 85);
    assertNoCriticalWarnings(result);
    assertFullBodyStructure(result);
    assert.ok(result.selected.some((exercise) => /compound|strength|hypertrophy/i.test(exercise.goalTags.join(" "))));
    assert.ok(conditioningCount < result.selected.length / 2, "plan should not be cardio-only");
    assert.ok(!warningCodes(result.report).includes("volume.high_daily_sets"));
  });
});

test("golden profile: older trainee limited recovery avoids excessive volume", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      age: 68,
      biologicalSex: "male",
      goal: "general fitness health",
      limitations: ["limited recovery capacity"],
      trainingDaysPerWeek: 3,
      coachIntake: {
        mainGoal: "general fitness",
        constraints: ["limited recovery", "avoid aggressive progression"]
      }
    };
    const result = await runGoldenProfile({
      profile,
      expertRuleOverrides: {
        warnings: ["Recovery capacity is limited."],
        recommendedAdjustments: ["Keep daily volume conservative and avoid aggressive progression."],
        explanationHints: []
      }
    });

    assertQuality(result, 80);
    assertNoCriticalWarnings(result);
    assertFullBodyStructure(result);
    assert.ok(!warningCodes(result.report).includes("volume.high_daily_sets"));
    assert.match(result.expertRules.recommendedAdjustments.join(" "), /conservative|aggressive progression/i);
  });
});

test("golden profile: shoulder pain avoids overhead pressing while keeping safe upper work", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      biologicalSex: "male",
      injuries: ["shoulder pain"],
      limitations: ["overhead pressing discomfort"]
    };
    const result = await runGoldenProfile({ profile });

    assertQuality(result, 80);
    assertNoCriticalWarnings(result);
    assertFullBodyStructure(result);
    assert.ok(!result.selectedNames.some((name) => /shoulder press|dip/i.test(name)));
    assert.ok(result.selected.some(isPush));
    assert.ok(result.selected.some(isPull));
  });
});

test("golden profile: very limited time and home equipment keeps minimum viable structure", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      biologicalSex: "male",
      preferredStyle: "short sessions",
      equipmentAccess: ["home", "bodyweight"],
      coachIntake: {
        mainGoal: "general fitness",
        constraints: ["very limited time"]
      }
    };
    const result = await runGoldenProfile({
      profile,
      contextOverrides: {
        sessions: {
          recentCount: 4,
          completedCount: 2,
          completionRate: 50,
          averageSetCompletionPercent: 66
        }
      }
    });

    assertQuality(result, 80);
    assertNoCriticalWarnings(result);
    assert.ok(result.assignments.length > 0);
    assertFullBodyStructure(result);
    assert.equal(Object.values(result.dayCounts).every((count) => count >= 3), true);
    assert.deepEqual(result.selected.filter(isGymOnly).map((exercise) => exercise.name), []);
  });
});
