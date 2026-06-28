const test = require("node:test");
const assert = require("node:assert/strict");
const { AiSpecialist, TraineeProfile } = require("../models");
const {
  availabilityForSpecialist,
  availableFitnessCoachWhere,
  availableNutritionistWhere,
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
    isNutritionAvailable: false
  });

  assert.equal(availabilityForSpecialist(nutritionist).isNutritionAvailable, true);
  assert.equal(availabilityForSpecialist(nutritionist).isWorkoutAssignable, false);
  assert.equal(availabilityForSpecialist(futureSpecialist).availabilityStatus, "coming_soon");
  assert.equal(availabilityForSpecialist(futureSpecialist).isWorkoutAssignable, false);
});

test("decorates specialist API payloads with additive availability fields", () => {
  const decorated = decorateSpecialist({
    toJSON: () => fitnessCoach
  });

  assert.equal(decorated.name, fitnessCoach.name);
  assert.equal(decorated.availabilityLabel, "Available Fitness Coach");
  assert.equal(decorated.isWorkoutAssignable, true);
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
