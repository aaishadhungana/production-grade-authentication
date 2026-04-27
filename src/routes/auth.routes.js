const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  authLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
} = require("../middlewares/rateLimiter.middleware");
const {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
  refreshTokenRules,
} = require("../validators/auth.validator");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and token management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass1!
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post("/register", authLimiter, registerRules, validate, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns tokens
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */
router.post("/login", authLimiter, loginRules, validate, authController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh-token", refreshTokenRules, validate, authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout (revoke refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: All sessions revoked
 */
router.post("/logout-all", authenticate, authController.logoutAll);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify email with token from email link
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-email/:token", authController.verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent (if registered)
 */
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  authController.resendVerification
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent (if registered)
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPasswordRules,
  validate,
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  "/reset-password",
  resetPasswordRules,
  validate,
  authController.resetPassword
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password (authenticated users)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Wrong current password
 */
router.post(
  "/change-password",
  authenticate,
  changePasswordRules,
  validate,
  authController.changePassword
);

// ─── OAuth Routes ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to client with tokens
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/api/v1/auth/oauth-failure" }),
  authController.googleCallback
);

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to GitHub
 */
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to client with tokens
 */
router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/api/v1/auth/oauth-failure" }),
  authController.githubCallback
);

router.get("/oauth-failure", (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
});

module.exports = router;
