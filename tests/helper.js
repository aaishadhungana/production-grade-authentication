const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const tokenService = require("../src/services/token.service");

/**
 * Connect to the in-memory MongoDB for tests
 */
const connectTestDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
};

/**
 * Disconnect and clear collections after tests
 */
const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

/**
 * Clear all collections between tests
 */
const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((col) => col.deleteMany({}))
  );
};

/**
 * Create a test user and return user + tokens
 */
const createTestUser = async (overrides = {}) => {
  const defaults = {
    name: "Test User",
    email: "test@example.com",
    password: "TestPass1!",
    isEmailVerified: true,
    isActive: true,
  };

  const user = await User.create({ ...defaults, ...overrides });
  const accessToken = tokenService.generateAccessToken(user._id, user.role);
  const refreshToken = await tokenService.generateRefreshToken(user._id);

  return { user, accessToken, refreshToken };
};

/**
 * Create a test admin user
 */
const createTestAdmin = async (overrides = {}) => {
  return createTestUser({ role: "admin", email: "admin@example.com", ...overrides });
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  createTestUser,
  createTestAdmin,
};
