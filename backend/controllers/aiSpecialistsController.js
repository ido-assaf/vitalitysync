const { AiSpecialist, TraineeProfile } = require("../models");
const { errorResponse, successResponse } = require("../models/response");
const createCrudController = require("../utils/resourceControllerFactory");

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateAiSpecialistBody(body) {
  const details = {};

  ["name", "domain", "specialty", "description"].forEach((field) => {
    if (typeof body[field] !== "string" || body[field].trim() === "") {
      details[field] = `${field} is required and must be a non-empty string.`;
    }
  });

  if (!isStringArray(body.rules)) {
    details.rules = "rules is required and must be an array of strings.";
  }

  if (typeof body.isActive !== "boolean") {
    details.isActive = "isActive is required and must be a boolean.";
  }

  if (
    typeof body.domain === "string" &&
    !["training", "nutrition"].includes(body.domain.trim().toLowerCase())
  ) {
    details.domain = "domain must be training or nutrition.";
  }

  return Object.keys(details).length > 0 ? details : null;
}

function buildAiSpecialistPayload(body) {
  return {
    name: body.name.trim(),
    domain: body.domain.trim().toLowerCase(),
    specialty: body.specialty.trim(),
    description: body.description.trim(),
    rules: body.rules,
    isActive: body.isActive
  };
}

const controller = createCrudController({
  Model: AiSpecialist,
  idField: "specialistId",
  resourceLabel: "AI specialist",
  validateBody: validateAiSpecialistBody,
  buildCreatePayload: buildAiSpecialistPayload,
  buildUpdatePayload: buildAiSpecialistPayload
});

module.exports = {
  getAiSpecialists: controller.list,
  getAiSpecialistById: controller.getById,
  createAiSpecialist: controller.create,
  updateAiSpecialist: controller.update,
  deleteAiSpecialist: async (req, res, next) => {
    try {
      const specialistId = Number(req.params.id);
      const specialist = await AiSpecialist.findByPk(specialistId);

      if (!specialist) {
        return res.status(404).json(
          errorResponse("NOT_FOUND", "AI specialist was not found.", {
            specialistId
          })
        );
      }

      await TraineeProfile.update(
        { aiSpecialistId: null },
        { where: { aiSpecialistId: specialistId } }
      );
      const deleted = specialist.toJSON();
      await specialist.destroy();

      return res.status(200).json(successResponse(deleted));
    } catch (error) {
      return next(error);
    }
  }
};
