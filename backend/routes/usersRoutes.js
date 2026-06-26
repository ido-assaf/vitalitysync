const express = require("express");
const usersController = require("../controllers/usersController");
const { authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", usersController.getUsers);
router.get("/:id", usersController.getUserById);
router.post("/", authorizeRoles("admin"), usersController.createUser);
router.put("/:id", authorizeRoles("admin"), usersController.updateUser);
router.delete("/:id", authorizeRoles("admin"), usersController.deleteUser);

module.exports = router;
