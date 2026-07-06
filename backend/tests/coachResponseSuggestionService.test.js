const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCoachResponseSuggestions } = require("../services/coachResponseSuggestionService");

const backSquat = { exerciseId: 1, name: "Back Squat", movementPattern: "squat/lunge", mainMuscleGroup: "Legs", subMuscleGroup: "Quads", equipment: "barbell", level: "intermediate" };
const hipThrust = { exerciseId: 2, name: "Dumbbell Hip Thrust", movementPattern: "hinge/posterior chain", mainMuscleGroup: "Legs", subMuscleGroup: "Glutes", equipment: "dumbbell", level: "beginner" };
const legExtension = { exerciseId: 3, name: "Leg Extension", movementPattern: "isolation", mainMuscleGroup: "Legs", subMuscleGroup: "Quads", equipment: "machine", level: "beginner" };
const chestPress = { exerciseId: 4, name: "Machine Chest Press", movementPattern: "horizontal push", mainMuscleGroup: "Chest", subMuscleGroup: "Mid Chest", equipment: "machine", level: "beginner" };
const barbellRow = { exerciseId: 5, name: "Barbell Row", movementPattern: "horizontal pull", mainMuscleGroup: "Back", subMuscleGroup: "Mid Back", equipment: "barbell", level: "intermediate" };
const LIBRARY = [backSquat, hipThrust, legExtension, chestPress, barbellRow];

function makeModels({ profile, session = { workoutPlanId: 5, selectedDayLabel: "Day 1 - Lower Body" }, dayExercises = [backSquat], library = LIBRARY, throwProfile = false } = {}) {
  return {
    traineeProfileModel: {
      async findOne() {
        if (throwProfile) throw new Error("db down");
        return profile;
      }
    },
    workoutSessionModel: { async findByPk() { return session; } },
    workoutPlanExerciseModel: { async findAll() { return dayExercises.map((ex) => ({ Exercise: ex })); } },
    exerciseModel: { async findAll() { return library; } }
  };
}

const issue = (message) => ({ issueId: 1, userId: 7, workoutSessionId: 10, workoutPlanId: 5, message });

function assertCitationShape(citations) {
  assert.ok(Array.isArray(citations) && citations.length > 0);
  for (const citation of citations) {
    assert.ok(citation.id);
    assert.ok("sourceLabel" in citation);
    assert.ok("evidenceLevel" in citation);
    assert.ok(!("rationale" in citation)); // rationale is admin-only, carried on adminRationale
  }
}

test("pain on a knee-dominant lift returns a safe, allowed, stable substitute", async () => {
  const models = makeModels({
    profile: { equipmentAccess: ["dumbbell", "machine", "bodyweight"], injuries: [], limitations: [], level: "intermediate", likedExercises: [], dislikedExercises: [] }
  });

  const [top] = await buildCoachResponseSuggestions(
    { issue: issue("my knee hurts on squats"), signals: ["pain_signal"] },
    models
  );

  assert.equal(top.responseType, "safety_substitution");
  assert.equal(top.exercise.name, "Dumbbell Hip Thrust"); // quad-dominant Leg Extension excluded by knee, barbell excluded by equipment
  assert.match(top.traineeMessage, /Stop Back Squat\. Safer option: Dumbbell Hip Thrust\./);
  assert.ok(top.adminRationale.length > 0);
  assertCitationShape(top.citations);
});

test("equipment unavailable returns an intent-preserving substitute on available equipment", async () => {
  const models = makeModels({
    profile: { equipmentAccess: ["barbell", "dumbbell", "machine"], injuries: [], limitations: [], level: "intermediate", likedExercises: [], dislikedExercises: [] }
  });

  const [top] = await buildCoachResponseSuggestions(
    { issue: issue("the squat rack is taken"), signals: ["equipment_unavailable"] },
    models
  );

  assert.equal(top.responseType, "equipment_substitution");
  assert.equal(top.exercise.name, "Leg Extension"); // same muscle (legs/quads), machine, barbell dropped
  assert.match(top.traineeMessage, /same movement, available equipment/);
  assertCitationShape(top.citations);
});

test("too_hard produces a bounded load adjustment with no exercise swap", async () => {
  const models = makeModels({
    profile: { equipmentAccess: ["dumbbell"], injuries: [], limitations: [], level: "beginner", likedExercises: [], dislikedExercises: [] }
  });

  const [top] = await buildCoachResponseSuggestions(
    { issue: issue("the weight was too heavy"), signals: ["too_hard"] },
    models
  );

  assert.equal(top.responseType, "reduce_load");
  assert.equal(top.exercise, null);
  assert.match(top.traineeMessage, /Reduce .* about 10%/);
  assertCitationShape(top.citations);
});

test("multiple signals are ranked safety-first (pain before too_easy)", async () => {
  const models = makeModels({
    profile: { equipmentAccess: ["dumbbell", "machine", "bodyweight"], injuries: [], limitations: [], level: "intermediate", likedExercises: [], dislikedExercises: [] }
  });

  const suggestions = await buildCoachResponseSuggestions(
    { issue: issue("my knee hurts and it also felt easy"), signals: ["too_easy", "pain_signal"] },
    models
  );

  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].responseType, "safety_substitution");
});

test("no recognized signals returns nothing", async () => {
  const suggestions = await buildCoachResponseSuggestions(
    { issue: issue("all good"), signals: [] },
    makeModels({ profile: {} })
  );
  assert.deepEqual(suggestions, []);
});

test("model failure is swallowed (returns []), never disrupts the issue flow", async () => {
  const suggestions = await buildCoachResponseSuggestions(
    { issue: issue("my knee hurts on squats"), signals: ["pain_signal"] },
    makeModels({ profile: {}, throwProfile: true })
  );
  assert.deepEqual(suggestions, []);
});
