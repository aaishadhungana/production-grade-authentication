/**
 * Generates cryptographically strong secrets for .env
 * Usage: node scripts/generateSecrets.js
 */
const crypto = require("crypto");

const generate = (bytes = 64) => crypto.randomBytes(bytes).toString("hex");

console.log("\n Generated Secrets — to copy these into the .env file:\n");
console.log(`JWT_ACCESS_SECRET=${generate()}`);
console.log(`JWT_REFRESH_SECRET=${generate()}`);
