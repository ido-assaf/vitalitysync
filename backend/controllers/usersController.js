const { User } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, parseId, validationError } = require("../utils/controllerHelpers");
const createCrudController = require("../utils/resourceControllerFactory");
const { successResponse } = require("../models/response");

function validateUserBody(body) {
  const details = {};

  if (typeof body.firstName !== "string" || body.firstName.trim() === "") {
    details.firstName = "firstName is required and must be a non-empty string.";
  }

  if (typeof body.lastName !== "string" || body.lastName.trim() === "") {
    details.lastName = "lastName is required and must be a non-empty string.";
  }

  if (typeof body.userRole !== "string" || body.userRole.trim() === "") {
    details.userRole = "userRole is required and must be a non-empty string.";
  } else if (!["admin", "trainee"].includes(body.userRole.trim().toLowerCase())) {
    details.userRole = "userRole must be admin or trainee.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildUserPayload(body) {
  const firstName = body.firstName.trim();
  const lastName = body.lastName.trim();
  const email =
    typeof body.email === "string" && body.email.trim() !== ""
      ? body.email.trim().toLowerCase()
      : `${firstName}.${lastName}.${Date.now()}@example.com`.toLowerCase();

  return {
    firstName,
    lastName,
    email,
    password:
      typeof body.password === "string" && body.password.length >= 6 ? body.password : "password123",
    username:
      typeof body.username === "string" && body.username.trim() !== ""
        ? body.username.trim()
        : `${firstName}.${lastName}`.toLowerCase(),
    theme: typeof body.theme === "string" && body.theme.trim() !== "" ? body.theme.trim() : "system",
    userRole: body.userRole.trim().toLowerCase()
  };
}

const controller = createCrudController({
  Model: User,
  idField: "userId",
  resourceLabel: "User",
  validateBody: validateUserBody,
  buildCreatePayload: buildUserPayload,
  buildUpdatePayload: (body) => ({
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    userRole: body.userRole.trim().toLowerCase()
  })
});

module.exports = {
  getUsers: controller.list,
  getUserById: controller.getById,
  createUser: controller.create,
  updateUser: controller.update,
  deleteUser: controller.remove
};
