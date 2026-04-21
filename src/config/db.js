const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/auth_system";

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  mongoose.connection.on("connected", () =>
    logger.info("MongoDB connected successfully")
  );
  mongoose.connection.on("error", (err) =>
    logger.error(`MongoDB connection error: ${err.message}`)
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected. Retrying...")
  );

  await mongoose.connect(uri, options);
};

module.exports = connectDB;
