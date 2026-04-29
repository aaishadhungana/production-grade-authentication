/**
 * Seed Script — creates a default admin user
 * Usage: node scripts/seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/user.model");

const ADMIN = {
  name: "Super Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin@123456",
  role: "admin",
  isEmailVerified: true,
  isActive: true,
};

const seed = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/auth_system"
    );
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log(`  Admin user already exists: ${ADMIN.email}`);
      process.exit(0);
    }

    await User.create(ADMIN);
    console.log(`Admin user created:`);
    console.log(`   Email:    ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log(`\n  IMPORTANT: Change this password immediately after first login!`);
  } catch (err) {
    console.error(` Seed failed: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

seed();
