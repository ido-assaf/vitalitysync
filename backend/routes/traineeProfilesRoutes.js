const express = require("express");
const traineeProfilesController = require("../controllers/traineeProfilesController");

const router = express.Router();

router.get("/:userId", traineeProfilesController.getProfileByUserId);
router.post("/", traineeProfilesController.createProfile);
router.put("/:userId", traineeProfilesController.updateProfile);

module.exports = router;
