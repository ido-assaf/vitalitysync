// Legacy assignment CRUD surface — not called by the React frontend. Kept for
// the course API contract (docs/postman_collection.json); check it before deleting.
const express = require("express");
const setLogsController = require("../controllers/setLogsController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", setLogsController.getSetLogs);
router.get("/:id", setLogsController.getSetLogById);
router.post("/", authorizeRoles("admin"), setLogsController.createSetLog);
router.put("/:id", authorizeRoles("admin"), setLogsController.updateSetLog);
router.delete("/:id", authorizeRoles("admin"), setLogsController.deleteSetLog);

module.exports = router;
