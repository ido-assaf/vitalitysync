const express = require("express");
const workoutSessionsController = require("../controllers/workoutSessionsController");

const router = express.Router();

router.get("/active", workoutSessionsController.getActiveWorkoutSession);
router.get("/", workoutSessionsController.getWorkoutSessions);

module.exports = router;
