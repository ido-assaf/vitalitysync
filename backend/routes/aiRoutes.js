const express = require("express");
const aiController = require("../controllers/aiController");

const router = express.Router();

router.post("/product-evaluations/generate", aiController.generateProductEvaluation);

module.exports = router;
