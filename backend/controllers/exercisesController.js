const { Exercise } = require("../models");
const createCrudController = require("../utils/resourceControllerFactory");

function validateExerciseBody(body) {
  const details = {};

  ["name", "muscleGroup", "equipment", "difficulty", "notes"].forEach((field) => {
    if (typeof body[field] !== "string" || body[field].trim() === "") {
      details[field] = `${field} is required and must be a non-empty string.`;
    }
  });

  return Object.keys(details).length > 0 ? details : null;
}

function buildExercisePayload(body) {
  const muscleGroup = body.muscleGroup.trim();
  const difficulty = body.difficulty.trim();

  return {
    name: body.name.trim(),
    muscleGroup,
    mainMuscleGroup:
      typeof body.mainMuscleGroup === "string" && body.mainMuscleGroup.trim() !== ""
        ? body.mainMuscleGroup.trim()
        : muscleGroup,
    subMuscleGroup:
      typeof body.subMuscleGroup === "string" && body.subMuscleGroup.trim() !== ""
        ? body.subMuscleGroup.trim()
        : muscleGroup,
    equipment: body.equipment.trim(),
    difficulty,
    level:
      typeof body.level === "string" && body.level.trim() !== "" ? body.level.trim() : difficulty,
    movementPattern:
      typeof body.movementPattern === "string" && body.movementPattern.trim() !== ""
        ? body.movementPattern.trim()
        : null,
    goalTags: Array.isArray(body.goalTags)
      ? body.goalTags.filter((tag) => typeof tag === "string" && tag.trim() !== "")
      : [],
    instructions: Array.isArray(body.instructions)
      ? body.instructions.filter((step) => typeof step === "string" && step.trim() !== "")
      : [],
    imageUrl:
      typeof body.imageUrl === "string" && body.imageUrl.trim() !== "" ? body.imageUrl.trim() : null,
    gifUrl:
      typeof body.gifUrl === "string" && body.gifUrl.trim() !== "" ? body.gifUrl.trim() : null,
    source:
      typeof body.source === "string" && body.source.trim() !== "" ? body.source.trim() : null,
    license:
      typeof body.license === "string" && body.license.trim() !== "" ? body.license.trim() : null,
    notes: body.notes.trim()
  };
}

const controller = createCrudController({
  Model: Exercise,
  idField: "exerciseId",
  resourceLabel: "Exercise",
  validateBody: validateExerciseBody,
  buildCreatePayload: buildExercisePayload,
  buildUpdatePayload: buildExercisePayload
});

module.exports = {
  getExercises: controller.list,
  getExerciseById: controller.getById,
  createExercise: controller.create,
  updateExercise: controller.update,
  deleteExercise: controller.remove
};
