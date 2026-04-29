/**
 * Auth Routes — Integration tests using mocked services
 * Tests the full HTTP layer: routing → middleware → controller → response
 */

// ─── Service Mocks ────────────────────────────────────────────────────────────
jest.mock("../../src/config/db", () => jest.fn().mockResolvedValue(true));
jest.mock("../../src/config/passport", () => {});
jest.mock("../../src/services/auth.service");
jest.mock("../../src/services/token.service");

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const authService = require("../../src/services/auth.service");
const tokenService = require("../../src/services/token.service");

const api = request(app);
const BASE = "/api/v1/auth";

const fakeUser = {
  _id: new mongoose.Types.ObjectId().toString(),
  name: "Test User",
  email: "test@example.com",
  role: "user",
  isEmailVerified: true,
  isActive: true,
};
const fakeTokens = {
  accessToken: "fake.access.token",
  refreshToken: "fake-refresh-token-abc",
  expiresIn: 900,
};

beforeEach(() => jest.clearAllMocks());

describe("Auth Routes — HTTP Layer", () => {

  // ─── POST /register ─────────────────────────────────────────────────────────
  describe("POST /auth/register", () => {
    it("201 — successful registration", async () => {
      authService.register.mockResolvedValueOnce(fakeUser);
      const res = await api.post(`${BASE}/register`).send({
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass1!",
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(authService.register).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass1!",
      });
    });

    it("400 — missing name field", async () => {
      const res = await api.post(`${BASE}/register`).send({
        email: "test@example.com",
        password: "SecurePass1!",
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.field === "name")).toBe(true);
    });

    it("400 — invalid email format", async () => {
      const res = await api.post(`${BASE}/register`).send({
        name: "Test",
        email: "not-an-email",
        password: "SecurePass1!",
      });
      expect(res.status).toBe(400);
    });

    it("400 — weak password (no uppercase)", async () => {
      const res = await api.post(`${BASE}/register`).send({
        name: "Test",
        email: "test@example.com",
        password: "weakpassword1!",
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.field === "password")).toBe(true);
    });

    it("409 — duplicate email (service throws conflict)", async () => {
      const { default: ApiError } = await import("../../src/utils/ApiError.js").catch(
        () => ({ default: require("../../src/utils/ApiError") })
      );
      authService.register.mockRejectedValueOnce(ApiError.conflict("Email is already registered"));
      const res = await api.post(`${BASE}/register`).send({
        name: "Test", email: "test@example.com", password: "SecurePass1!",
      });
      expect(res.status).toBe(409);
    });

    it("does not call service when validation fails", async () => {
      await api.post(`${BASE}/register`).send({ email: "bad" });
      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  // ─── POST /login ─────────────────────────────────────────────────────────────
  describe("POST /auth/login", () => {
    it("200 — returns tokens on success", async () => {
      authService.login.mockResolvedValueOnce({ user: fakeUser, ...fakeTokens });
      const res = await api.post(`${BASE}/login`).send({
        email: "test@example.com",
        password: "SecurePass1!",
      });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe("fake.access.token");
      expect(res.body.data.refreshToken).toBe("fake-refresh-token-abc");
    });

    it("401 — wrong credentials", async () => {
      const ApiError = require("../../src/utils/ApiError");
      authService.login.mockRejectedValueOnce(ApiError.unauthorized("Invalid email or password"));
      const res = await api.post(`${BASE}/login`).send({
        email: "test@example.com",
        password: "WrongPass1!",
      });
      expect(res.status).toBe(401);
    });

    it("400 — missing password", async () => {
      const res = await api.post(`${BASE}/login`).send({ email: "test@example.com" });
      expect(res.status).toBe(400);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it("400 — missing email", async () => {
      const res = await api.post(`${BASE}/login`).send({ password: "SecurePass1!" });
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /refresh-token ──────────────────────────────────────────────────────
  describe("POST /auth/refresh-token", () => {
    it("200 — returns new token pair", async () => {
      tokenService.rotateRefreshToken.mockResolvedValueOnce({
        accessToken: "new.access.token",
        refreshToken: "new-refresh-token",
      });
      const res = await api.post(`${BASE}/refresh-token`).send({
        refreshToken: "old-refresh-token",
      });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe("new.access.token");
      expect(res.body.data.refreshToken).toBe("new-refresh-token");
    });

    it("401 — invalid token", async () => {
      const ApiError = require("../../src/utils/ApiError");
      tokenService.rotateRefreshToken.mockRejectedValueOnce(
        ApiError.unauthorized("Invalid refresh token")
      );
      const res = await api.post(`${BASE}/refresh-token`).send({ refreshToken: "bad" });
      expect(res.status).toBe(401);
    });

    it("400 — missing refreshToken field", async () => {
      const res = await api.post(`${BASE}/refresh-token`).send({});
      expect(res.status).toBe(400);
      expect(tokenService.rotateRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ─── POST /forgot-password ────────────────────────────────────────────────────
  describe("POST /auth/forgot-password", () => {
    it("200 — always returns success (prevents enumeration)", async () => {
      authService.forgotPassword.mockResolvedValueOnce(undefined);
      const res = await api.post(`${BASE}/forgot-password`).send({
        email: "anyone@example.com",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("400 — invalid email format", async () => {
      const res = await api.post(`${BASE}/forgot-password`).send({ email: "bademail" });
      expect(res.status).toBe(400);
      expect(authService.forgotPassword).not.toHaveBeenCalled();
    });
  });

  // ─── POST /reset-password ─────────────────────────────────────────────────────
  describe("POST /auth/reset-password", () => {
    it("200 — successful reset", async () => {
      authService.resetPassword.mockResolvedValueOnce(fakeUser);
      const res = await api.post(`${BASE}/reset-password`).send({
        token: "valid-reset-token",
        password: "NewSecure1!",
      });
      expect(res.status).toBe(200);
      expect(authService.resetPassword).toHaveBeenCalledWith("valid-reset-token", "NewSecure1!");
    });

    it("400 — invalid/expired token", async () => {
      const ApiError = require("../../src/utils/ApiError");
      authService.resetPassword.mockRejectedValueOnce(
        ApiError.badRequest("Token is invalid or has expired")
      );
      const res = await api.post(`${BASE}/reset-password`).send({
        token: "expired",
        password: "NewSecure1!",
      });
      expect(res.status).toBe(400);
    });

    it("400 — missing token field", async () => {
      const res = await api.post(`${BASE}/reset-password`).send({ password: "NewSecure1!" });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /verify-email/:token ─────────────────────────────────────────────────
  describe("GET /auth/verify-email/:token", () => {
    it("200 — successfully verifies email", async () => {
      authService.verifyEmail.mockResolvedValueOnce(fakeUser);
      const res = await api.get(`${BASE}/verify-email/some-valid-token`);
      expect(res.status).toBe(200);
      expect(authService.verifyEmail).toHaveBeenCalledWith("some-valid-token");
    });

    it("400 — invalid token", async () => {
      const ApiError = require("../../src/utils/ApiError");
      authService.verifyEmail.mockRejectedValueOnce(
        ApiError.badRequest("Token is invalid or has expired")
      );
      const res = await api.get(`${BASE}/verify-email/badtoken`);
      expect(res.status).toBe(400);
    });
  });

  // ─── Health check ─────────────────────────────────────────────────────────────
  describe("GET /health", () => {
    it("200 — returns health status", async () => {
      const res = await api.get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  // ─── 404 handler ─────────────────────────────────────────────────────────────
  describe("Unknown routes", () => {
    it("404 — returns error for unknown routes", async () => {
      const res = await api.get("/api/v1/does-not-exist");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
