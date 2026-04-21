const passport = require("passport");
const ApiError = require("../utils/ApiError");

/**
 * Protect routes — require valid JWT access token
 */
const authenticate = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      const message =
        info?.name === "TokenExpiredError"
          ? "Access token has expired"
          : info?.message || "Authentication required";
      return next(ApiError.unauthorized(message));
    }

    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Optional auth — attach user if token present, but don't block
 */
const optionalAuthenticate = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (!err && user) req.user = user;
    next();
  })(req, res, next);
};

module.exports = { authenticate, optionalAuthenticate };
