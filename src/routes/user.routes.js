const express = require("express");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const {
  validate,
  updateProfileRules,
  updateRoleRules,
  userIdParamRules,
} = require("../validators/user.validator");

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and admin user management
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get("/me", userController.getMe);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 */
router.patch("/me", updateProfileRules, validate, userController.updateMe);

/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Deactivate own account
 *     tags: [Users]
 *     responses:
 *       204:
 *         description: Account deactivated
 */
router.delete("/me", userController.deleteMe);

// ─── Admin-only Routes ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Forbidden
 */
router.get("/", authorize("admin"), userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get("/:id", authorize("admin"), userIdParamRules, validate, userController.getUserById);

/**
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     summary: Update user role (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
  "/:id/role",
  authorize("admin"),
  updateRoleRules,
  validate,
  userController.updateUserRole
);

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Activate/deactivate user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/status",
  authorize("admin"),
  userIdParamRules,
  validate,
  userController.updateUserStatus
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Hard delete user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  authorize("admin"),
  userIdParamRules,
  validate,
  userController.deleteUser
);

module.exports = router;
