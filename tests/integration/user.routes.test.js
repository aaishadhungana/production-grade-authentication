/**
 * User Routes — Integration tests
 * Mocks at the service/DB level, tests full HTTP request/response cycle
 */
jest.mock("../../src/config/db", () => jest.fn().mockResolvedValue(true));

const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// ─── We must set up passport AFTER env vars are set ──────────────────────────
// Mock the passport config to register only the JWT strategy using our test secret
jest.mock("../../src/config/passport", () => {
  const passport = require("passport");
  const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
  const User = require("../../src/models/user.model");

  passport.use(
    "jwt",
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_ACCESS_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload.sub).select("-password");
          if (!user || !user.isActive) return done(null, false);
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );
});

const app = require("../../src/app");
const User = require("../../src/models/user.model");

const api = request(app);
const BASE = "/api/v1/users";

const userId  = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();

const makeToken = (role, id) =>
  jwt.sign({ sub: id.toString(), role, type: "access" }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });

const fakeUser  = { _id: userId,  name: "User",  email: "user@example.com",  role: "user",  isActive: true };
const fakeAdmin = { _id: adminId, name: "Admin", email: "admin@example.com", role: "admin", isActive: true };

// Helper: mock User.findById for passport auth (returns based on which id is requested)
const mockAuth = (requester = fakeUser) => {
  jest.spyOn(User, "findById").mockImplementation((id) => ({
    select: jest.fn().mockResolvedValue(
      id.toString() === adminId.toString() ? fakeAdmin : fakeUser
    ),
  }));
};

beforeEach(() => jest.restoreAllMocks());

describe("User Routes — HTTP Layer", () => {

  describe("GET /users/me", () => {
    it("200 — returns profile for authenticated user", async () => {
      mockAuth(fakeUser);
      const res = await api
        .get(`${BASE}/me`)
        .set("Authorization", `Bearer ${makeToken("user", userId)}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("401 — no token provided", async () => {
      const res = await api.get(`${BASE}/me`);
      expect(res.status).toBe(401);
    });

    it("401 — malformed Bearer token", async () => {
      const res = await api.get(`${BASE}/me`).set("Authorization", "Bearer not.valid.jwt");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /users/me", () => {
    it("200 — successfully updates name", async () => {
      mockAuth(fakeUser);
      jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({ ...fakeUser, name: "Updated" });

      const res = await api
        .patch(`${BASE}/me`)
        .set("Authorization", `Bearer ${makeToken("user", userId)}`)
        .send({ name: "Updated" });
      expect(res.status).toBe(200);
    });

    it("400 — name too short (< 2 chars)", async () => {
      mockAuth(fakeUser);
      const res = await api
        .patch(`${BASE}/me`)
        .set("Authorization", `Bearer ${makeToken("user", userId)}`)
        .send({ name: "X" });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe("name");
    });

    it("401 — unauthenticated request", async () => {
      const res = await api.patch(`${BASE}/me`).send({ name: "Test" });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /users/me", () => {
    it("204 — soft-deletes own account", async () => {
      mockAuth(fakeUser);
      jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({ ...fakeUser, isActive: false });

      const res = await api
        .delete(`${BASE}/me`)
        .set("Authorization", `Bearer ${makeToken("user", userId)}`);
      expect(res.status).toBe(204);
    });
  });

  describe("GET /users (admin only)", () => {
    it("200 — admin gets paginated user list", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "find").mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([fakeUser]),
      });
      jest.spyOn(User, "countDocuments").mockResolvedValue(1);

      const res = await api
        .get(`${BASE}?page=1&limit=10`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(200);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it("403 — regular user is forbidden", async () => {
      mockAuth(fakeUser);
      const res = await api.get(BASE).set("Authorization", `Bearer ${makeToken("user", userId)}`);
      expect(res.status).toBe(403);
    });

    it("401 — unauthenticated request", async () => {
      const res = await api.get(BASE);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /users/:id (admin only)", () => {
    it("200 — admin fetches user by ID", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "findById").mockImplementationOnce(() => ({
        select: jest.fn().mockResolvedValue(fakeAdmin),         // passport auth
      })).mockResolvedValueOnce(fakeUser);                        // controller lookup

      const res = await api
        .get(`${BASE}/${userId}`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(200);
    });

    it("400 — invalid ObjectId format", async () => {
      mockAuth(fakeAdmin);
      const res = await api
        .get(`${BASE}/not-a-valid-id`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(400);
    });

    it("404 — user not found", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "findById")
        .mockImplementationOnce(() => ({ select: jest.fn().mockResolvedValue(fakeAdmin) }))
        .mockResolvedValueOnce(null);

      const ghost = new mongoose.Types.ObjectId();
      const res = await api
        .get(`${BASE}/${ghost}`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /users/:id/role (admin only)", () => {
    it("200 — admin promotes user to admin", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({ ...fakeUser, role: "admin" });

      const res = await api
        .patch(`${BASE}/${userId}/role`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`)
        .send({ role: "admin" });
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe("admin");
    });

    it("400 — invalid role value", async () => {
      mockAuth(fakeAdmin);
      const res = await api
        .patch(`${BASE}/${userId}/role`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`)
        .send({ role: "superadmin" });
      expect(res.status).toBe(400);
    });

    it("400 — admin cannot change their own role", async () => {
      mockAuth(fakeAdmin);
      const res = await api
        .patch(`${BASE}/${adminId}/role`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`)
        .send({ role: "user" });
      expect(res.status).toBe(400);
    });

    it("403 — non-admin is forbidden", async () => {
      mockAuth(fakeUser);
      const res = await api
        .patch(`${BASE}/${userId}/role`)
        .set("Authorization", `Bearer ${makeToken("user", userId)}`)
        .send({ role: "admin" });
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /users/:id/status (admin only)", () => {
    it("200 — admin deactivates a user", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({ ...fakeUser, isActive: false });

      const res = await api
        .patch(`${BASE}/${userId}/status`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`)
        .send({ isActive: false });
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /users/:id (admin only)", () => {
    it("204 — admin hard-deletes a user", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "findByIdAndDelete").mockResolvedValue(fakeUser);

      const res = await api
        .delete(`${BASE}/${userId}`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(204);
    });

    it("400 — admin cannot delete their own account", async () => {
      mockAuth(fakeAdmin);
      const res = await api
        .delete(`${BASE}/${adminId}`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(400);
    });

    it("403 — regular user is forbidden", async () => {
      mockAuth(fakeUser);
      const res = await api
        .delete(`${BASE}/${userId}`)
        .set("Authorization", `Bearer ${makeToken("user", userId)}`);
      expect(res.status).toBe(403);
    });

    it("404 — user not found", async () => {
      mockAuth(fakeAdmin);
      jest.spyOn(User, "findByIdAndDelete").mockResolvedValue(null);

      const ghost = new mongoose.Types.ObjectId();
      const res = await api
        .delete(`${BASE}/${ghost}`)
        .set("Authorization", `Bearer ${makeToken("admin", adminId)}`);
      expect(res.status).toBe(404);
    });
  });
});
