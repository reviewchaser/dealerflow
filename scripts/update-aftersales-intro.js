/**
 * Update Aftersales Issue Form Intro Text
 *
 * Updates the introText field for all WARRANTY_CLAIM forms in the database
 * to match the updated template text.
 *
 * Usage:
 *   node scripts/update-aftersales-intro.js
 */

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

async function updateIntroText() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const newIntroText = `Please fill out the form below in as much detail as possible. For warranty related issues for more information about what is and isn't covered please refer to your warranty information

Please allow up to 48 hours for a response.`;

    // Find all WARRANTY_CLAIM forms first to show what will be updated
    const forms = await mongoose.connection.db
      .collection("forms")
      .find({ type: "WARRANTY_CLAIM" })
      .toArray();

    console.log(`Found ${forms.length} WARRANTY_CLAIM form(s)`);

    if (forms.length === 0) {
      console.log("No forms to update.");
      await mongoose.disconnect();
      return;
    }

    // Show current intro text for first form
    if (forms[0].introText) {
      console.log("\nCurrent introText (first form):");
      console.log("─".repeat(50));
      console.log(forms[0].introText);
      console.log("─".repeat(50));
    }

    // Update all WARRANTY_CLAIM forms
    const result = await mongoose.connection.db.collection("forms").updateMany(
      { type: "WARRANTY_CLAIM" },
      { $set: { introText: newIntroText } }
    );

    console.log(`\nUpdated ${result.modifiedCount} form(s)`);

    console.log("\nNew introText:");
    console.log("─".repeat(50));
    console.log(newIntroText);
    console.log("─".repeat(50));

    await mongoose.disconnect();
    console.log("\nDone!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updateIntroText();
