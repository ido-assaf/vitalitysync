const express = require("express");
const foodProductsController = require("../controllers/foodProductsController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", foodProductsController.getFoodProducts);
router.get("/:id", foodProductsController.getFoodProductById);
router.post("/", authorizeRoles("admin"), foodProductsController.createFoodProduct);
router.put("/:id", authorizeRoles("admin"), foodProductsController.updateFoodProduct);
router.delete("/:id", authorizeRoles("admin"), foodProductsController.deleteFoodProduct);

module.exports = router;
