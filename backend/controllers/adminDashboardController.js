const {
  AiSpecialist,
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
const {
  decorateSpecialist,
  isAvailableFitnessCoach
} = require("../utils/aiSpecialistAvailability");
const { notFound, parseId, validationError } = require("../utils/controllerHelpers");

const planInclude = [
  {
    model: WorkoutPlanExercise,
    include: [{ model: Exercise }]
  }
];

const sessionInclude = [
  {
    model: User,
    attributes: ["userId", "firstName", "lastName", "username", "userRole"]
  },
  { model: WorkoutPlan },
  {
    model: SetLog,
    include: [{ model: Exercise }]
  },
  { model: WorkoutIssue }
];

const getAiCoaches = asyncHandler(async (req, res) => {
  const specialists = await AiSpecialist.findAll({
    include: [
      {
        model: TraineeProfile,
        attributes: ["profileId", "userId", "aiSpecialistId"]
      }
    ],
    order: [["name", "ASC"]]
  });

  const data = specialists.map((specialist) => {
    const plain = decorateSpecialist(specialist);
    return {
      ...plain,
      assignedTraineeCount: Array.isArray(plain.TraineeProfiles)
        ? plain.TraineeProfiles.length
        : 0
    };
  });

  return res.status(200).json(successResponse(data));
});

const getTrainees = asyncHandler(async (req, res) => {
  const trainees = await User.findAll({
    where: { userRole: "trainee" },
    attributes: [
      "userId",
      "firstName",
      "lastName",
      "username",
      "email",
      "userRole",
      "createDate",
      "updateDate"
    ],
    include: [
      {
        model: TraineeProfile,
        include: [{ model: AiSpecialist }]
      }
    ],
    order: [["lastName", "ASC"], ["firstName", "ASC"]]
  });

  return res.status(200).json(successResponse(trainees));
});

const assignAiCoach = asyncHandler(async (req, res) => {
  const userId = parseId(req.params.userId);

  if (userId === null) {
    return validationError(res, "User id must be a valid number.", {
      userId: req.params.userId
    });
  }

  const trainee = await User.findOne({
    where: { userId, userRole: "trainee" }
  });

  if (!trainee) {
    return notFound(res, "Trainee was not found.", { userId });
  }

  const profile = await TraineeProfile.findOne({ where: { userId } });
  if (!profile) {
    return notFound(res, "Trainee profile was not found.", { userId });
  }

  const requestedSpecialistId = req.body.aiSpecialistId;
  let aiSpecialistId = null;

  if (
    requestedSpecialistId !== null &&
    requestedSpecialistId !== undefined &&
    requestedSpecialistId !== ""
  ) {
    aiSpecialistId = Number(requestedSpecialistId);
    const specialist = await AiSpecialist.findByPk(aiSpecialistId);

    if (!isAvailableFitnessCoach(specialist)) {
      return validationError(
        res,
        "Only the available Fitness Coach can be assigned to trainee workout profiles.",
        { aiSpecialistId }
      );
    }
  }

  await profile.update({ aiSpecialistId });
  const updatedProfile = await TraineeProfile.findByPk(profile.profileId, {
    include: [{ model: AiSpecialist }]
  });

  return res.status(200).json(successResponse(updatedProfile));
});

const getTraineeDetails = asyncHandler(async (req, res) => {
  const userId = parseId(req.params.userId);

  if (userId === null) {
    return validationError(res, "User id must be a valid number.", {
      userId: req.params.userId
    });
  }

  const trainee = await User.findOne({
    where: { userId, userRole: "trainee" },
    attributes: [
      "userId",
      "firstName",
      "lastName",
      "username",
      "email",
      "userRole",
      "createDate",
      "updateDate"
    ],
    include: [
      {
        model: TraineeProfile,
        include: [{ model: AiSpecialist }]
      },
      {
        model: WorkoutPlan,
        include: planInclude
      }
    ]
  });

  if (!trainee) {
    return notFound(res, "Trainee was not found.", { userId });
  }

  const sessions = await WorkoutSession.findAll({
    where: { userId },
    include: sessionInclude.filter((include) => include.model !== User),
    order: [["startedAt", "DESC"]]
  });

  return res.status(200).json(
    successResponse({
      trainee,
      activeSession: sessions.find((session) => session.status === "active") || null,
      workoutHistory: sessions.filter((session) => session.status === "finished")
    })
  );
});

const getLiveSessions = asyncHandler(async (req, res) => {
  const sessions = await WorkoutSession.findAll({
    where: { status: "active" },
    include: sessionInclude,
    order: [["startedAt", "DESC"]]
  });

  return res.status(200).json(successResponse(sessions));
});

const getWorkoutHistory = asyncHandler(async (req, res) => {
  const sessions = await WorkoutSession.findAll({
    where: { status: "finished" },
    include: sessionInclude,
    order: [["finishedAt", "DESC"], ["startedAt", "DESC"]],
    limit: 50
  });

  return res.status(200).json(successResponse(sessions));
});

module.exports = {
  assignAiCoach,
  getAiCoaches,
  getLiveSessions,
  getTraineeDetails,
  getTrainees,
  getWorkoutHistory
};
