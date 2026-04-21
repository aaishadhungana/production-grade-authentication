const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Token = require("../models/token.model");
const ApiError = require("../utils/ApiError");

/**
 * Generate a signed JWT access token (short-lived)
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { sub: userId, role, type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
};

/**
 * Generate a random refresh token and persist it to DB
 */
const generateRefreshToken = async (userId, { userAgent, ipAddress } = {}) => {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(
    Date.now() +
      parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || "7d")
  );

  await Token.create({ user: userId, token, expiresAt, userAgent, ipAddress });

  return token;
};

/**
 * Verify & rotate a refresh token:
 * - Finds the token in DB
 * - Validates it (not revoked, not expired)
 * - Revokes the old token (rotation)
 * - Issues a new refresh token
 */
const rotateRefreshToken = async (rawToken, { userAgent, ipAddress } = {}) => {
  const tokenDoc = await Token.findOne({ token: rawToken }).populate("user");

  if (!tokenDoc) throw ApiError.unauthorized("Invalid refresh token");
  if (!tokenDoc.isValid()) {
    // If already used/revoked → possible token theft; revoke all user tokens
    if (tokenDoc.isRevoked) {
      await Token.updateMany(
        { user: tokenDoc.user._id, isRevoked: false },
        { isRevoked: true }
      );
      throw ApiError.unauthorized(
        "Refresh token reuse detected. All sessions have been revoked."
      );
    }
    throw ApiError.unauthorized("Refresh token has expired. Please log in again.");
  }

  // Revoke old token (rotation)
  tokenDoc.isRevoked = true;
  await tokenDoc.save();

  // Issue new pair
  const newRefreshToken = await generateRefreshToken(tokenDoc.user._id, {
    userAgent,
    ipAddress,
  });
  const newAccessToken = generateAccessToken(tokenDoc.user._id, tokenDoc.user.role);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: tokenDoc.user,
  };
};

/**
 * Revoke a single refresh token (logout)
 */
const revokeRefreshToken = async (rawToken) => {
  const tokenDoc = await Token.findOneAndUpdate(
    { token: rawToken },
    { isRevoked: true }
  );
  if (!tokenDoc) throw ApiError.badRequest("Token not found");
};

/**
 * Revoke ALL refresh tokens for a user (logout everywhere)
 */
const revokeAllUserTokens = async (userId) => {
  await Token.updateMany({ user: userId, isRevoked: false }, { isRevoked: true });
};

/**
 * Helper: Parse duration string like "7d", "24h", "15m" to milliseconds
 */
const parseDurationToMs = (duration) => {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000; // default 7 days
  return parseInt(match[1]) * units[match[2]];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
