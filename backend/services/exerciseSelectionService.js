// Shared, deterministic exercise-eligibility and movement/muscle matching primitives.
// Extracted from workoutPlansController so that both plan generation and the in-session
// coach-response substitution use the SAME safety rules (single source of truth).

const EXERCISE_LIBRARY_SOURCE = "Free Exercise DB";

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
  const hasExplicitLungeLimit = limits.some(
    (item) => item.includes("lunge") || item.includes("lunges")
  );
  const hasExplicitSplitSquatLimit = limits.some((item) => item.includes("split squat"));

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

  if (hasExplicitLungeLimit && exerciseName.includes("lunge")) {
    return false;
  }

  if (hasExplicitSplitSquatLimit && exerciseName.includes("split squat")) {
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

function isStableLowerBodyExercise(exercise) {
  const name = String(exercise.name || "").toLowerCase();
  const pattern = String(exercise.movementPattern || "").toLowerCase();
  const mainMuscle = String(exercise.mainMuscleGroup || exercise.muscleGroup || "").toLowerCase();
  const subMuscle = String(exercise.subMuscleGroup || "").toLowerCase();

  return (
    mainMuscle === "legs" &&
    !name.includes("lunge") &&
    !name.includes("jump") &&
    !pattern.includes("conditioning") &&
    (
      pattern.includes("hinge") ||
      name.includes("bridge") ||
      name.includes("hip thrust") ||
      name.includes("box squat") ||
      name.includes("machine") ||
      subMuscle.includes("glute") ||
      subMuscle.includes("hamstring")
    )
  );
}

module.exports = {
  EXERCISE_LIBRARY_SOURCE,
  equipmentMatches,
  isExerciseAllowed,
  isStableLowerBodyExercise,
  levelRank,
  mainMuscleMatches,
  movementMatches,
  normalizeList,
  subMuscleMatches
};
