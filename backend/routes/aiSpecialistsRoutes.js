const express = require("express");
const aiSpecialistsController = require("../controllers/aiSpecialistsController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", aiSpecialistsController.getAiSpecialists);
router.get("/:id", aiSpecialistsController.getAiSpecialistById);
router.post("/", authorizeRoles("admin"), aiSpecialistsController.createAiSpecialist);
router.put("/:id", authorizeRoles("admin"), aiSpecialistsController.updateAiSpecialist);
router.delete("/:id", authorizeRoles("admin"), aiSpecialistsController.deleteAiSpecialist);

module.exports = router;
