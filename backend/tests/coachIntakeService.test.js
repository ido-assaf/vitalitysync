const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeCoachIntake,
  summarizeCoachIntake
} = require("../services/coachIntakeService");

const baseBody = {
  goal: "build muscle",
  level: "beginner",
  biologicalSex: "female",
  trainingDaysPerWeek: 3,
  preferredStyle: "balanced",
  equipmentAccess: ["gym"],
  injuries: [],
  limitations: [],
  specialtyPreferences: {},
  freeTextNotes: ""
};

test("female beginner default uses balanced lower-body bias without removing upper body", () => {
  const intake = normalizeCoachIntake({
    ...baseBody,
    coachIntake: {
      desiredOutcome: "I want to get fit, build muscle, and feel more confident.",
      concerns: "I am new to the gym and do not know technique yet."
    }
  });

  assert.equal(intake.trainingArchetype, "female_beginner_balanced_lower_body_bias");
  assert.deepEqual(intake.priorityMuscleGroups, ["glutes", "hamstrings", "quads", "core"]);
  assert.deepEqual(intake.maintenanceMuscleGroups, ["shoulders", "back", "chest"]);
  assert.equal(intake.coachingTone, "supportive_beginner");
});

test("explicit upper-body width concern changes specialization instead of deleting balance work", () => {
  const intake = normalizeCoachIntake({
    ...baseBody,
    coachIntake: {
      desiredOutcome: "I want lower body and glute focus.",
      concerns: "I do not want broad shoulders or a wide back."
    }
  });

  assert.ok(intake.priorityMuscleGroups.includes("glutes"));
  assert.ok(intake.avoidSpecialization.includes("upper_body_width"));
  assert.ok(intake.maintenanceMuscleGroups.includes("shoulders"));
  assert.ok(intake.maintenanceMuscleGroups.includes("back"));
});

test("advanced female bodybuilding goal overrides beginner aesthetic defaults", () => {
  const intake = normalizeCoachIntake({
    ...baseBody,
    level: "advanced",
    coachIntake: {
      desiredOutcome: "I am training for bodybuilding and want upper body development."
    }
  });

  assert.equal(intake.trainingArchetype, "advanced_bodybuilding_split");
  assert.ok(intake.priorityMuscleGroups.includes("upper_body"));
});

test("injuries, limitations, and weekly availability become compact constraints", () => {
  const intake = normalizeCoachIntake({
    ...baseBody,
    injuries: ["knee pain"],
    limitations: ["avoid jumping"],
    trainingDaysPerWeek: 2
  });

  assert.ok(intake.constraints.includes("injury:knee pain"));
  assert.ok(intake.constraints.includes("limitation:avoid jumping"));
  assert.ok(intake.constraints.includes("2_days_per_week"));
});

test("summaries stay compact for prompt-safe context", () => {
  const intake = normalizeCoachIntake({
    ...baseBody,
    coachIntake: {
      desiredOutcome: "glutes and legs",
      concerns: "avoid wide back"
    }
  });
  const summary = summarizeCoachIntake(intake);

  assert.equal(summary.trainingArchetype, intake.trainingArchetype);
  assert.ok(summary.priorityMuscleGroups.length <= 6);
  assert.equal(summary.desiredOutcome, undefined);
});
