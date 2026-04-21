const ApiError = require("../utils/ApiError");

/**
 * Authorize by role(s)
 * Usage: authorize("admin") or authorize("admin", "moderator")
 * Must be used AFTER authenticate middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

module.exports = { authorize };
