const rateLimit = require("express-rate-limit");
const ApiError = require("../utils/ApiError");

const rateLimitHandler = (req, res, next) => {
  next(ApiError.tooManyRequests("Too many requests, please try again later."));
};

/**
 * Global limiter — applied to all /api routes
 * 100 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Strict limiter for auth endpoints (login/register)
 * 10 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  handler: rateLimitHandler,
});

/**
 * Very strict limiter for password reset
 * 5 attempts per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Email verification resend limiter
 * 3 per hour per IP
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
};
