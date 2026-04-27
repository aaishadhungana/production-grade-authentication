const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await authService.register({ name, email, password });
  ApiResponse.created(res, "Registration successful. Please verify your email.", {
    user,
  });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const meta = {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };

  const { user, accessToken, refreshToken } = await authService.login(
    { email, password },
    meta
  );

  ApiResponse.success(res, "Login successful", {
    user,
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  });
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Get new access token via refresh token
 * @access  Public
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: rawToken } = req.body;
  const meta = {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };

  const { accessToken, refreshToken: newRefreshToken } =
    await tokenService.rotateRefreshToken(rawToken, meta);

  ApiResponse.success(res, "Tokens refreshed", {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout — revoke refresh token
 * @access  Private
 */
const logout = catchAsync(async (req, res) => {
  const { refreshToken: rawToken } = req.body;
  if (rawToken) {
    await tokenService.revokeRefreshToken(rawToken);
  }
  ApiResponse.success(res, "Logged out successfully");
});

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
const logoutAll = catchAsync(async (req, res) => {
  await tokenService.revokeAllUserTokens(req.user._id);
  ApiResponse.success(res, "Logged out from all devices");
});

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;
  await authService.verifyEmail(token);
  ApiResponse.success(res, "Email verified successfully");
});

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
const resendVerification = catchAsync(async (req, res) => {
  const { email } = req.body;
  const User = require("../models/user.model");
  const emailService = require("../services/email.service");

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists
    return ApiResponse.success(res, "If this email is registered, a verification link has been sent.");
  }
  if (user.isEmailVerified) {
    return ApiResponse.success(res, "Email is already verified.");
  }

  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await emailService.sendEmailVerificationEmail(user, verifyToken);

  ApiResponse.success(res, "Verification email sent. Please check your inbox.");
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  // Always return 200 — prevents email enumeration
  ApiResponse.success(
    res,
    "If an account with that email exists, a reset link has been sent."
  );
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  ApiResponse.success(
    res,
    "Password reset successful. Please log in with your new password."
  );
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  ApiResponse.success(res, "Password changed successfully. Please log in again.");
});

// ─── OAuth Callbacks ──────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback — redirects with tokens
 * @access  Public
 */
const googleCallback = catchAsync(async (req, res) => {
  const meta = { userAgent: req.headers["user-agent"], ipAddress: req.ip };
  const { accessToken, refreshToken } = await authService.oauthLogin(req.user, meta);

  // Redirect to frontend with tokens as query params
  // In production, use a more secure approach (e.g., short-lived code exchange)
  const redirectUrl = `${process.env.CLIENT_URL}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  res.redirect(redirectUrl);
});

/**
 * @route   GET /api/v1/auth/github/callback
 * @desc    GitHub OAuth callback — redirects with tokens
 * @access  Public
 */
const githubCallback = catchAsync(async (req, res) => {
  const meta = { userAgent: req.headers["user-agent"], ipAddress: req.ip };
  const { accessToken, refreshToken } = await authService.oauthLogin(req.user, meta);

  const redirectUrl = `${process.env.CLIENT_URL}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  res.redirect(redirectUrl);
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  googleCallback,
  githubCallback,
};
