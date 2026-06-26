const {
  Exercise,
  SetLog,
  TraineeProfile,
  User,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession
} = require("../models");
const { successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");
const { sessionInclude } = require("./workoutSessionsController");

function getCoachFilter(req) {
  const coachId = Number(req.query.coachId || req.header("x-user-id"));
  const isAdminView = req.query.role === "admin" || req.header("x-user-role") === "admin";

  if (isAdminView || !Number.isInteger(coachId) || coachId <= 0) {
    return isAdminView ? null : 0;
  }

  return coachId;
}

const getTrainees = asyncHandler(async (req, res) => {
  const coachId = getCoachFilter(req);
  const where = {
    userRole: "trainee"
  };

  if (coachId !== null) {
    where.coachId = coachId;
  }

  const trainees = await User.findAll({
    where,
    include: [
      { model: User, as: "Coach", attributes: ["userId", "firstName", "lastName", "coachSpecialty"] },
      { model: TraineeProfile },
      {
        model: WorkoutPlan,
        include: [
          {
            model: WorkoutPlanExercise,
            include: [{ model: Exercise }]
          }
        ]
      }
    ],
    order: [["lastName", "ASC"], ["firstName", "ASC"]]
  });

  return res.status(200).json(successResponse(trainees));
});

const getLiveSessions = asyncHandler(async (req, res) => {
  const coachId = getCoachFilter(req);
  const userInclude = {
    model: User,
    attributes: ["userId", "firstName", "lastName", "userRole", "coachId"]
  };

  if (coachId !== null) {
    userInclude.where = {
      coachId
    };
  }

  const sessions = await WorkoutSession.findAll({
    where: {
      status: "active"
    },
    include: [
      userInclude,
      { model: WorkoutPlan },
      { model: SetLog },
      { model: WorkoutIssue }
    ],
    order: [["startedAt", "DESC"]]
  });

  return res.status(200).json(successResponse(sessions));
});

const getWorkoutHistory = asyncHandler(async (req, res) => {
  const coachId = getCoachFilter(req);
  const userInclude = {
    model: User,
    attributes: ["userId", "firstName", "lastName", "username", "coachId"]
  };

  if (coachId !== null) {
    userInclude.where = {
      coachId
    };
  }

  const sessions = await WorkoutSession.findAll({
    where: {
      status: "finished"
    },
    include: [
      userInclude,
      ...sessionInclude.filter((include) => include.model !== User)
    ],
    order: [["finishedAt", "DESC"], ["startedAt", "DESC"]],
    limit: 30
  });

  return res.status(200).json(successResponse(sessions));
});

module.exports = {
  getTrainees,
  getLiveSessions,
  getWorkoutHistory
};
