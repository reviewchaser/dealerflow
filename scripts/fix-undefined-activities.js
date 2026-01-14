/**
 * One-time script to fix activity log descriptions that contain "on undefined"
 * Run with: node scripts/fix-undefined-activities.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function fixActivities() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("activitylogs");

    // Find all records with "on undefined" in description
    const badRecords = await collection.find({
      description: { $regex: /on undefined/i }
    }).toArray();

    console.log(`Found ${badRecords.length} records with 'on undefined'`);

    if (badRecords.length === 0) {
      console.log("No records to fix!");
      process.exit(0);
    }

    // Update each record to remove "on undefined"
    let updated = 0;
    for (const record of badRecords) {
      const newDescription = record.description.replace(/ on undefined/gi, "");
      await collection.updateOne(
        { _id: record._id },
        { $set: { description: newDescription } }
      );
      updated++;
      console.log(`Fixed: "${record.description}" -> "${newDescription}"`);
    }

    console.log(`\nSuccessfully updated ${updated} records`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixActivities();
