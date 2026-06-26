const { errorResponse } = require("../models/response");

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.header("x-user-role");
    const normalizedRole = typeof userRole === "string" ? userRole.toLowerCase() : "";
    const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());

    if (normalizedAllowedRoles.includes(normalizedRole)) {
      return next();
    }

    return res.status(403).json(
      errorResponse(
        "FORBIDDEN",
        "You do not have permission to perform this action."
      )
    );
  };
}

module.exports = {
  authorizeRoles
};
