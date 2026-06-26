const express = require("express");
const nutritionController = require("../controllers/nutritionController");
const { authorizeRoles } = require("../middleware/auth");
const { mealPhotoUpload } = require("../middleware/nutritionUpload");

const router = express.Router();

router.use(authorizeRoles("trainee"));
router.get("/profile", nutritionController.getOwnProfile);
router.put("/profile", nutritionController.upsertOwnProfile);
router.get("/target-suggestion", nutritionController.getTargetSuggestion);
router.get("/recent-foods", nutritionController.getRecentFoods);
router.get("/favorites", nutritionController.getFavorites);
router.post("/favorites", nutritionController.addFavorite);
router.delete("/favorites/:barcode", nutritionController.deleteFavorite);
router.get("/foods/search", nutritionController.searchFoodProducts);
router.get("/foods/:barcode", nutritionController.getFoodProduct);
router.post("/evaluate", nutritionController.evaluateFoodProduct);
router.post("/estimate-meal", mealPhotoUpload, nutritionController.estimateMeal);
router.get("/today", nutritionController.getToday);
router.post("/log-items", nutritionController.addLogItem);
router.delete("/log-items/:id", nutritionController.deleteLogItem);

module.exports = router;
