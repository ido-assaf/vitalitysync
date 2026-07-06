const test = require("node:test");
const assert = require("node:assert/strict");
const { AiSpecialist, TraineeProfile } = require("../models");
const workoutPlansController = require("../controllers/workoutPlansController");
const {
  SPECIALIST_CAPABILITIES,
  availabilityForSpecialist,
  availableFitnessCoachWhere,
  availableNutritionistWhere,
  capabilityForSpecialist,
  decorateSpecialist
} = require("../utils/aiSpecialistAvailability");
const traineeProfilesController = require("../controllers/traineeProfilesController");
const nutritionController = require("../controllers/nutritionController");

const fitnessCoach = {
  specialistId: 1,
  name: "Strength Training AI Coach",
  domain: "training",
  specialty: "strength training",
  isActive: true
};

const nutritionist = {
  specialistId: 3,
  name: "VitalitySync Nutritionist",
  domain: "nutrition",
  specialty: "sports nutrition",
  isActive: true
};

const futureSpecialist = {
  specialistId: 2,
  name: "Running AI Coach",
  domain: "training",
  specialty: "running",
  isActive: true
};

const baseProfileBody = {
  userId: 3,
  goal: "strength",
  level: "beginner",
  age: 30,
  weight: 82,
  height: 180,
  biologicalSex: "male",
  trainingDaysPerWeek: 3,
  preferredStyle: "balanced strength and conditioning",
  equipmentAccess: ["gym"],
  injuries: [],
  limitations: [],
  likedExercises: [],
  dislikedExercises: [],
  specialtyPreferences: {},
  freeTextNotes: ""
};

test("classifies available Fitness Coach, Nutritionist, and future specialists", () => {
  assert.deepEqual(availabilityForSpecialist(fitnessCoach), {
    availabilityStatus: "available",
    availabilityLabel: "Available Fitness Coach",
    availabilityDescription: "Selectable for workout planning.",
    productRole: "fitness_coach",
    isWorkoutAssignable: true,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "strength_training",
    knowledgeTags: ["strength", "hypertrophy", "progressive_overload", "recovery"]
  });

  assert.equal(availabilityForSpecialist(nutritionist).isNutritionAvailable, true);
  assert.equal(availabilityForSpecialist(nutritionist).isWorkoutAssignable, false);
  assert.equal(availabilityForSpecialist(futureSpecialist).availabilityStatus, "coming_soon");
  assert.equal(availabilityForSpecialist(futureSpecialist).isWorkoutAssignable, false);
});

test("registry represents future specialist roles without enabling them", () => {
  const roles = SPECIALIST_CAPABILITIES.map((capability) => capability.productRole);
  const football = capabilityForSpecialist({
    domain: "training",
    specialty: "football",
    isActive: true
  });
  const basketballAvailability = availabilityForSpecialist({
    domain: "training",
    specialty: "basketball",
    isActive: true
  });

  assert.ok(roles.includes("football_coach"));
  assert.ok(roles.includes("basketball_coach"));
  assert.ok(roles.includes("running_coach"));
  assert.equal(football.ruleSetId, "football_performance");
  assert.equal(football.plannerType, "workout_plan");
  assert.deepEqual(football.knowledgeTags.slice(0, 2), ["speed", "agility"]);
  assert.equal(basketballAvailability.availabilityStatus, "coming_soon");
  assert.equal(basketballAvailability.productRole, "basketball_coach");
  assert.equal(basketballAvailability.isWorkoutAssignable, false);
});

test("decorates specialist API payloads with additive availability fields", () => {
  const decorated = decorateSpecialist({
    toJSON: () => fitnessCoach
  });

  assert.equal(decorated.name, fitnessCoach.name);
  assert.equal(decorated.availabilityLabel, "Available Fitness Coach");
  assert.equal(decorated.isWorkoutAssignable, true);
});

test("suggested workout notes include compact recent training context", () => {
  const notes = workoutPlansController._internals.buildSuggestedNotes(
    {
      ...baseProfileBody,
      specialtyPreferences: {
        coachIntake: {
          trainingArchetype: "female_beginner_balanced_lower_body_bias",
          priorityMuscleGroups: ["glutes", "hamstrings", "quads"],
          maintenanceMuscleGroups: ["shoulders", "back"],
          avoidSpecialization: ["upper_body_width"]
        }
      }
    },
    fitnessCoach,
    {
      sessions: {
        recentCount: 4,
        completedCount: 3,
        averageSetCompletionPercent: 82
      },
      setLogs: {
        recentCount: 12,
        distinctExercises: 5
      },
      issues: {
        recentCount: 1,
        issueThemes: ["knee discomfort on lunges"]
      }
    },
    {
      warnings: ["Recent workout adherence is low."],
      recommendedAdjustments: ["Keep the plan simple."],
      hardStops: [],
      explanationHints: []
    },
    [
      {
        id: "fit_kb_030_adherence_simplify",
        topic: "adherence simplification",
        principle: "Low adherence calls for a simpler plan before adding volume.",
        coachingUse: "Reduce optional accessories.",
        confidence: "medium",
        sourceLabel: "Coach intake product rule + general resistance training evidence"
      }
    ]
  );

  assert.match(notes, /Recent training context/);
  assert.match(notes, /3\/4 recent sessions completed/);
  assert.match(notes, /knee discomfort on lunges/);
  assert.match(notes, /Expert rules/);
  assert.match(notes, /Keep the plan simple/);
  assert.match(notes, /Coach intake/);
  assert.match(notes, /female_beginner_balanced_lower_body_bias/);
  assert.match(notes, /Professional knowledge/);
  assert.match(notes, /fit_kb_030_adherence_simplify \(adherence simplification\)/);
  assert.doesNotMatch(notes, /Low adherence calls for a simpler plan/);
});

