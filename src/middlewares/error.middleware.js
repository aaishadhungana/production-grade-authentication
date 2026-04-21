const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

/**
 * 404 handler — catches unmatched routes
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

/**
 * Global error handler
 * Converts all errors to a consistent JSON response
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let error = err;

  //Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    error = ApiError.badRequest("Validation failed", errors);
  }

  //Mongoose Duplicate Key 
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = ApiError.conflict(`${field} already exists`);
  }

  //Mongoose CastError (bad ObjectId) 
  if (err.name === "CastError") {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  //JWT Errors 
  if (err.name === "JsonWebTokenError") {
    error = ApiError.unauthorized("Invalid token");
  }
  if (err.name === "TokenExpiredError") {
    error = ApiError.unauthorized("Token has expired");
  }

  //Set defaults for unhandled errors
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  //Log 5xx errors
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} >> ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
