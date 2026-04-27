const User = require("../models/user.model");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current authenticated user's profile
 * @access  Private
 */
const getMe = catchAsync(async (req, res) => {
  ApiResponse.success(res, "Profile fetched", { user: req.user });
});

/**
 * @route   PATCH /api/v1/users/me
 * @desc    Update current user's profile
 * @access  Private
 */
const updateMe = catchAsync(async (req, res) => {
  // Disallow role/password update through this route
  const FORBIDDEN_FIELDS = ["password", "role", "isActive", "isEmailVerified"];
  FORBIDDEN_FIELDS.forEach((field) => delete req.body[field]);

  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  });

  ApiResponse.success(res, "Profile updated", { user });
});

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Deactivate (soft-delete) own account
 * @access  Private
 */
const deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  ApiResponse.noContent(res);
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin)
 * @access  Admin
 */
const getAllUsers = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.role)     filter.role     = req.query.role;
  if (req.query.isActive) filter.isActive = req.query.isActive === "true";

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort("-createdAt"),
    User.countDocuments(filter),
  ]);

  ApiResponse.success(res, "Users fetched", {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (admin)
 * @access  Admin
 */
const getUserById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  ApiResponse.success(res, "User fetched", { user });
});

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user's role (admin)
 * @access  Admin
 */
const updateUserRole = catchAsync(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    throw ApiError.badRequest("Admins cannot change their own role");
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true, runValidators: true }
  );

  if (!user) throw ApiError.notFound("User not found");
  ApiResponse.success(res, `User role updated to '${req.body.role}'`, { user });
});

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Activate / deactivate user (admin)
 * @access  Admin
 */
const updateUserStatus = catchAsync(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    throw ApiError.badRequest("Admins cannot deactivate their own account");
  }

  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  );

  if (!user) throw ApiError.notFound("User not found");
  ApiResponse.success(res, `User ${isActive ? "activated" : "deactivated"}`, { user });
});

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Hard delete user (admin)
 * @access  Admin
 */
const deleteUser = catchAsync(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    throw ApiError.badRequest("Admins cannot delete their own account");
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  ApiResponse.noContent(res);
});

module.exports = {
  getMe,
  updateMe,
  deleteMe,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
