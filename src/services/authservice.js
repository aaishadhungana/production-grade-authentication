const crypto = require("crypto");
const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const tokenService = require("./token.service");
const emailService = require("./email.service");

/**
 * Register a new user with email/password
 */
const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw ApiError.conflict("Email is already registered");

  const user = await User.create({ name, email, password });

  // Generate email verification token and send email
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendEmailVerificationEmail(user, verifyToken);
  } catch {
    // Don't block registration if email fails
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
  }

  return user;
};

/**
 * Login with email and password, return tokens
 */
const login = async ({ email, password }, meta = {}) => {
  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +lockUntil"
  );

  if (!user) throw ApiError.unauthorized("Invalid email or password");
  if (!user.isActive) throw ApiError.forbidden("Account has been deactivated");
  if (user.isLocked) {
    throw ApiError.forbidden(
      "Account temporarily locked due to too many failed login attempts. Try again in 30 minutes."
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = tokenService.generateAccessToken(user._id, user.role);
  const refreshToken = await tokenService.generateRefreshToken(user._id, meta);

  return { user, accessToken, refreshToken };
};

/**
 * Verify email address with token
 */
const verifyEmail = async (rawToken) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) throw ApiError.badRequest("Token is invalid or has expired");

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  await emailService.sendWelcomeEmail(user);
  return user;
};

/**
 * Send password reset email
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  // Always return success to prevent email enumeration attacks
  if (!user) return;

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.internal("Failed to send password reset email. Try again later.");
  }
};

/**
 * Reset password using the token from email
 */
const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw ApiError.badRequest("Token is invalid or has expired");

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Revoke all existing sessions for security
  await tokenService.revokeAllUserTokens(user._id);

  return user;
};

/**
 * Change password for authenticated user
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw ApiError.notFound("User not found");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.badRequest("Current password is incorrect");

  user.password = newPassword;
  await user.save();

  // Revoke all refresh tokens to force re-login on all devices
  await tokenService.revokeAllUserTokens(userId);

  return user;
};

/**
 * Handle OAuth user → generate auth tokens
 */
const oauthLogin = async (user, meta = {}) => {
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = tokenService.generateAccessToken(user._id, user.role);
  const refreshToken = await tokenService.generateRefreshToken(user._id, meta);

  return { user, accessToken, refreshToken };
};

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  oauthLogin,
};
