const test = require("node:test");
const assert = require("node:assert/strict");
const { Exercise } = require("../models");
const workoutPlansController = require("../controllers/workoutPlansController");
const {
  buildFitnessPlanningModifiers,
  emptyFitnessPlanningModifiers
} = require("../services/aiSpecialistPlanningModifierService");

const {
  buildPlanQualityNote,
  choosePlanExercises,
  adjustedTargetExerciseCount
} = workoutPlansController._internals;

const coach = {
  coachSpecialty: "strength training"
};

const baseProfile = {
  goal: "muscle gain",
  level: "beginner",
  biologicalSex: "female",
  trainingDaysPerWeek: 3,
  equipmentAccess: ["gym"],
  injuries: [],
  limitations: [],
  likedExercises: [],
  dislikedExercises: []
};

function exercise(exerciseId, name, mainMuscleGroup, subMuscleGroup, movementPattern, goalTags = []) {
  return {
    exerciseId,
    name,
    mainMuscleGroup,
    muscleGroup: mainMuscleGroup,
    subMuscleGroup,
    movementPattern,
    equipment: "gym",
    level: "beginner",
    goalTags
  };
}

const exerciseLibrary = [
  exercise(1, "Bench Chest Press", "Chest", "Mid Chest", "horizontal push", [
    "compound",
    "hypertrophy"
  ]),
  exercise(2, "Incline Chest Press", "Chest", "Upper Chest", "horizontal push", [
    "compound"
  ]),
  exercise(3, "Seated Cable Row", "Back", "Mid Back", "horizontal pull", [
    "compound",
    "hypertrophy"
  ]),
  exercise(4, "Lat Pulldown", "Back", "Lats", "vertical pull", ["compound"]),
  exercise(5, "Dumbbell Shoulder Press", "Shoulders", "Front Delts", "vertical push", [
    "compound"
  ]),
  exercise(6, "Cable Lateral Raise", "Shoulders", "Side Delts", "isolation", [
    "hypertrophy"
  ]),
  exercise(7, "Triceps Pushdown", "Arms", "Triceps", "arm isolation", ["isolation"]),
  exercise(8, "Dumbbell Curl", "Arms", "Biceps", "arm isolation", ["isolation"]),
  exercise(9, "Barbell Hip Thrust", "Legs", "Glutes", "hinge/posterior chain", [
    "compound",
    "hypertrophy"
  ]),
  exercise(10, "Hamstring Curl Machine", "Legs", "Hamstrings", "hinge/posterior chain", [
    "hypertrophy"
  ]),
  exercise(11, "Box Squat to Bench", "Legs", "Glutes", "squat/lunge", [
    "compound"
  ]),
  exercise(12, "Forward Lunge", "Legs", "Glutes", "squat/lunge", ["compound"]),
  exercise(13, "Leg Press", "Legs", "Quads", "squat/lunge", ["compound"]),
  exercise(14, "Supported Step Up", "Legs", "Glutes", "squat/lunge", ["compound"]),
  exercise(15, "Standing Calf Raise", "Legs", "Calves", "calf raise", ["isolation"]),
  exercise(16, "Dead Bug", "Core", "Anti-Rotation", "core stability", ["core"]),
  exercise(17, "Plank", "Core", "Abs", "core stability", ["core"]),
  exercise(18, "Bike Sprint", "Legs", "Quads", "conditioning/power", ["conditioning"]),
  exercise(19, "Cable Face Pull", "Shoulders", "Rear Delts", "horizontal pull", [
    "hypertrophy"
  ])
];

function withExerciseLibrary(run) {
  const originalFindAll = Exercise.findAll;

  Exercise.findAll = async () => exerciseLibrary;

  return Promise.resolve()
    .then(run)
    .finally(() => {
      Exercise.findAll = originalFindAll;
    });
}

function assignedExercises(assignments) {
  const byId = new Map(exerciseLibrary.map((item) => [item.exerciseId, item]));

  return assignments.map((assignment) => byId.get(assignment.exerciseId));
}

