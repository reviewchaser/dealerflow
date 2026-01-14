/**
 * Clear all deals from the database
 * Run with: node scripts/clear-deals.js
 *
 * This script removes all Deal documents and resets vehicle salesStatus.
 * Use this if deal schema has changed and you need to start fresh.
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function clearDeals() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI environment variable not set");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;

  // Count existing deals
  const dealCount = await db.collection("deals").countDocuments();
  console.log(`Found ${dealCount} deal(s) in database.`);

  if (dealCount === 0) {
    console.log("No deals to clear.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Confirm
  console.log("\n⚠️  This will DELETE ALL DEALS permanently!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete all deals
  const deleteResult = await db.collection("deals").deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} deal(s).`);

  // Reset vehicle salesStatus for any vehicles that were IN_DEAL
  const vehicleResult = await db.collection("vehicles").updateMany(
    { salesStatus: { $in: ["IN_DEAL", "SOLD_IN_PROGRESS"] } },
    { $set: { salesStatus: "AVAILABLE" } }
  );
  console.log(`Reset ${vehicleResult.modifiedCount} vehicle(s) to AVAILABLE status.`);

  // Delete any related sales documents
  const salesDocResult = await db.collection("salesdocuments").deleteMany({});
  if (salesDocResult.deletedCount > 0) {
    console.log(`Deleted ${salesDocResult.deletedCount} sales document(s).`);
  }

  console.log("\n✓ Done! Deals cleared successfully.");
  await mongoose.disconnect();
}

clearDeals().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
