const { Op } = require("sequelize");
const {
  AiSpecialist,
  Exercise,
  TraineeProfile,
  WorkoutPlan,
  WorkoutPlanExercise
} = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");
const createCrudController = require("../utils/resourceControllerFactory");

const SUGGESTED_PLAN_PREFIX = "[ONBOARDING_SUGGESTED_PLAN]";

function validateWorkoutPlanBody(body) {
  const details = {};

  if (!Number.isInteger(body.userId) || body.userId <= 0) {
    details.userId = "userId is required and must be a positive number.";
  }

  if (typeof body.goal !== "string" || body.goal.trim() === "") {
    details.goal = "goal is required and must be a non-empty string.";
  }

  if (typeof body.level !== "string" || body.level.trim() === "") {
    details.level = "level is required and must be a non-empty string.";
  }

  if (!Number.isInteger(body.daysPerWeek) || body.daysPerWeek < 1 || body.daysPerWeek > 7) {
    details.daysPerWeek = "daysPerWeek is required and must be a number between 1 and 7.";
  }

  if (!Number.isInteger(body.durationMinutes) || body.durationMinutes <= 0) {
    details.durationMinutes = "durationMinutes is required and must be a positive number.";
  }

  if (typeof body.notes !== "string" || body.notes.trim() === "") {
    details.notes = "notes is required and must be a non-empty string.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildWorkoutPlanPayload(body) {
  return {
    userId: body.userId,
    goal: body.goal.trim(),
    level: body.level.trim(),
    daysPerWeek: body.daysPerWeek,
    durationMinutes: body.durationMinutes,
    notes: body.notes.trim()
  };
}

const controller = createCrudController({
  Model: WorkoutPlan,
  idField: "planId",
  resourceLabel: "Workout plan",
  validateBody: validateWorkoutPlanBody,
  buildCreatePayload: buildWorkoutPlanPayload,
  buildUpdatePayload: buildWorkoutPlanPayload
});

const workoutPlanInclude = [
  {
    model: WorkoutPlanExercise,
    include: [{ model: Exercise }]
  }
];

function formatWorkoutPlan(plan) {
  const data = plan && typeof plan.toJSON === "function" ? plan.toJSON() : plan;
  const sortedAssignments = Array.isArray(data.WorkoutPlanExercises)
    ? [...data.WorkoutPlanExercises].sort((left, right) => {
        const dayCompare = String(left.dayLabel).localeCompare(String(right.dayLabel));
        return dayCompare || Number(left.orderIndex) - Number(right.orderIndex);
      })
    : [];
  const assignments = sortedAssignments.map((assignment) => {
    const dayMatch = String(assignment.dayLabel || "").match(/\d+/);
    const exercise = assignment.Exercise || null;

    const rationale = buildAssignmentRationale(exercise, assignment);

    return {
      workoutPlanExerciseId: assignment.workoutPlanExerciseId,
      workoutPlanId: assignment.workoutPlanId,
      exerciseId: assignment.exerciseId,
      dayLabel: assignment.dayLabel,
      dayNumber: dayMatch ? Number(dayMatch[0]) : null,
      orderIndex: assignment.orderIndex,
      targetSets: assignment.targetSets,
      targetReps: assignment.targetReps,
      rationale,
      exercise: exercise ? { ...exercise, rationale } : null
    };
  });

  return {
    ...data,
    assignments,
    exercises: assignments
      .filter((assignment) => assignment.exercise)
      .map((assignment) => ({
        ...assignment.exercise,
        dayLabel: assignment.dayLabel,
        dayNumber: assignment.dayNumber,
        orderIndex: assignment.orderIndex,
        targetSets: assignment.targetSets,
        targetReps: assignment.targetReps,
        workoutPlanExerciseId: assignment.workoutPlanExerciseId,
        rationale: assignment.rationale
      }))
  };
}

const getWorkoutPlans = asyncHandler(async (req, res) => {
  const plans = await WorkoutPlan.findAll({
    include: workoutPlanInclude,
    order: [["planId", "ASC"]]
  });

  return res.status(200).json(successResponse(plans.map(formatWorkoutPlan)));
});

const getWorkoutPlanById = asyncHandler(async (req, res) => {
  const plan = await WorkoutPlan.findByPk(Number(req.params.id), {
    include: workoutPlanInclude
  });

  if (!plan) {
    return res.status(404).json(
      errorResponse("NOT_FOUND", "Workout plan was not found.", {
        planId: req.params.id
      })
    );
  }

  return res.status(200).json(successResponse(formatWorkoutPlan(plan)));
});

function durationForProfile(profile) {
  if (profile.preferredStyle === "short sessions") {
    return 35;
  }

  if (profile.level === "advanced") {
    return 75;
  }

  if (profile.level === "intermediate") {
    return 60;
  }

  return 45;
}

function listOrNone(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "none";
}

function buildSuggestedNotes(profile, aiCoach) {
  const specialty = aiCoach?.specialty || "general fitness";
  const guidance = Array.isArray(aiCoach?.rules) ? aiCoach.rules.join("; ") : "";

  return [
    SUGGESTED_PLAN_PREFIX,
    `AI coach specialty: ${specialty}.`,
    guidance ? `AI coach guidance: ${guidance}.` : "",
    `Preferred style: ${profile.preferredStyle}.`,
    `Equipment: ${listOrNone(profile.equipmentAccess)}.`,
    `Injuries: ${listOrNone(profile.injuries)}.`,
    `Limitations: ${listOrNone(profile.limitations)}.`,
    `Liked exercises: ${listOrNone(profile.likedExercises)}.`,
    `Disliked exercises: ${listOrNone(profile.dislikedExercises)}.`,
    profile.freeTextNotes ? `Notes: ${profile.freeTextNotes}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : [];
}

function levelRank(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "advanced" || normalized === "expert") {
    return 3;
  }

  if (normalized === "intermediate") {
    return 2;
  }

  return 1;
}

function equipmentMatches(exerciseEquipment, requestedEquipment) {
  const normalizedExerciseEquipment = String(exerciseEquipment || "").toLowerCase();
  const normalizedRequest = String(requestedEquipment || "")
    .toLowerCase()
    .replace(/dumbbells/g, "dumbbell")
    .replace(/barbells/g, "barbell")
    .replace(/cables/g, "cable")
    .replace(/machines/g, "machine");

  return (
    normalizedExerciseEquipment.includes(normalizedRequest) ||
    normalizedRequest.includes(normalizedExerciseEquipment)
  );
}

function isExerciseAllowed(exercise, profile, options = {}) {
  const equipment = normalizeList(profile.equipmentAccess);
  const disliked = normalizeList(profile.dislikedExercises);
  const limits = [...normalizeList(profile.injuries), ...normalizeList(profile.limitations)];
  const exerciseName = String(exercise.name || "").toLowerCase();
  const exerciseEquipment = String(exercise.equipment || "").toLowerCase();
  const mainMuscle = String(exercise.mainMuscleGroup || exercise.muscleGroup || "").toLowerCase();
  const subMuscle = String(exercise.subMuscleGroup || "").toLowerCase();
  const pattern = String(exercise.movementPattern || "").toLowerCase();

  if (
    !options.ignoreEquipment &&
    equipment.length > 0 &&
    !equipment.some((item) => equipmentMatches(exerciseEquipment, item))
  ) {
    const bodyweightAllowed = equipment.some((item) => item.includes("body") || item.includes("home"));
    if (!(bodyweightAllowed && exerciseEquipment.includes("body"))) {
      return false;
    }
  }

  if (levelRank(exercise.level || exercise.difficulty) > levelRank(profile.level)) {
    return false;
  }

  if (disliked.some((item) => exerciseName.includes(item) || item.includes(exerciseName))) {
    return false;
  }

  if (
    limits.some((item) => item.includes("shoulder")) &&
    (mainMuscle === "shoulders" || pattern.includes("vertical push"))
  ) {
    return false;
  }

  if (
    limits.some((item) => item.includes("knee")) &&
    (subMuscle === "quads" || pattern.includes("jump") || pattern.includes("conditioning"))
  ) {
    return false;
  }

  if (
    limits.some((item) => item.includes("back")) &&
    (subMuscle === "lower back" || exerciseName.includes("deadlift") || exerciseName.includes("good morning"))
  ) {
    return false;
  }

  return true;
}

function normalizedTags(exercise) {
  return Array.isArray(exercise.goalTags)
    ? exercise.goalTags.join(" ").toLowerCase()
    : String(exercise.goalTags || "").toLowerCase();
}

function movementMatches(exercise, patterns) {
  const movementPattern = String(exercise.movementPattern || "").toLowerCase();
  return patterns.some((pattern) => movementPattern.includes(String(pattern).toLowerCase()));
}

function mainMuscleMatches(exercise, mainMuscles) {
  const mainMuscle = String(exercise.mainMuscleGroup || exercise.muscleGroup || "").toLowerCase();
  return mainMuscles.some((muscle) => mainMuscle === String(muscle).toLowerCase());
}

function subMuscleMatches(exercise, subMuscles) {
  const subMuscle = String(exercise.subMuscleGroup || "").toLowerCase();
  return subMuscles.some((muscle) => subMuscle === String(muscle).toLowerCase());
}

function goalType(profile, coach) {
  const goal = String(profile.goal || "").toLowerCase();
  const specialty = String(coach?.coachSpecialty || "").toLowerCase();

  if (goal.includes("strength") || goal.includes("power")) {
    return "strength";
  }

  if (goal.includes("muscle") || goal.includes("hypertrophy") || goal.includes("gain")) {
    return "hypertrophy";
  }

  if (goal.includes("weight") || goal.includes("fat") || specialty === "weight loss") {
    return "weightLoss";
  }

  if (["football", "running", "basketball"].includes(specialty)) {
    return "sport";
  }

  return "general";
}

function targetExerciseCount(level, days) {
  const rank = levelRank(level);

  if (rank >= 3) {
    return 6;
  }

  if (rank === 2) {
    return 5;
  }

  return days <= 3 ? 5 : 4;
}

function createSlot({
  key,
  role = "accessory",
  patterns = [],
  mainMuscles = [],
  subMuscles = [],
  rationale,
  allowMainMuscleRepeat = false
}) {
  return {
    key,
    role,
    patterns,
    mainMuscles,
    subMuscles,
    rationale,
    allowMainMuscleRepeat
  };
}

const SLOTS = {
  horizontalPush: createSlot({
    key: "horizontalPush",
    role: "main",
    patterns: ["horizontal push"],
    mainMuscles: ["Chest"],
    subMuscles: ["Upper Chest", "Mid Chest", "Lower Chest"],
    rationale: "Main push movement for upper-body strength."
  }),
  verticalPush: createSlot({
    key: "verticalPush",
    role: "secondary",
    patterns: ["vertical push", "horizontal push"],
    mainMuscles: ["Shoulders"],
    subMuscles: ["Front Delts", "Side Delts"],
    rationale: "Shoulder press pattern to build balanced upper-body power."
  }),
  horizontalPull: createSlot({
    key: "horizontalPull",
    role: "main",
    patterns: ["horizontal pull"],
    mainMuscles: ["Back"],
    subMuscles: ["Mid Back", "Upper Back", "Lats"],
    rationale: "Pull movement to balance pressing volume and build back strength."
  }),
  verticalPull: createSlot({
    key: "verticalPull",
    role: "main",
    patterns: ["vertical pull"],
    mainMuscles: ["Back"],
    subMuscles: ["Lats", "Upper Back"],
    rationale: "Targets lats and supports a stronger upper-body pull."
  }),
  squat: createSlot({
    key: "squat",
    role: "main",
    patterns: ["squat/lunge"],
    mainMuscles: ["Legs"],
    subMuscles: ["Quads", "Glutes"],
    rationale: "Quad-focused lower-body compound."
  }),
  lunge: createSlot({
    key: "lunge",
    role: "secondary",
    patterns: ["squat/lunge"],
    mainMuscles: ["Legs"],
    subMuscles: ["Glutes", "Adductors", "Quads"],
    rationale: "Single-leg accessory for lower-body balance and control.",
    allowMainMuscleRepeat: true
  }),
  hinge: createSlot({
    key: "hinge",
    role: "main",
    patterns: ["hinge/posterior chain"],
    mainMuscles: ["Legs", "Back"],
    subMuscles: ["Hamstrings", "Glutes", "Lower Back"],
    rationale: "Posterior-chain movement for hamstrings and hip strength.",
    allowMainMuscleRepeat: true
  }),
  shoulderAccessory: createSlot({
    key: "shoulderAccessory",
    role: "accessory",
    patterns: ["isolation", "vertical push"],
    mainMuscles: ["Shoulders"],
    subMuscles: ["Side Delts", "Rear Delts", "Rotator Cuff"],
    rationale: "Accessory movement for shoulder stability and balanced development."
  }),
  chestAccessory: createSlot({
    key: "chestAccessory",
    role: "accessory",
    patterns: ["horizontal push", "isolation"],
    mainMuscles: ["Chest"],
    subMuscles: ["Upper Chest", "Mid Chest", "Chest Isolation"],
    rationale: "Accessory push work to add chest volume without overloading the day."
  }),
  backAccessory: createSlot({
    key: "backAccessory",
    role: "accessory",
    patterns: ["horizontal pull", "vertical pull", "isolation"],
    mainMuscles: ["Back", "Shoulders"],
    subMuscles: ["Rear Delts", "Mid Back", "Upper Back"],
    rationale: "Accessory pull work for posture and shoulder balance."
  }),
  biceps: createSlot({
    key: "biceps",
    role: "isolation",
    patterns: ["arm isolation", "isolation"],
    mainMuscles: ["Arms"],
    subMuscles: ["Biceps", "Forearms"],
    rationale: "Isolation work to support pulling strength."
  }),
  triceps: createSlot({
    key: "triceps",
    role: "isolation",
    patterns: ["arm isolation", "isolation", "horizontal push", "vertical push"],
    mainMuscles: ["Arms"],
    subMuscles: ["Triceps"],
    rationale: "Triceps accessory work to support pressing strength."
  }),
  calves: createSlot({
    key: "calves",
    role: "isolation",
    patterns: ["calf raise", "horizontal push"],
    mainMuscles: ["Legs"],
    subMuscles: ["Calves"],
    rationale: "Lower-leg accessory work for ankle strength and durability.",
    allowMainMuscleRepeat: true
  }),
  core: createSlot({
    key: "core",
    role: "core",
    patterns: ["core flexion", "core stability", "horizontal push"],
    mainMuscles: ["Core"],
    subMuscles: ["Abs", "Obliques", "Anti-Rotation"],
    rationale: "Core exercise for trunk control."
  }),
  conditioning: createSlot({
    key: "conditioning",
    role: "finisher",
    patterns: ["conditioning/power"],
    mainMuscles: ["Legs", "Core"],
    rationale: "Conditioning-friendly finisher for athletic work capacity.",
    allowMainMuscleRepeat: true
  })
};

function dayTemplate(name, slots) {
  return { name, slots };
}

function splitTemplates(days, specialty) {
  const normalizedSpecialty = String(specialty || "").toLowerCase();
  const sportFinisher = ["football", "running", "basketball", "weight loss"].includes(normalizedSpecialty)
    ? SLOTS.conditioning
    : SLOTS.core;

  if (days <= 1) {
    return [
      dayTemplate("Full Body", [
        SLOTS.squat,
        SLOTS.horizontalPush,
        SLOTS.horizontalPull,
        SLOTS.hinge,
        SLOTS.core,
        sportFinisher
      ])
    ];
  }

  if (days === 2) {
    return [
      dayTemplate("Full Body A", [
        SLOTS.squat,
        SLOTS.horizontalPush,
        SLOTS.horizontalPull,
        SLOTS.hinge,
        SLOTS.core,
        SLOTS.biceps
      ]),
      dayTemplate("Full Body B", [
        SLOTS.hinge,
        SLOTS.verticalPull,
        SLOTS.verticalPush,
        SLOTS.lunge,
        sportFinisher,
        SLOTS.triceps
      ])
    ];
  }

  if (days === 3) {
    return [
      dayTemplate("Upper Body", [
        SLOTS.horizontalPush,
        SLOTS.horizontalPull,
        SLOTS.verticalPull,
        SLOTS.shoulderAccessory,
        SLOTS.triceps,
        SLOTS.biceps
      ]),
      dayTemplate("Lower Body", [
        SLOTS.squat,
        SLOTS.hinge,
        SLOTS.lunge,
        SLOTS.calves,
        SLOTS.core,
        sportFinisher
      ]),
      dayTemplate("Full Body", [
        SLOTS.hinge,
        SLOTS.horizontalPush,
        SLOTS.horizontalPull,
        SLOTS.squat,
        SLOTS.core,
        SLOTS.shoulderAccessory
      ])
    ];
  }

  if (days === 4) {
    return [
      dayTemplate("Upper Body Push/Pull", [
        SLOTS.horizontalPush,
        SLOTS.horizontalPull,
        SLOTS.verticalPull,
        SLOTS.verticalPush,
        SLOTS.triceps,
        SLOTS.biceps,
        SLOTS.core
      ]),
      dayTemplate("Lower Body Strength", [
        SLOTS.squat,
        SLOTS.hinge,
        SLOTS.lunge,
        SLOTS.calves,
        SLOTS.core,
        sportFinisher
      ]),
      dayTemplate("Upper Body Volume", [
        SLOTS.verticalPull,
        SLOTS.chestAccessory,
        SLOTS.backAccessory,
        SLOTS.shoulderAccessory,
        SLOTS.biceps,
        SLOTS.triceps,
        SLOTS.core
      ]),
      dayTemplate("Lower Body + Core", [
        SLOTS.hinge,
        SLOTS.squat,
        SLOTS.lunge,
        SLOTS.calves,
        SLOTS.core,
        sportFinisher
      ])
    ];
  }

  if (days === 5) {
    return [
      dayTemplate("Push", [
        SLOTS.horizontalPush,
        SLOTS.verticalPush,
        SLOTS.chestAccessory,
        SLOTS.shoulderAccessory,
        SLOTS.triceps,
        SLOTS.core
      ]),
      dayTemplate("Pull", [
        SLOTS.verticalPull,
        SLOTS.horizontalPull,
        SLOTS.backAccessory,
        SLOTS.biceps,
        SLOTS.core,
        sportFinisher
      ]),
      dayTemplate("Legs", [
        SLOTS.squat,
        SLOTS.hinge,
        SLOTS.lunge,
        SLOTS.calves,
        SLOTS.core,
        sportFinisher
      ]),
      dayTemplate("Upper", [
        SLOTS.horizontalPush,
        SLOTS.horizontalPull,
        SLOTS.verticalPull,
        SLOTS.shoulderAccessory,
        SLOTS.triceps,
        SLOTS.biceps
      ]),
      dayTemplate("Lower", [
        SLOTS.hinge,
        SLOTS.squat,
        SLOTS.lunge,
        SLOTS.calves,
        SLOTS.core,
        sportFinisher
      ])
    ];
  }

  return [
    dayTemplate("Push Strength", [
      SLOTS.horizontalPush,
      SLOTS.verticalPush,
      SLOTS.chestAccessory,
      SLOTS.triceps,
      SLOTS.shoulderAccessory,
      SLOTS.core
    ]),
    dayTemplate("Pull Strength", [
      SLOTS.verticalPull,
      SLOTS.horizontalPull,
      SLOTS.backAccessory,
      SLOTS.biceps,
      SLOTS.core,
      sportFinisher
    ]),
    dayTemplate("Legs Strength", [
      SLOTS.squat,
      SLOTS.hinge,
      SLOTS.lunge,
      SLOTS.calves,
      SLOTS.core,
      sportFinisher
    ]),
    dayTemplate("Push Volume", [
      SLOTS.chestAccessory,
      SLOTS.horizontalPush,
      SLOTS.shoulderAccessory,
      SLOTS.verticalPush,
      SLOTS.triceps,
      SLOTS.core
    ]),
    dayTemplate("Pull Volume", [
      SLOTS.horizontalPull,
      SLOTS.verticalPull,
      SLOTS.backAccessory,
      SLOTS.biceps,
      SLOTS.core,
      sportFinisher
    ]),
    dayTemplate("Legs + Core", [
      SLOTS.hinge,
      SLOTS.squat,
      SLOTS.lunge,
      SLOTS.calves,
      SLOTS.core,
      sportFinisher
    ])
  ];
}

function scoreExerciseForSlot(exercise, slot, profile, coach, options = {}) {
  const liked = normalizeList(profile.likedExercises);
  const equipment = normalizeList(profile.equipmentAccess);
  const tags = normalizedTags(exercise);
  const type = goalType(profile, coach);
  let score = 0;

  if (slot.patterns.length > 0 && movementMatches(exercise, slot.patterns)) {
    score += 35;
  }

  if (slot.mainMuscles.length > 0 && mainMuscleMatches(exercise, slot.mainMuscles)) {
    score += 20;
  }

  if (slot.subMuscles.length > 0 && subMuscleMatches(exercise, slot.subMuscles)) {
    score += 16;
  }

  if (
    equipment.length > 0 &&
    equipment.some((item) => equipmentMatches(exercise.equipment, item))
  ) {
    score += 10;
  }

  if (liked.some((item) => String(exercise.name).toLowerCase().includes(item))) {
    score += 8;
  }

  if (
    (type === "strength" && tags.includes("strength")) ||
    (type === "hypertrophy" && tags.includes("hypertrophy")) ||
    (type === "sport" && (tags.includes("power") || tags.includes("compound"))) ||
    (type === "weightLoss" && (tags.includes("conditioning") || tags.includes("compound")))
  ) {
    score += 6;
  }

  if (slot.role === "main" && tags.includes("compound")) {
    score += 5;
  }

  if (slot.role === "isolation" && String(exercise.movementPattern || "").toLowerCase().includes("isolation")) {
    score += 5;
  }

  if (levelRank(exercise.level || exercise.difficulty) === levelRank(profile.level)) {
    score += 2;
  }

  if (
    options.mode === "exact" &&
    (
      !movementMatches(exercise, slot.patterns) ||
      !mainMuscleMatches(exercise, slot.mainMuscles) ||
      (slot.subMuscles.length > 0 && !subMuscleMatches(exercise, slot.subMuscles))
    )
  ) {
    return 0;
  }

  if (options.mode === "pattern" && !movementMatches(exercise, slot.patterns)) {
    return 0;
  }

  if (options.mode === "mainMuscle" && !mainMuscleMatches(exercise, slot.mainMuscles)) {
    return 0;
  }

  if (options.mode === "any" && score === 0) {
    score = 1;
  }

  return score;
}

function respectsDayBalance(exercise, dayStats, slot, options = {}) {
  const mainMuscle = exercise.mainMuscleGroup || exercise.muscleGroup;
  const subMuscle = exercise.subMuscleGroup;

  if (
    !options.ignoreMainMuscleCap &&
    !slot.allowMainMuscleRepeat &&
    mainMuscle &&
    (dayStats.mainMuscles[mainMuscle] || 0) >= 2
  ) {
    return false;
  }

  if (
    !options.ignoreSubMuscleRepeat &&
    subMuscle &&
    (dayStats.subMuscles[subMuscle] || 0) >= 1
  ) {
    return false;
  }

  return true;
}

function selectExerciseForSlot(exercises, slot, profile, coach, usedExerciseIds, dayStats) {
  const searchModes = ["exact", "pattern", "mainMuscle", "any"];
  const balanceModes = [
    {},
    { ignoreSubMuscleRepeat: true },
    { ignoreSubMuscleRepeat: true, ignoreMainMuscleCap: true }
  ];
  const equipmentModes = [false, true];

  for (const ignoreEquipment of equipmentModes) {
    for (const balanceOptions of balanceModes) {
      for (const mode of searchModes) {
        const candidates = exercises
          .filter((exercise) => !usedExerciseIds.has(exercise.exerciseId))
          .filter((exercise) => isExerciseAllowed(exercise, profile, { ignoreEquipment }))
          .filter((exercise) => respectsDayBalance(exercise, dayStats, slot, balanceOptions))
          .map((exercise) => ({
            exercise,
            score: scoreExerciseForSlot(exercise, slot, profile, coach, { mode })
          }))
          .filter((item) => item.score > 0)
          .sort((left, right) => right.score - left.score || left.exercise.name.localeCompare(right.exercise.name));

        if (candidates[0]) {
          return candidates[0].exercise;
        }
      }
    }
  }

  return null;
}

function updateDayStats(dayStats, exercise) {
  const mainMuscle = exercise.mainMuscleGroup || exercise.muscleGroup;
  const subMuscle = exercise.subMuscleGroup;

  if (mainMuscle) {
    dayStats.mainMuscles[mainMuscle] = (dayStats.mainMuscles[mainMuscle] || 0) + 1;
  }

  if (subMuscle) {
    dayStats.subMuscles[subMuscle] = (dayStats.subMuscles[subMuscle] || 0) + 1;
  }
}

function prescriptionForSlot(profile, coach, slot) {
  const type = goalType(profile, coach);

  if (type === "strength") {
    return slot.role === "main"
      ? { targetSets: 4, targetReps: "4-6" }
      : { targetSets: 3, targetReps: slot.role === "isolation" || slot.role === "core" ? "10-15" : "8-12" };
  }

  if (type === "hypertrophy") {
    if (slot.role === "main") {
      return { targetSets: 4, targetReps: "8-12" };
    }

    if (slot.role === "isolation" || slot.role === "core") {
      return { targetSets: 3, targetReps: "12-15" };
    }

    return { targetSets: 3, targetReps: "10-12" };
  }

  if (type === "weightLoss" || type === "general") {
    return { targetSets: slot.role === "finisher" ? 2 : 3, targetReps: "10-15" };
  }

  if (slot.role === "main") {
    return { targetSets: 3, targetReps: "6-10" };
  }

  return { targetSets: 3, targetReps: slot.role === "core" ? "10-15" : "8-12" };
}

function buildAssignmentRationale(exercise, assignment = {}) {
  const pattern = String(exercise?.movementPattern || "").toLowerCase();
  const mainMuscle = exercise?.mainMuscleGroup || exercise?.muscleGroup;
  const subMuscle = exercise?.subMuscleGroup;
  const normalizedSubMuscle = String(subMuscle || "").toLowerCase();

  if (assignment.rationale) {
    return assignment.rationale;
  }

  if (
    mainMuscle === "Core" ||
    normalizedSubMuscle.includes("abs") ||
    normalizedSubMuscle.includes("oblique") ||
    normalizedSubMuscle.includes("anti-rotation")
  ) {
    return "Core exercise for trunk control.";
  }

  if (normalizedSubMuscle.includes("calves")) {
    return "Lower-leg accessory work for ankle strength and durability.";
  }

  if (normalizedSubMuscle.includes("triceps")) {
    return "Triceps accessory work to support pressing strength.";
  }

  if (normalizedSubMuscle.includes("biceps") || normalizedSubMuscle.includes("forearms")) {
    return "Isolation work to support pulling strength.";
  }

  if (mainMuscle === "Shoulders" || normalizedSubMuscle.includes("delt")) {
    return "Accessory movement for shoulder stability and balanced development.";
  }

  if (
    (pattern.includes("horizontal push") || pattern.includes("vertical push")) &&
    (mainMuscle === "Chest" || mainMuscle === "Shoulders")
  ) {
    return "Main push movement for upper-body strength.";
  }

  if (pattern.includes("horizontal pull") || pattern.includes("vertical pull")) {
    return "Targets back strength and balances pressing volume.";
  }

  if (pattern.includes("squat") || pattern.includes("lunge")) {
    return "Lower-body compound for legs, control, and strength.";
  }

  if (pattern.includes("hinge") || String(subMuscle || "").toLowerCase().includes("hamstrings")) {
    return "Posterior-chain movement for hamstrings and hip strength.";
  }

  return "Selected to round out the day while matching your profile.";
}

async function choosePlanExercises(profile, coach) {
  const exercises = await Exercise.findAll({
    where: {
      source: "Free Exercise DB"
    },
    order: [["name", "ASC"]]
  });
  const assignments = [];
  const usedExerciseIds = new Set();
  const days = Math.max(1, Math.min(Number(profile.trainingDaysPerWeek) || 3, 6));
  const templates = splitTemplates(days, coach?.coachSpecialty);
  const exercisesPerDay = targetExerciseCount(profile.level, days);

  for (let dayIndex = 0; dayIndex < templates.length; dayIndex += 1) {
    const template = templates[dayIndex];
    const dayStats = {
      mainMuscles: {},
      subMuscles: {}
    };
    const slots = template.slots.slice(0, exercisesPerDay);
    let orderIndex = 1;

    for (const slot of slots) {
      const selected = selectExerciseForSlot(
        exercises,
        slot,
        profile,
        coach,
        usedExerciseIds,
        dayStats
      );

      if (!selected) {
        continue;
      }

      const prescription = prescriptionForSlot(profile, coach, slot);

      usedExerciseIds.add(selected.exerciseId);
      updateDayStats(dayStats, selected);
      assignments.push({
        exerciseId: selected.exerciseId,
        dayLabel: `Day ${dayIndex + 1} - ${template.name}`,
        orderIndex,
        targetSets: prescription.targetSets,
        targetReps: prescription.targetReps
      });
      orderIndex += 1;
    }
  }

  return assignments;
}

async function refreshPlanExercises(plan, profile, coach) {
  const assignments = await choosePlanExercises(profile, coach);

  if (assignments.length === 0) {
    throw new Error("No suitable exercises could be assigned to this generated workout plan.");
  }

  await WorkoutPlanExercise.destroy({
    where: {
      workoutPlanId: plan.planId
    }
  });

  await WorkoutPlanExercise.bulkCreate(
    assignments.map((assignment) => ({
      ...assignment,
      workoutPlanId: plan.planId
    }))
  );
}

async function upsertSuggestedWorkoutPlanForUser(userId) {
  const profile = await TraineeProfile.findOne({ where: { userId } });

  if (!profile) {
    return null;
  }

  let aiCoach = profile.aiSpecialistId
    ? await AiSpecialist.findOne({
        where: {
          specialistId: profile.aiSpecialistId,
          domain: "training",
          isActive: true
        }
      })
    : null;
  if (!aiCoach) {
    aiCoach = await AiSpecialist.findOne({
      where: { domain: "training", isActive: true },
      order: [["specialistId", "ASC"]]
    });
  }
  const generationContext = aiCoach
    ? { ...aiCoach.toJSON(), coachSpecialty: aiCoach.specialty }
    : null;
  const payload = {
    userId,
    goal: profile.goal,
    level: profile.level,
    daysPerWeek: profile.trainingDaysPerWeek,
    durationMinutes: durationForProfile(profile),
    notes: buildSuggestedNotes(profile, aiCoach)
  };
  const existingPlan = await WorkoutPlan.findOne({
    where: {
      userId,
      notes: {
        [Op.like]: `${SUGGESTED_PLAN_PREFIX}%`
      }
    }
  });

  if (existingPlan) {
    await existingPlan.update(payload);
    await refreshPlanExercises(existingPlan, profile, generationContext);

    return WorkoutPlan.findByPk(existingPlan.planId, {
      include: workoutPlanInclude
    });
  }

  const plan = await WorkoutPlan.create(payload);
  await refreshPlanExercises(plan, profile, generationContext);

  return WorkoutPlan.findByPk(plan.planId, {
    include: workoutPlanInclude
  });
}

async function backfillEmptySuggestedPlans() {
  const suggestedPlans = await WorkoutPlan.findAll({
    where: {
      notes: {
        [Op.like]: `${SUGGESTED_PLAN_PREFIX}%`
      }
    },
    include: workoutPlanInclude,
    order: [["planId", "ASC"]]
  });
  const results = [];

  for (const plan of suggestedPlans) {
    const assignmentCount = Array.isArray(plan.WorkoutPlanExercises)
      ? plan.WorkoutPlanExercises.length
      : 0;

    if (assignmentCount > 0) {
      results.push({
        planId: plan.planId,
        userId: plan.userId,
        status: "skipped",
        assignmentCount
      });
      continue;
    }

    const refreshedPlan = await upsertSuggestedWorkoutPlanForUser(plan.userId);
    if (!refreshedPlan) {
      results.push({
        planId: plan.planId,
        userId: plan.userId,
        status: "missing_profile",
        assignmentCount: 0
      });
      continue;
    }

    const refreshedData = formatWorkoutPlan(refreshedPlan);
    results.push({
      planId: plan.planId,
      userId: plan.userId,
      status: "backfilled",
      assignmentCount: refreshedData.assignments.length
    });
  }

  return results;
}

const suggestWorkoutPlan = asyncHandler(async (req, res) => {
  const userId = Number(req.body.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "userId is required and must be a positive number.", {
        userId: req.body.userId
      })
    );
  }

  const profile = await TraineeProfile.findOne({ where: { userId } });

  if (!profile) {
    return res.status(404).json(
      errorResponse("NOT_FOUND", "Trainee profile was not found.", {
        userId
      })
    );
  }

  const existingPlan = await WorkoutPlan.findOne({
    where: {
      userId,
      notes: {
        [Op.like]: `${SUGGESTED_PLAN_PREFIX}%`
      }
    }
  });
  const refreshedPlan = await upsertSuggestedWorkoutPlanForUser(userId);

  return res
    .status(existingPlan ? 200 : 201)
    .json(successResponse(formatWorkoutPlan(refreshedPlan)));
});

module.exports = {
  getWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan: controller.create,
  updateWorkoutPlan: controller.update,
  deleteWorkoutPlan: controller.remove,
  suggestWorkoutPlan,
  backfillEmptySuggestedPlans
};
