/**
 * Backfill stock numbers for existing vehicles
 * Run with: node scripts/backfill-stock-numbers.js
 *
 * This script finds all STOCK vehicles without a stock number
 * and assigns them sequential numbers based on dealer settings.
 * Vehicles are processed oldest first (by createdAt).
 */

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function backfillStockNumbers() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI environment variable not set");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.\n");

  const db = mongoose.connection.db;

  // Find ALL vehicles without a stock number, sorted by createdAt (oldest first)
  // This includes in-stock, ex-stock, sold, delivered, etc.
  const vehicles = await db.collection("vehicles")
    .find({
      $or: [
        { stockNumber: null },
        { stockNumber: { $exists: false } },
        { stockNumber: "" }
      ]
    })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Found ${vehicles.length} vehicle(s) without stock numbers.\n`);

  if (vehicles.length === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Group vehicles by dealerId
  const vehiclesByDealer = {};
  for (const v of vehicles) {
    const dealerId = v.dealerId.toString();
    if (!vehiclesByDealer[dealerId]) {
      vehiclesByDealer[dealerId] = [];
    }
    vehiclesByDealer[dealerId].push(v);
  }

  console.log(`Processing ${Object.keys(vehiclesByDealer).length} dealer(s)...\n`);

  let totalUpdated = 0;

  // Process each dealer
  for (const dealerId of Object.keys(vehiclesByDealer)) {
    const dealerVehicles = vehiclesByDealer[dealerId];

    // Get dealer settings
    const dealer = await db.collection("dealers").findOne({ _id: new mongoose.Types.ObjectId(dealerId) });
    if (!dealer) {
      console.log(`  Skipping dealer ${dealerId}: not found`);
      continue;
    }

    console.log(`Dealer: ${dealer.name || dealerId}`);
    console.log(`  Vehicles to process: ${dealerVehicles.length}`);

    // Get current counter
    let nextNumber = dealer.salesSettings?.nextStockNumber || 1;
    const prefix = dealer.salesSettings?.stockNumberPrefix || "";

    console.log(`  Current counter: ${nextNumber}, Prefix: "${prefix}"`);

    // Assign stock numbers
    for (const vehicle of dealerVehicles) {
      const stockNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

      await db.collection("vehicles").updateOne(
        { _id: vehicle._id },
        { $set: { stockNumber } }
      );

      console.log(`    ${vehicle.regCurrent || "NO VRM"} -> ${stockNumber}`);
      nextNumber++;
      totalUpdated++;
    }

    // Update dealer's next stock number
    await db.collection("dealers").updateOne(
      { _id: new mongoose.Types.ObjectId(dealerId) },
      { $set: { "salesSettings.nextStockNumber": nextNumber } }
    );

    console.log(`  Updated dealer counter to: ${nextNumber}\n`);
  }

  console.log(`\n✓ Done! Assigned stock numbers to ${totalUpdated} vehicle(s).`);
  await mongoose.disconnect();
}

backfillStockNumbers().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
