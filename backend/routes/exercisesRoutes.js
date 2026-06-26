const express = require("express");
const exercisesController = require("../controllers/exercisesController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", exercisesController.getExercises);
router.get("/:id", exercisesController.getExerciseById);
router.post("/", authorizeRoles("admin"), exercisesController.createExercise);
router.put("/:id", authorizeRoles("admin"), exercisesController.updateExercise);
router.delete("/:id", authorizeRoles("admin"), exercisesController.deleteExercise);

module.exports = router;
