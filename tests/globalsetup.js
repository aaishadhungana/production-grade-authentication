module.exports = async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_ACCESS_SECRET = "test-access-secret-key-12345-abcdefghijklmno";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key-67890-pqrstuvwxyz";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.CLIENT_URL = "http://localhost:3000";
  process.env.APP_URL = "http://localhost:5000";
};
