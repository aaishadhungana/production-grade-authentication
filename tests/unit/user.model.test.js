/**
 * User Model — Unit Tests
 * Tests schema structure, instance methods, and virtuals
 * without needing a database connection.
 */
const bcrypt = require("bcryptjs");

// Don't mock mongoose — we need the real Schema/model to test the model properly
const User = require("../../src/models/user.model");

describe("User Model", () => {

  describe("Schema structure", () => {
    it("should export a valid Mongoose model", () => {
      expect(User).toBeDefined();
      expect(User.schema).toBeDefined();
      expect(User.schema.paths).toBeDefined();
    });

    it("should define all required paths", () => {
      const paths = User.schema.paths;
      ["name","email","password","role","isActive","isEmailVerified",
       "oauthProvider","oauthId","passwordResetToken","loginAttempts","lockUntil"
      ].forEach(p => expect(paths).toHaveProperty(p));
    });

    it("should have correct default values", () => {
      const paths = User.schema.paths;
      expect(paths.role.defaultValue).toBe("user");
      expect(paths.isActive.defaultValue).toBe(true);
      expect(paths.isEmailVerified.defaultValue).toBe(false);
      expect(paths.loginAttempts.defaultValue).toBe(0);
    });

    it("should restrict role to user/admin enum", () => {
      const roleEnum = User.schema.paths.role.enumValues;
      expect(roleEnum).toEqual(expect.arrayContaining(["user", "admin"]));
      expect(roleEnum).toHaveLength(2);
    });

    it("should restrict oauthProvider to google/github/null", () => {
      const providerEnum = User.schema.paths.oauthProvider.enumValues;
      expect(providerEnum).toContain("google");
      expect(providerEnum).toContain("github");
    });

    it("should set password.select to false (hidden by default)", () => {
      expect(User.schema.paths.password.options.select).toBe(false);
    });
  });

  describe("comparePassword()", () => {
    it("should return true for correct password", async () => {
      const hashed = await bcrypt.hash("MySecret1!", 12);
      const user = new User({ name: "A", email: "a@b.com" });
      user.password = hashed;
      expect(await user.comparePassword("MySecret1!")).toBe(true);
    });

    it("should return false for wrong password", async () => {
      const hashed = await bcrypt.hash("MySecret1!", 12);
      const user = new User({ name: "A", email: "a@b.com" });
      user.password = hashed;
      expect(await user.comparePassword("WrongPass99!")).toBe(false);
    });

    it("should return false for OAuth user with no password", async () => {
      const user = new User({ name: "A", email: "a@b.com", oauthProvider: "google" });
      expect(await user.comparePassword("anything")).toBe(false);
    });
  });

  describe("createPasswordResetToken()", () => {
    it("should return a 64-char hex raw token", () => {
      const user = new User({ name: "A", email: "a@b.com" });
      const token = user.createPasswordResetToken();
      expect(typeof token).toBe("string");
      expect(token).toHaveLength(64);
    });

    it("should store a different hashed version on the document", () => {
      const user = new User({ name: "A", email: "a@b.com" });
      const raw = user.createPasswordResetToken();
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetToken).not.toBe(raw);
    });

    it("should set expiry ~10 minutes from now", () => {
      const user = new User({ name: "A", email: "a@b.com" });
      user.createPasswordResetToken();
      const diff = user.passwordResetExpires.getTime() - Date.now();
      expect(diff).toBeGreaterThan(9 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(10 * 60 * 1000 + 1000);
    });
  });

  describe("createEmailVerificationToken()", () => {
    it("should return a 64-char hex raw token", () => {
      const user = new User({ name: "A", email: "a@b.com" });
      expect(user.createEmailVerificationToken()).toHaveLength(64);
    });

    it("should store a different hashed token", () => {
      const user = new User({ name: "A", email: "a@b.com" });
      const raw = user.createEmailVerificationToken();
      expect(user.emailVerificationToken).not.toBe(raw);
    });

    it("should set expiry ~24 hours from now", () => {
      const user = new User({ name: "A", email: "a@b.com" });
      user.createEmailVerificationToken();
      const diff = user.emailVerificationExpires.getTime() - Date.now();
      expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    });
  });

  describe("isLocked virtual", () => {
    it("should be false when lockUntil is not set", () => {
      expect(new User({ name:"A", email:"a@b.com" }).isLocked).toBe(false);
    });

    it("should be true when lockUntil is in the future", () => {
      const user = new User({ name:"A", email:"a@b.com", lockUntil: new Date(Date.now() + 60000) });
      expect(user.isLocked).toBe(true);
    });

    it("should be false when lockUntil is in the past", () => {
      const user = new User({ name:"A", email:"a@b.com", lockUntil: new Date(Date.now() - 60000) });
      expect(user.isLocked).toBe(false);
    });
  });

  describe("toJSON transform", () => {
    it("should strip sensitive fields", () => {
      const user = new User({ name:"T", email:"t@t.com" });
      user.password = "hashed";
      user.passwordResetToken = "tok";
      user.loginAttempts = 3;
      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.passwordResetToken).toBeUndefined();
      expect(json.loginAttempts).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    it("should keep public fields", () => {
      const user = new User({ name:"Test", email:"t@t.com", role:"admin" });
      const json = user.toJSON();
      expect(json.name).toBe("Test");
      expect(json.email).toBe("t@t.com");
      expect(json.role).toBe("admin");
    });
  });
});
