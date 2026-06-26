const express = require("express");
const { User } = require("../models");
const { successResponse } = require("../models/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const coaches = await User.findAll({
      where: { userRole: "coach" },
      attributes: ["userId", "firstName", "lastName", "coachSpecialty", "coachBio"],
      order: [["lastName", "ASC"], ["firstName", "ASC"]]
    });

    return res.status(200).json(successResponse(coaches));
  })
);

module.exports = router;
