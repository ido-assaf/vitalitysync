const express = require("express");
const adminDashboardController = require("../controllers/adminDashboardController");
const aiSpecialistsController = require("../controllers/aiSpecialistsController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authorizeRoles("admin"));

router.get("/ai-coaches", adminDashboardController.getAiCoaches);
router.post("/ai-coaches", aiSpecialistsController.createAiSpecialist);
router.put("/ai-coaches/:id", aiSpecialistsController.updateAiSpecialist);
router.delete("/ai-coaches/:id", aiSpecialistsController.deleteAiSpecialist);
router.get("/ai-signal-patterns", adminDashboardController.getSignalPatterns);
router.put("/ai-signal-patterns/:id/disable", adminDashboardController.disableSignalPattern);
router.get("/trainees", adminDashboardController.getTrainees);
router.put("/trainees/:userId/ai-specialist", adminDashboardController.assignAiCoach);
router.get("/trainees/:userId/details", adminDashboardController.getTraineeDetails);
router.get("/live-sessions", adminDashboardController.getLiveSessions);
router.get("/workout-history", adminDashboardController.getWorkoutHistory);

module.exports = router;
