const { errorResponse } = require("../models/response");

function parseId(id) {
  const parsedId = Number(id);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
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
  validationError
};
