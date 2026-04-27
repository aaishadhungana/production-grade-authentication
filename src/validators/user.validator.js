const { body, param } = require("express-validator");
const { validate } = require("./auth.validator");

const updateProfileRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Provide a valid email address")
    .normalizeEmail(),
];

const updateRoleRules = [
  param("id")
    .notEmpty().withMessage("User ID is required")
    .isMongoId().withMessage("Invalid user ID format"),

  body("role")
    .notEmpty().withMessage("Role is required")
    .isIn(["user", "admin"]).withMessage("Role must be 'user' or 'admin'"),
];

const userIdParamRules = [
  param("id")
    .notEmpty().withMessage("User ID is required")
    .isMongoId().withMessage("Invalid user ID format"),
];

module.exports = { validate, updateProfileRules, updateRoleRules, userIdParamRules };