function countByDay(assignments) {
  return assignments.reduce((counts, assignment) => {
    counts[assignment.dayLabel] = (counts[assignment.dayLabel] || 0) + 1;
    return counts;
  }, {});
}

test("female beginner lower-body bias preserves push pull and upper maintenance", async () => {
  await withExerciseLibrary(async () => {
    const modifiers = buildFitnessPlanningModifiers({
      specialistContext: {
        profile: {
          ...baseProfile,
          coachIntake: {
            trainingArchetype: "female_beginner_balanced_lower_body_bias",
            maintenanceMuscleGroups: ["shoulders", "back"],
            avoidSpecialization: ["upper_body_width"]
          }
        }
      },
      knowledgeItems: [
        { id: "fit_kb_025_female_beginner_lower_body_bias" },
        { id: "fit_kb_026_upper_body_maintenance" }
      ]
    });
    const assignments = await choosePlanExercises(baseProfile, coach, modifiers);
    const selected = assignedExercises(assignments);

    assert.ok(selected.some((item) => item?.movementPattern.includes("horizontal push")));
    assert.ok(selected.some((item) => item?.movementPattern.includes("horizontal pull")));
    assert.ok(selected.some((item) => item?.mainMuscleGroup === "Shoulders"));
    assert.ok(selected.some((item) => item?.subMuscleGroup === "Glutes"));
  });
});

test("knee pain keeps lower-body training through safer alternatives", async () => {
  await withExerciseLibrary(async () => {
    const profile = {
      ...baseProfile,
      injuries: ["knee pain"],
      limitations: ["lunges cause discomfort"]
    };
    const modifiers = buildFitnessPlanningModifiers({
      specialistContext: {
        profile
      },
      knowledgeItems: [{ id: "fit_kb_020_lower_risk_substitutions", topic: "knee pain" }]
    });
    const assignments = await choosePlanExercises(profile, coach, modifiers);
    const selected = assignedExercises(assignments);
    const selectedNames = selected.map((item) => item?.name).join(" ");

    assert.ok(selected.some((item) => item?.mainMuscleGroup === "Legs"));
    assert.ok(
      selected.some((item) =>
        ["Barbell Hip Thrust", "Hamstring Curl Machine", "Box Squat to Bench", "Supported Step Up"].includes(
          item?.name
        )
      )
    );
    assert.doesNotMatch(selectedNames, /Forward Lunge/);
  });
});

test("low adherence simplifies without creating an incomplete plan", async () => {
  await withExerciseLibrary(async () => {
    const modifiers = buildFitnessPlanningModifiers({
      specialistContext: {
        profile: baseProfile
      },
      knowledgeItems: [{ id: "fit_kb_030_adherence_simplify" }]
    });
    const standardAssignments = await choosePlanExercises(baseProfile, coach, emptyFitnessPlanningModifiers());
    const simplifiedAssignments = await choosePlanExercises(baseProfile, coach, modifiers);
    const dayCounts = countByDay(simplifiedAssignments);

    assert.equal(adjustedTargetExerciseCount("beginner", 3, modifiers), 4);
    assert.ok(simplifiedAssignments.length < standardAssignments.length);
    assert.equal(Object.keys(dayCounts).length, 3);
    assert.equal(Object.values(dayCounts).every((count) => count >= 3), true);
  });
});

test("no-op modifiers preserve current deterministic planning", async () => {
  await withExerciseLibrary(async () => {
    const withoutModifiers = await choosePlanExercises(baseProfile, coach);
    const withEmptyModifiers = await choosePlanExercises(
      baseProfile,
      coach,
      emptyFitnessPlanningModifiers()
    );

    assert.deepEqual(withEmptyModifiers, withoutModifiers);
  });
});

test("plan quality note stays compact", () => {
  const note = buildPlanQualityNote({
    passed: false,
    qualityScore: 68,
    compactNotes: ["safety", "balance", "volume"],
    warnings: [
      {
        code: "safety.explicit_painful_lunge",
        message: "Long internal warning that should not be copied into notes."
      }
    ]
  });

  assert.equal(note, "Plan quality: review 68 (safety, balance).");
  assert.doesNotMatch(note, /Long internal warning/);
});
