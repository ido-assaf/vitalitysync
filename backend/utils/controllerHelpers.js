const { errorResponse } = require("../models/response");

function parseId(id) {
  const parsedId = Number(id);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

// Canonical parser for the x-user-id identity header (see middleware/auth.js
// for the trust model). Returns a positive integer or null.
function userIdFromHeader(req) {
  return parseId(req.header("x-user-id"));
}

function plain(record) {
  return record && typeof record.toJSON === "function" ? record.toJSON() : record;
}

function notFound(res, message, details) {
  return res.status(404).json(errorResponse("NOT_FOUND", message, details));
}

function validationError(res, message, details) {
  return res.status(400).json(errorResponse("VALIDATION_ERROR", message, details));
}

module.exports = {
  notFound,
  parseId,
  plain,
  userIdFromHeader,
  validationError
};
