const { WorkoutSession } = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");
const { parseId, userIdFromHeader } = require("../utils/controllerHelpers");
const { buildWorkoutSessionInclude } = require("../utils/workoutSessionInclude");

const sessionInclude = buildWorkoutSessionInclude({
  userAttributes: ["userId", "firstName", "lastName", "username", "coachId"]
});

function getRequestedUser(req) {
  // The userId query param wins when present; otherwise the trainee's own id.
  const requestedUserId = req.query.userId
    ? parseId(req.query.userId)
    : userIdFromHeader(req);
  const currentUserId = userIdFromHeader(req);
  const isAdmin = req.header("x-user-role") === "admin";

  if (!requestedUserId) {
    return {
      error: {
        status: 400,
        body: errorResponse("VALIDATION_ERROR", "A valid userId is required.")
      }
    };
  }

  if (!isAdmin && currentUserId !== requestedUserId) {
    return {
      error: {
        status: 403,
        body: errorResponse("FORBIDDEN", "You may only view your own workout history.")
      }
    };
  }

  return { requestedUserId };
}

const getWorkoutSessions = asyncHandler(async (req, res) => {
  const { requestedUserId, error } = getRequestedUser(req);

  if (error) {
    return res.status(error.status).json(error.body);
  }

  const sessions = await WorkoutSession.findAll({
    where: {
      userId: requestedUserId,
      status: "finished"
    },
    include: sessionInclude,
    order: [["finishedAt", "DESC"], ["startedAt", "DESC"]]
  });

  return res.status(200).json(successResponse(sessions));
});

const getActiveWorkoutSession = asyncHandler(async (req, res) => {
  const { requestedUserId, error } = getRequestedUser(req);

  if (error) {
    return res.status(error.status).json(error.body);
  }

  const session = await WorkoutSession.findOne({
    where: {
      userId: requestedUserId,
      status: "active"
    },
    include: sessionInclude,
    order: [["startedAt", "DESC"]]
  });

  return res.status(200).json(successResponse(session));
});

module.exports = {
  getActiveWorkoutSession,
  getWorkoutSessions
};
