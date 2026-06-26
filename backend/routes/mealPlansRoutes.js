const express = require("express");
const mealPlansController = require("../controllers/mealPlansController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", mealPlansController.getMealPlans);
router.get("/:id", mealPlansController.getMealPlanById);
router.post("/", authorizeRoles("admin"), mealPlansController.createMealPlan);
router.put("/:id", authorizeRoles("admin"), mealPlansController.updateMealPlan);
router.delete("/:id", authorizeRoles("admin"), mealPlansController.deleteMealPlan);

module.exports = router;
