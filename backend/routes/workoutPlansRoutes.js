const express = require("express");
const workoutPlansController = require("../controllers/workoutPlansController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", workoutPlansController.getWorkoutPlans);
router.post("/suggest", workoutPlansController.suggestWorkoutPlan);
router.get("/:id", workoutPlansController.getWorkoutPlanById);
router.post("/", authorizeRoles("admin"), workoutPlansController.createWorkoutPlan);
router.put("/:id", authorizeRoles("admin"), workoutPlansController.updateWorkoutPlan);
router.delete("/:id", authorizeRoles("admin"), workoutPlansController.deleteWorkoutPlan);

module.exports = router;
