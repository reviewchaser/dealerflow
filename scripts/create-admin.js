/**
 * Create SUPER_ADMIN account
 * Run with: node scripts/create-admin.js
 */

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = "george@hgpropertygroup.co.uk";
const ADMIN_PASSWORD = "NeSyY6B079,!123";

async function createAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI environment variable not set");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;

  // Hash password using same method as User model
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  // Upsert admin user
  const result = await db.collection("users").findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        name: "Admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log("Admin account created/updated:", ADMIN_EMAIL);
  console.log("Role:", result.role);

  await mongoose.disconnect();
  console.log("\nDone! You can now log in at /admin");
}

createAdmin().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
