const { Op } = require("sequelize");
const { TraineeProfile, WorkoutPlan } = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");
const createCrudController = require("../utils/resourceControllerFactory");
const { validateProfileReadyForPlan } = require("../utils/traineeProfileValidation");
const {
  appendWeeklyCheckInHistory,
  buildFitnessWeeklyCheckIn,
  buildWeeklyCheckInSnapshot,
  buildWeeklyReviewCheckInSignals
} = require("../services/aiSpecialistWeeklyCheckInService");
const {
  SUGGESTED_PLAN_PREFIX,
  adjustedTargetExerciseCount,
  appendPlanQualityNote,
  backfillEmptySuggestedPlans,
  buildCoachIntakeNote,
  buildExpertRulesNote,
  buildPlanningGuidanceNote,
  buildPlanQualityNote,
  buildProfessionalKnowledgeNote,
  buildSuggestedNotes,
  buildTrainingContextNote,
  buildWeeklyFitnessReviewForUser,
  buildWeeklyReviewPreview,
  choosePlanExercises,
  formatWorkoutPlan,
  persistWeeklyCheckInHistory,
  planningModifierScoreDelta,
  prescriptionForSlot,
  scoreExerciseForSlot,
  selectExerciseForSlot,
  targetExerciseCount,
  upsertSuggestedWorkoutPlanForUser,
  weeklyCheckInHistoryFor,
  workoutPlanInclude
} = require("../services/workoutPlanGenerationService");

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

  const profileReadinessDetails = validateProfileReadyForPlan(profile);

  if (profileReadinessDetails) {
    return res.status(400).json(
      errorResponse(
        "VALIDATION_ERROR",
        "Complete age, weight, and height before generating a workout plan.",
        profileReadinessDetails
      )
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

function validateWeeklyReviewUserId(bodyUserId) {
  const userId = Number(bodyUserId);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

async function findWeeklyReviewProfile(userId) {
  return TraineeProfile.findOne({ where: { userId } });
}

const getWeeklyFitnessReview = asyncHandler(async (req, res) => {
  const userId = validateWeeklyReviewUserId(req.body.userId);

  if (!userId) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "userId is required and must be a positive number.", {
        userId: req.body.userId
      })
    );
  }

  const profile = await findWeeklyReviewProfile(userId);

  if (!profile) {
    return res.status(404).json(
      errorResponse("NOT_FOUND", "Trainee profile was not found.", {
        userId
      })
    );
  }

  const checkInSignals = buildWeeklyReviewCheckInSignals({
    history: weeklyCheckInHistoryFor(profile)
  });
  const weeklyReview = await buildWeeklyFitnessReviewForUser(userId, profile, {
    checkInSignals
  });

  return res.status(200).json(successResponse(buildWeeklyReviewPreview(weeklyReview)));
});

const submitWeeklyFitnessCheckIn = asyncHandler(async (req, res) => {
  const userId = validateWeeklyReviewUserId(req.body.userId);

  if (!userId) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "userId is required and must be a positive number.", {
        userId: req.body.userId
      })
    );
  }

  const profile = await findWeeklyReviewProfile(userId);

  if (!profile) {
    return res.status(404).json(
      errorResponse("NOT_FOUND", "Trainee profile was not found.", {
        userId
      })
    );
  }

  const checkIn = await buildFitnessWeeklyCheckIn({
    answers: req.body.answers,
    generalNote: req.body.generalNote,
    selectedTags: req.body.selectedTags
  });

  if (checkIn.details) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Weekly check-in content is invalid.", checkIn.details)
    );
  }

  const existingHistory = weeklyCheckInHistoryFor(profile);
  const provisionalHistory = appendWeeklyCheckInHistory(existingHistory, {
    parsedSignals: checkIn.normalized.parsedSignals
  });
  const checkInSignals = buildWeeklyReviewCheckInSignals({
    history: provisionalHistory,
    currentSignals: checkIn.normalized.parsedSignals
  });
  const weeklyReview = await buildWeeklyFitnessReviewForUser(userId, profile, { checkInSignals });
  const preview = buildWeeklyReviewPreview(weeklyReview);
  const snapshot = buildWeeklyCheckInSnapshot({
    checkIn: checkIn.normalized,
    preview
  });
  const weeklyCheckIns = appendWeeklyCheckInHistory(existingHistory, snapshot);

  await persistWeeklyCheckInHistory(profile, weeklyCheckIns);

  return res.status(200).json(
    successResponse({
      ...checkIn.normalized,
      recurrenceSignals: buildWeeklyReviewCheckInSignals({ history: weeklyCheckIns }).filter((signal) =>
        signal.startsWith("repeated_") || signal.startsWith("recurring_")
      ),
      historyCount: weeklyCheckIns.length,
      preview
    })
  );
});

module.exports = {
  getWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan: controller.create,
  updateWorkoutPlan: controller.update,
  deleteWorkoutPlan: controller.remove,
  suggestWorkoutPlan,
  getWeeklyFitnessReview,
  submitWeeklyFitnessCheckIn,
  backfillEmptySuggestedPlans,
  _internals: {
    buildCoachIntakeNote,
    buildExpertRulesNote,
    buildPlanningGuidanceNote,
    buildPlanQualityNote,
    buildProfessionalKnowledgeNote,
    buildTrainingContextNote,
    buildWeeklyReviewPreview,
    buildSuggestedNotes,
    buildWeeklyReviewCheckInSignals,
    appendPlanQualityNote,
    choosePlanExercises,
    planningModifierScoreDelta,
    prescriptionForSlot,
    scoreExerciseForSlot,
    selectExerciseForSlot,
    adjustedTargetExerciseCount,
    targetExerciseCount,
    validateProfileReadyForPlan,
    validateWeeklyReviewUserId,
    weeklyCheckInHistoryFor,
    upsertSuggestedWorkoutPlanForUser
  }
};
