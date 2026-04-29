// MongoDB initialization script — runs on first container start
db = db.getSiblingDB("auth_system");

// Create collections with validators
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email"],
      properties: {
        name: { bsonType: "string" },
        email: { bsonType: "string" },
      },
    },
  },
});

db.createCollection("tokens");

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ oauthProvider: 1, oauthId: 1 });
db.tokens.createIndex({ token: 1 }, { unique: true });
db.tokens.createIndex({ user: 1 });
db.tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print("✅ MongoDB initialized successfully");
