const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["refresh"],
      default: "refresh",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    // Security: track where token was issued
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
tokenSchema.index({ token: 1 });
tokenSchema.index({ user: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-delete expired tokens

// ─── Method: Check if expired ─────────────────────────────────────────────────
tokenSchema.methods.isExpired = function () {
  return Date.now() >= this.expiresAt.getTime();
};

// ─── Method: Check if valid ───────────────────────────────────────────────────
tokenSchema.methods.isValid = function () {
  return !this.isRevoked && !this.isExpired();
};

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
