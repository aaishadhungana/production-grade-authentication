/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to Express error middleware
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
