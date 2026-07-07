// Legacy assignment CRUD surface — not called by the React frontend (live set
// logging flows through Socket.IO in services/socketService.js). Kept for the
// course API contract (docs/postman_collection.json); check it before deleting.
const { SetLog } = require("../models");
const createCrudController = require("../utils/resourceControllerFactory");

function validateSetLogBody(body) {
  const details = {};

  if (!Number.isInteger(body.userId) || body.userId <= 0) {
    details.userId = "userId is required and must be a positive number.";
  }

  if (!Number.isInteger(body.workoutPlanId) || body.workoutPlanId <= 0) {
    details.workoutPlanId = "workoutPlanId is required and must be a positive number.";
  }

  if (!Number.isInteger(body.exerciseId) || body.exerciseId <= 0) {
    details.exerciseId = "exerciseId is required and must be a positive number.";
  }

  if (!Number.isInteger(body.setNumber) || body.setNumber <= 0) {
    details.setNumber = "setNumber is required and must be a positive number.";
  }

  if (typeof body.weight !== "number" || Number.isNaN(body.weight) || body.weight < 0) {
    details.weight = "weight is required and must be a number greater than or equal to 0.";
  }

  if (!Number.isInteger(body.reps) || body.reps <= 0) {
    details.reps = "reps is required and must be a positive number.";
  }

  if (typeof body.completed !== "boolean") {
    details.completed = "completed is required and must be a boolean.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildSetLogPayload(body) {
  return {
    userId: body.userId,
    workoutPlanId: body.workoutPlanId,
    exerciseId: body.exerciseId,
    workoutSessionId: Number.isInteger(body.workoutSessionId) ? body.workoutSessionId : null,
    setNumber: body.setNumber,
    weight: body.weight,
    reps: body.reps,
    completed: body.completed,
    logDate: body.logDate ? new Date(body.logDate) : new Date()
  };
}

const controller = createCrudController({
  Model: SetLog,
  idField: "setLogId",
  resourceLabel: "Set log",
  validateBody: validateSetLogBody,
  buildCreatePayload: buildSetLogPayload,
  buildUpdatePayload: buildSetLogPayload
});

module.exports = {
  getSetLogs: controller.list,
  getSetLogById: controller.getById,
  createSetLog: controller.create,
  updateSetLog: controller.update,
  deleteSetLog: controller.remove
};
