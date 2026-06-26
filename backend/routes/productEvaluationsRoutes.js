const express = require("express");
const productEvaluationsController = require("../controllers/productEvaluationsController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", productEvaluationsController.getProductEvaluations);
router.get("/:id", productEvaluationsController.getProductEvaluationById);
router.post("/", authorizeRoles("admin"), productEvaluationsController.createProductEvaluation);
router.put("/:id", authorizeRoles("admin"), productEvaluationsController.updateProductEvaluation);
router.delete("/:id", authorizeRoles("admin"), productEvaluationsController.deleteProductEvaluation);

module.exports = router;
