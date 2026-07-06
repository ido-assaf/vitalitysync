const express = require("express");
const workoutPlansController = require("../controllers/workoutPlansController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", workoutPlansController.getWorkoutPlans);
router.post("/suggest", workoutPlansController.suggestWorkoutPlan);
router.post("/weekly-review", workoutPlansController.getWeeklyFitnessReview);
router.post("/weekly-review/check-in", workoutPlansController.submitWeeklyFitnessCheckIn);
router.get("/:id", workoutPlansController.getWorkoutPlanById);
router.post("/", authorizeRoles("admin"), workoutPlansController.createWorkoutPlan);
router.put("/:id", authorizeRoles("admin"), workoutPlansController.updateWorkoutPlan);
router.delete("/:id", authorizeRoles("admin"), workoutPlansController.deleteWorkoutPlan);

module.exports = router;
