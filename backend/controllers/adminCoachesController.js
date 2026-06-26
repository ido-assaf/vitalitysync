const { User } = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, parseId, validationError } = require("../utils/controllerHelpers");

const SPECIALTIES = [
  "strength training",
  "football",
  "basketball",
  "running",
  "weight loss",
  "general fitness"
];

function validateCoachBody(body, { requirePassword = false } = {}) {
  const details = {};

  ["firstName", "lastName", "username", "email", "coachSpecialty"].forEach((field) => {
    if (typeof body[field] !== "string" || body[field].trim() === "") {
      details[field] = `${field} is required and must be a non-empty string.`;
    }
  });

  if (typeof body.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    details.email = "email must be a valid email address.";
  }

  if (!SPECIALTIES.includes(String(body.coachSpecialty || "").trim().toLowerCase())) {
    details.coachSpecialty = `coachSpecialty must be one of: ${SPECIALTIES.join(", ")}.`;
  }

  if (requirePassword && (typeof body.password !== "string" || body.password.length < 6)) {
    details.password = "password is required and must contain at least 6 characters.";
  }

  if (
    body.password !== undefined &&
    body.password !== "" &&
    (typeof body.password !== "string" || body.password.length < 6)
  ) {
    details.password = "password must contain at least 6 characters.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function coachPayload(body) {
  const payload = {
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    username: body.username.trim(),
    email: body.email.trim().toLowerCase(),
    userRole: "coach",
    coachId: null,
    coachSpecialty: body.coachSpecialty.trim().toLowerCase(),
    coachBio: typeof body.coachBio === "string" ? body.coachBio.trim() : null
  };

  if (typeof body.password === "string" && body.password !== "") {
    payload.password = body.password;
  }

  return payload;
}

const getCoaches = asyncHandler(async (req, res) => {
  const coaches = await User.findAll({
    where: { userRole: "coach" },
    order: [["lastName", "ASC"], ["firstName", "ASC"]]
  });

  return res.status(200).json(successResponse(coaches));
});

const createCoach = asyncHandler(async (req, res) => {
  const validationDetails = validateCoachBody(req.body, { requirePassword: true });

  if (validationDetails) {
    return validationError(res, "Coach request body is invalid.", validationDetails);
  }

  try {
    const coach = await User.create(coachPayload(req.body));
    return res.status(201).json(successResponse(coach));
  } catch (error) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Coach could not be created.", {
        reason: error.message
      })
    );
  }
});

const updateCoach = asyncHandler(async (req, res) => {
  const coachId = parseId(req.params.id);

  if (coachId === null) {
    return validationError(res, "Coach id must be a valid number.", {
      id: req.params.id
    });
  }

  const validationDetails = validateCoachBody(req.body);
  if (validationDetails) {
    return validationError(res, "Coach request body is invalid.", validationDetails);
  }

  const coach = await User.findOne({
    where: {
      userId: coachId,
      userRole: "coach"
    }
  });

  if (!coach) {
    return notFound(res, "Coach was not found.", { coachId });
  }

  await coach.update(coachPayload(req.body));
  return res.status(200).json(successResponse(coach));
});

const deleteCoach = asyncHandler(async (req, res) => {
  const coachId = parseId(req.params.id);

  if (coachId === null) {
    return validationError(res, "Coach id must be a valid number.", {
      id: req.params.id
    });
  }

  const coach = await User.findOne({
    where: {
      userId: coachId,
      userRole: "coach"
    }
  });

  if (!coach) {
    return notFound(res, "Coach was not found.", { coachId });
  }

  await User.update({ coachId: null }, { where: { coachId } });
  const deletedCoach = coach.toJSON();
  await coach.destroy();

  return res.status(200).json(successResponse(deletedCoach));
});

module.exports = {
  SPECIALTIES,
  createCoach,
  deleteCoach,
  getCoaches,
  updateCoach
};
