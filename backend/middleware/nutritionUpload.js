const multer = require("multer");
const { errorResponse } = require("../models/response");

const MAX_MEAL_IMAGE_BYTES = 3 * 1024 * 1024;
const MEAL_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateMealPhotoType(file) {
  return MEAL_IMAGE_TYPES.has(file?.mimetype)
    ? null
    : "Meal photos must be JPEG, PNG, or WebP images.";
}

function validateMealPhotoFile(file) {
  if (!file) return null;
  const typeError = validateMealPhotoType(file);
  if (typeError) return typeError;
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "The selected meal photo is empty.";
  }
  if (file.size > MAX_MEAL_IMAGE_BYTES) {
    return "Meal photos must be 3 MB or smaller.";
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MEAL_IMAGE_BYTES,
    files: 1
  },
  fileFilter(req, file, callback) {
    const typeError = validateMealPhotoType(file);
    callback(typeError ? new Error(typeError) : null, !typeError);
  }
});

function mealPhotoUpload(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Meal photos must be 3 MB or smaller."
          : error.message || "Meal photo upload is invalid.";

      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Meal photo upload is invalid.", {
          image: message
        })
      );
    }

    const validationError = validateMealPhotoFile(req.file);
    if (validationError) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Meal photo upload is invalid.", {
          image: validationError
        })
      );
    }

    return next();
  });
}

module.exports = {
  MAX_MEAL_IMAGE_BYTES,
  MEAL_IMAGE_TYPES,
  mealPhotoUpload,
  validateMealPhotoFile,
  validateMealPhotoType
};
