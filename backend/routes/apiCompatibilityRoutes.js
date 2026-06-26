const express = require("express");
const { Op } = require("sequelize");
const { FoodProduct, User } = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateLoginBody(body) {
  const details = {};
  const identifier = String(body.username || body.email || "").trim();

  if (!identifier) {
    details.username = "username is required.";
  }

  if (typeof body.password !== "string" || body.password.length < 6) {
    details.password = "password is required and must contain at least 6 characters.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function loginWhere(body) {
  const identifier = String(body.username || body.email || "").trim();

  if (isValidEmail(identifier)) {
    return {
      [Op.or]: [
        { username: identifier },
        { email: identifier.toLowerCase() }
      ]
    };
  }

  return { username: identifier };
}

function validateRegisterBody(body) {
  const details = {};

  ["firstName", "lastName", "username"].forEach((field) => {
    if (typeof body[field] !== "string" || body[field].trim() === "") {
      details[field] = `${field} is required and must be a non-empty string.`;
    }
  });

  if (!isValidEmail(body.email)) {
    details.email = "email is required and must be a valid email address.";
  }

  if (typeof body.password !== "string" || body.password.length < 6) {
    details.password = "password is required and must contain at least 6 characters.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function validateSettingsBody(body) {
  const details = {};

  if (typeof body.username !== "string" || body.username.trim() === "") {
    details.username = "username is required and must be a non-empty string.";
  }

  if (!isValidEmail(body.email)) {
    details.email = "email is required and must be a valid email address.";
  }

  if (typeof body.theme !== "string" || body.theme.trim() === "") {
    details.theme = "theme is required and must be a non-empty string.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function publicUser(user) {
  const data = user.toJSON();
  delete data.password;
  return data;
}

async function getRequestedUser(req) {
  const requestedUserId = Number(req.header("x-user-id") || req.query.userId);

  if (Number.isInteger(requestedUserId) && requestedUserId > 0) {
    return User.findByPk(requestedUserId);
  }

  return User.findOne({ order: [["userId", "ASC"]] });
}

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const validationDetails = validateLoginBody(req.body);

    if (validationDetails) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Login request body is invalid.", validationDetails)
      );
    }

    const user = await User.scope("withPassword").findOne({
      where: loginWhere(req.body)
    });

    if (
      !user ||
      user.password !== req.body.password ||
      !["admin", "trainee"].includes(user.userRole)
    ) {
      return res.status(401).json(errorResponse("INVALID_CREDENTIALS", "Invalid username or password."));
    }

    return res.status(200).json(successResponse(publicUser(user)));
  })
);

router.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const validationDetails = validateRegisterBody(req.body);

    if (validationDetails) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Registration request body is invalid.", validationDetails)
      );
    }

    try {
      const user = await User.create({
        firstName: req.body.firstName.trim(),
        lastName: req.body.lastName.trim(),
        username: req.body.username.trim(),
        email: req.body.email.trim().toLowerCase(),
        password: req.body.password,
        theme: "system",
        userRole: "trainee"
      });

      return res.status(201).json(successResponse(publicUser(user)));
    } catch (error) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "User could not be registered.", {
          reason: error.message
        })
      );
    }
  })
);

router.post("/auth/logout", (req, res) => {
  return res.status(200).json(successResponse({ message: "Logged out successfully." }));
});

router.get(
  "/users/me",
  asyncHandler(async (req, res) => {
    const user = await getRequestedUser(req);

    if (!user) {
      return res.status(404).json(errorResponse("NOT_FOUND", "No user exists in the database."));
    }

    return res.status(200).json(successResponse(publicUser(user)));
  })
);

router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const user = await getRequestedUser(req);

    if (!user) {
      return res.status(404).json(errorResponse("NOT_FOUND", "No user exists in the database."));
    }

    return res.status(200).json(
      successResponse({
        username: user.username,
        email: user.email,
        theme: user.theme,
        userRole: user.userRole
      })
    );
  })
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const validationDetails = validateSettingsBody(req.body);

    if (validationDetails) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Settings request body is invalid.", validationDetails)
      );
    }

    const user = await getRequestedUser(req);

    if (!user) {
      return res.status(404).json(errorResponse("NOT_FOUND", "No user exists in the database."));
    }

    const updates = {
      username: req.body.username.trim(),
      email: req.body.email.trim().toLowerCase(),
      theme: req.body.theme.trim()
    };

    await user.update(updates);

    return res.status(200).json(
      successResponse({
        username: user.username,
        email: user.email,
        theme: user.theme,
        userRole: user.userRole
      })
    );
  })
);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const products = await FoodProduct.findAll({ order: [["productId", "ASC"]] });
    return res.status(200).json(successResponse(products));
  })
);

module.exports = router;
