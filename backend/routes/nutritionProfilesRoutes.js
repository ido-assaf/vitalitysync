const express = require("express");
const nutritionProfilesController = require("../controllers/nutritionProfilesController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", nutritionProfilesController.getNutritionProfiles);
router.get("/:id", nutritionProfilesController.getNutritionProfileById);
router.post("/", authorizeRoles("admin"), nutritionProfilesController.createNutritionProfile);
router.put("/:id", authorizeRoles("admin"), nutritionProfilesController.updateNutritionProfile);
router.delete("/:id", authorizeRoles("admin"), nutritionProfilesController.deleteNutritionProfile);

module.exports = router;