test("canonical workout and nutrition fallback queries only target implemented roles", () => {
  assert.deepEqual(availableFitnessCoachWhere({ specialistId: 1 }), {
    specialistId: 1,
    domain: "training",
    specialty: "strength training",
    isActive: true
  });
  assert.deepEqual(availableNutritionistWhere(), {
    domain: "nutrition",
    specialty: "sports nutrition",
    isActive: true
  });
});

test("trainee profile payload accepts only the available Fitness Coach", async () => {
  const originalFindByPk = AiSpecialist.findByPk;

  try {
    AiSpecialist.findByPk = async () => fitnessCoach;
    const accepted = await traineeProfilesController._internals.buildProfilePayload({
      ...baseProfileBody,
      aiSpecialistId: fitnessCoach.specialistId
    });

    assert.equal(accepted.validationDetails, undefined);
    assert.equal(accepted.payload.aiSpecialistId, fitnessCoach.specialistId);
    assert.equal(
      accepted.payload.specialtyPreferences.coachIntake.trainingArchetype,
      "strength_focused_beginner"
    );

    AiSpecialist.findByPk = async () => nutritionist;
    const rejectedNutrition = await traineeProfilesController._internals.buildProfilePayload({
      ...baseProfileBody,
      aiSpecialistId: nutritionist.specialistId
    });

    assert.match(rejectedNutrition.validationDetails.aiSpecialistId, /Fitness Coach/);

    AiSpecialist.findByPk = async () => futureSpecialist;
    const rejectedFuture = await traineeProfilesController._internals.buildProfilePayload({
      ...baseProfileBody,
      aiSpecialistId: futureSpecialist.specialistId
    });

    assert.match(rejectedFuture.validationDetails.aiSpecialistId, /Fitness Coach/);
  } finally {
    AiSpecialist.findByPk = originalFindByPk;
  }
});

test("trainee profile payload preserves an existing assignment when aiSpecialistId is omitted", async () => {
  const originalFindByPk = AiSpecialist.findByPk;

  try {
    AiSpecialist.findByPk = async () => {
      throw new Error("findByPk should not be called when aiSpecialistId is omitted");
    };

    const result = await traineeProfilesController._internals.buildProfilePayload(
      baseProfileBody,
      { aiSpecialistId: fitnessCoach.specialistId }
    );

    assert.equal(result.payload.aiSpecialistId, fitnessCoach.specialistId);
  } finally {
    AiSpecialist.findByPk = originalFindByPk;
  }
});

test("trainee profile validation requires complete metric body context", () => {
  const validation = traineeProfilesController._internals.validateProfileBody({
    ...baseProfileBody,
    age: null,
    weight: "",
    height: undefined
  });

  assert.match(validation.age, /required/);
  assert.match(validation.weight, /required/);
  assert.match(validation.height, /required/);
});

test("trainee profile validation rejects obvious junk profile context", () => {
  const validation = traineeProfilesController._internals.validateProfileBody({
    ...baseProfileBody,
    equipmentAccess: ["please go stack overflow"]
  });

  assert.match(validation.equipmentAccess, /fitness-related text/);
});

test("workout plan suggestion readiness requires age, weight, and height", () => {
  const validation = workoutPlansController._internals.validateProfileReadyForPlan({
    ...baseProfileBody,
    age: 30,
    weight: null,
    height: 180
  });

  assert.match(validation.weight, /required/);
});

test("nutrition specialist resolution ignores future nutrition specialists and uses the available Nutritionist", async () => {
  const originalProfileFindOne = TraineeProfile.findOne;
  const originalSpecialistFindOne = AiSpecialist.findOne;
  const futureNutrition = {
    specialistId: 4,
    domain: "nutrition",
    specialty: "diabetic nutrition",
    isActive: true
  };
  const calls = [];

  try {
    TraineeProfile.findOne = async () => ({ AiSpecialist: futureNutrition });
    AiSpecialist.findOne = async (query) => {
      calls.push(query);
      return nutritionist;
    };

    const resolved = await nutritionController._internals.resolveNutritionSpecialist(3);

    assert.equal(resolved, nutritionist);
    assert.deepEqual(calls[0].where, availableNutritionistWhere());
  } finally {
    TraineeProfile.findOne = originalProfileFindOne;
    AiSpecialist.findOne = originalSpecialistFindOne;
  }
});
