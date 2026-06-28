const { AiSpecialist, TraineeProfile } = require("../models");
const { successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");
const { isAvailableFitnessCoach } = require("../utils/aiSpecialistAvailability");
const { parseId, validationError } = require("../utils/controllerHelpers");

function stringArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim() !== "");
  }

  return [];
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function hasOwnField(body, field) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function validateProfileBody(body) {
  const details = {};
  const validBiologicalSex = ["male", "female", "prefer_not_to_say"];
  const age = optionalNumber(body.age);
  const weight = optionalNumber(body.weight);
  const height = optionalNumber(body.height);

  if (!Number.isInteger(body.userId) || body.userId <= 0) {
    details.userId = "userId is required and must be a positive number.";
  }

  if (typeof body.goal !== "string" || body.goal.trim() === "") {
    details.goal = "goal is required and must be a non-empty string.";
  }

  if (typeof body.level !== "string" || body.level.trim() === "") {
    details.level = "level is required and must be a non-empty string.";
  }

  if (
    !Number.isInteger(body.trainingDaysPerWeek) ||
    body.trainingDaysPerWeek < 1 ||
    body.trainingDaysPerWeek > 7
  ) {
    details.trainingDaysPerWeek =
      "trainingDaysPerWeek is required and must be a number between 1 and 7.";
  }

  if (typeof body.preferredStyle !== "string" || body.preferredStyle.trim() === "") {
    details.preferredStyle = "preferredStyle is required and must be a non-empty string.";
  }

  if (
    body.biologicalSex !== null &&
    body.biologicalSex !== undefined &&
    body.biologicalSex !== "" &&
    !validBiologicalSex.includes(body.biologicalSex)
  ) {
    details.biologicalSex =
      "biologicalSex must be male, female, or prefer_not_to_say.";
  }

  if (age !== null && (!Number.isFinite(age) || age < 10 || age > 100)) {
    details.age = "age must be between 10 and 100.";
  }

  if (weight !== null && (!Number.isFinite(weight) || weight < 30 || weight > 350)) {
    details.weight = "weight must be between 30 and 350 kilograms.";
  }

  if (height !== null && (!Number.isFinite(height) || height < 100 || height > 250)) {
    details.height = "height must be between 100 and 250 centimeters.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

async function resolveAiSpecialistId(body, existingProfile) {
  if (!hasOwnField(body, "aiSpecialistId")) {
    return {
      value: existingProfile ? existingProfile.aiSpecialistId : null
    };
  }

  if (
    body.aiSpecialistId === null ||
    body.aiSpecialistId === undefined ||
    body.aiSpecialistId === ""
  ) {
    return { value: null };
  }

  const aiSpecialistId = Number(body.aiSpecialistId);
  if (!Number.isInteger(aiSpecialistId) || aiSpecialistId <= 0) {
    return {
      details: {
        aiSpecialistId: "aiSpecialistId must be an available Fitness Coach id."
      }
    };
  }

  const specialist = await AiSpecialist.findByPk(aiSpecialistId);
  if (!isAvailableFitnessCoach(specialist)) {
    return {
      details: {
        aiSpecialistId: "Only the available Fitness Coach can be selected for workout planning."
      }
    };
  }

  return { value: aiSpecialistId };
}

async function buildProfilePayload(body, existingProfile = null) {
  const resolvedSpecialist = await resolveAiSpecialistId(body, existingProfile);

  if (resolvedSpecialist.details) {
    return { validationDetails: resolvedSpecialist.details };
  }

  return {
    payload: {
      userId: body.userId,
      aiSpecialistId: resolvedSpecialist.value,
      goal: body.goal.trim(),
      level: body.level.trim(),
      age: optionalNumber(body.age),
      weight: optionalNumber(body.weight),
      height: optionalNumber(body.height),
      biologicalSex: body.biologicalSex || null,
      trainingDaysPerWeek: body.trainingDaysPerWeek,
      preferredStyle: body.preferredStyle.trim(),
      equipmentAccess: stringArray(body.equipmentAccess),
      injuries: stringArray(body.injuries),
      limitations: stringArray(body.limitations),
      likedExercises: stringArray(body.likedExercises),
      dislikedExercises: stringArray(body.dislikedExercises),
      specialtyPreferences:
        typeof body.specialtyPreferences === "object" && body.specialtyPreferences !== null
          ? body.specialtyPreferences
          : {},
      freeTextNotes: typeof body.freeTextNotes === "string" ? body.freeTextNotes.trim() : ""
    }
  };
}

const getProfileByUserId = asyncHandler(async (req, res) => {
  const userId = parseId(req.params.userId);

  if (userId === null) {
    return validationError(res, "User id must be a valid number.", {
      userId: req.params.userId
    });
  }

  const profile = await TraineeProfile.findOne({
    where: { userId },
    include: [{ model: AiSpecialist }]
  });

  return res.status(200).json(successResponse(profile));
});

const createProfile = asyncHandler(async (req, res) => {
  const validationDetails = validateProfileBody(req.body);

  if (validationDetails) {
    return validationError(res, "Trainee profile request body is invalid.", validationDetails);
  }

  const existingProfile = await TraineeProfile.findOne({ where: { userId: req.body.userId } });
  const { payload, validationDetails: specialistValidationDetails } =
    await buildProfilePayload(req.body, existingProfile);

  if (specialistValidationDetails) {
    return validationError(
      res,
      "Trainee profile request body is invalid.",
      specialistValidationDetails
    );
  }

  if (existingProfile) {
    await existingProfile.update(payload);
    return res.status(200).json(successResponse(existingProfile));
  }

  const profile = await TraineeProfile.create(payload);
  return res.status(201).json(successResponse(profile));
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = parseId(req.params.userId);

  if (userId === null) {
    return validationError(res, "User id must be a valid number.", {
      userId: req.params.userId
    });
  }

  const validationDetails = validateProfileBody({ ...req.body, userId });

  if (validationDetails) {
    return validationError(res, "Trainee profile request body is invalid.", validationDetails);
  }

  let profile = await TraineeProfile.findOne({ where: { userId } });
  const { payload, validationDetails: specialistValidationDetails } =
    await buildProfilePayload({ ...req.body, userId }, profile);

  if (specialistValidationDetails) {
    return validationError(
      res,
      "Trainee profile request body is invalid.",
      specialistValidationDetails
    );
  }

  if (profile) {
    await profile.update(payload);
  } else {
    profile = await TraineeProfile.create(payload);
  }

  return res.status(200).json(successResponse(profile));
});

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
  _internals: {
    buildProfilePayload,
    resolveAiSpecialistId,
    validateProfileBody
  }
};
