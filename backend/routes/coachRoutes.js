const express = require("express");
const coachController = require("../controllers/coachController");

const router = express.Router();

router.get("/live-sessions", coachController.getLiveSessions);
router.get("/workout-history", coachController.getWorkoutHistory);
router.get("/trainees", coachController.getTrainees);

module.exports = router;
