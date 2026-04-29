const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// ─── Mock Token model ─────────────────────────────────────────────────────────
const mockTokenDoc = {
  user: null,
  token: "stored-token",
  isRevoked: false,
  expiresAt: new Date(Date.now() + 86400000),
  isRevoked: false,
  save: jest.fn().mockResolvedValue(true),
  isValid: jest.fn().mockReturnValue(true),
  isExpired: jest.fn().mockReturnValue(false),
};

jest.mock("../../src/models/token.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  updateMany: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
}));

const Token = require("../../src/models/token.model");
const tokenService = require("../../src/services/token.service");

beforeEach(() => jest.clearAllMocks());

describe("Token Service", () => {

  describe("generateAccessToken()", () => {
    it("should generate a valid signed JWT", () => {
      const userId = new mongoose.Types.ObjectId();
      const token = tokenService.generateAccessToken(userId, "user");
      expect(typeof token).toBe("string");
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      expect(decoded.sub).toBe(userId.toString());
      expect(decoded.role).toBe("user");
      expect(decoded.type).toBe("access");
    });

    it("should embed admin role correctly", () => {
      const userId = new mongoose.Types.ObjectId();
      const token = tokenService.generateAccessToken(userId, "admin");
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      expect(decoded.role).toBe("admin");
    });

    it("should be verifiable with the correct secret only", () => {
      const userId = new mongoose.Types.ObjectId();
      const token = tokenService.generateAccessToken(userId, "user");
      expect(() => jwt.verify(token, "wrong-secret")).toThrow();
    });
  });

  describe("generateRefreshToken()", () => {
    it("should call Token.create with correct fields", async () => {
      const userId = new mongoose.Types.ObjectId();
      Token.create.mockResolvedValueOnce({ token: "abc123" });

      const raw = await tokenService.generateRefreshToken(userId, {
        userAgent: "Mozilla",
        ipAddress: "127.0.0.1",
      });

      expect(Token.create).toHaveBeenCalledTimes(1);
      const createArg = Token.create.mock.calls[0][0];
      expect(createArg.user).toBe(userId);
      expect(typeof createArg.token).toBe("string");
      expect(createArg.userAgent).toBe("Mozilla");
      expect(createArg.ipAddress).toBe("127.0.0.1");
      expect(createArg.expiresAt).toBeInstanceOf(Date);
      expect(createArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should return the raw token string", async () => {
      const userId = new mongoose.Types.ObjectId();
      Token.create.mockResolvedValueOnce({});
      const raw = await tokenService.generateRefreshToken(userId);
      expect(typeof raw).toBe("string");
      expect(raw.length).toBeGreaterThan(20);
    });
  });

  describe("rotateRefreshToken()", () => {
    it("should revoke old token and return new access + refresh tokens", async () => {
      const fakeUser = {
        _id: new mongoose.Types.ObjectId(),
        role: "user",
        save: jest.fn().mockResolvedValue(true),
      };
      const doc = {
        ...mockTokenDoc,
        user: fakeUser,
        isRevoked: false,
        isValid: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Token.findOne.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue(doc),
      });
      Token.create.mockResolvedValueOnce({});

      const result = await tokenService.rotateRefreshToken("valid-raw-token");
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(doc.isRevoked).toBe(true);
      expect(doc.save).toHaveBeenCalled();
    });

    it("should throw 401 when token is not found", async () => {
      Token.findOne.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(null) });
      await expect(tokenService.rotateRefreshToken("ghost-token"))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it("should throw 401 and revoke all tokens on reuse of a revoked token", async () => {
      const userId = new mongoose.Types.ObjectId();
      const doc = {
        user: { _id: userId },
        isRevoked: true,
        isValid: jest.fn().mockReturnValue(false),
      };
      Token.findOne.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(doc) });
      Token.updateMany.mockResolvedValueOnce({});

      await expect(tokenService.rotateRefreshToken("revoked-token"))
        .rejects.toMatchObject({ statusCode: 401 });
      expect(Token.updateMany).toHaveBeenCalledWith(
        { user: userId, isRevoked: false },
        { isRevoked: true }
      );
    });

    it("should throw 401 for expired (non-revoked) token", async () => {
      const doc = {
        user: { _id: new mongoose.Types.ObjectId() },
        isRevoked: false,
        isValid: jest.fn().mockReturnValue(false),
      };
      Token.findOne.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(doc) });

      await expect(tokenService.rotateRefreshToken("expired-token"))
        .rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe("revokeRefreshToken()", () => {
    it("should call findOneAndUpdate to revoke the token", async () => {
      Token.findOneAndUpdate.mockResolvedValueOnce({ token: "abc", isRevoked: false });
      await tokenService.revokeRefreshToken("abc");
      expect(Token.findOneAndUpdate).toHaveBeenCalledWith(
        { token: "abc" },
        { isRevoked: true }
      );
    });

    it("should throw 400 if token not found", async () => {
      Token.findOneAndUpdate.mockResolvedValueOnce(null);
      await expect(tokenService.revokeRefreshToken("missing"))
        .rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe("revokeAllUserTokens()", () => {
    it("should revoke all active tokens for the user", async () => {
      const userId = new mongoose.Types.ObjectId();
      Token.updateMany.mockResolvedValueOnce({ modifiedCount: 3 });
      await tokenService.revokeAllUserTokens(userId);
      expect(Token.updateMany).toHaveBeenCalledWith(
        { user: userId, isRevoked: false },
        { isRevoked: true }
      );
    });
  });
});
