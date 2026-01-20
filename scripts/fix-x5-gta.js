/**
 * Fix X5 GTA vehicle - restore to in-stock status after cancelled deal
 * Run with: node scripts/fix-x5-gta.js
 *
 * This script resets the X5 GTA vehicle to AVAILABLE/in_stock status
 * after its associated deal was cancelled but the vehicle wasn't updated.
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function fixVehicle() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI environment variable not set");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;

  // Find the X5 GTA vehicle
  const vehicle = await db.collection("vehicles").findOne({ regCurrent: "X5 GTA" });

  if (!vehicle) {
    console.log("Vehicle with VRM 'X5 GTA' not found.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("Found vehicle:", vehicle.regCurrent);
  console.log("Current status:", vehicle.status);
  console.log("Current salesStatus:", vehicle.salesStatus);
  console.log("soldDealId:", vehicle.soldDealId);

  if (vehicle.salesStatus === "AVAILABLE" && vehicle.status === "in_stock") {
    console.log("\nVehicle is already in stock. No changes needed.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Update the vehicle to restore it to in-stock
  const result = await db.collection("vehicles").updateOne(
    { regCurrent: "X5 GTA" },
    {
      $set: { salesStatus: "AVAILABLE", status: "in_stock" },
      $unset: { soldDealId: 1, soldAt: 1 }
    }
  );

  if (result.modifiedCount > 0) {
    console.log("\nVehicle updated successfully!");
    console.log("- salesStatus set to: AVAILABLE");
    console.log("- status set to: in_stock");
    console.log("- soldDealId and soldAt cleared");
  } else {
    console.log("\nNo changes made.");
  }

  await mongoose.disconnect();
}

fixVehicle().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
