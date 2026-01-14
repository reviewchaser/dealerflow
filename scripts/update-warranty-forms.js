/**
 * Migration script to update existing WARRANTY_CLAIM forms
 * to match the new template (Aftersales Issue)
 *
 * Run with: node scripts/update-warranty-forms.js
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

async function updateWarrantyForms() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const Form = mongoose.connection.collection("forms");

  // Find all WARRANTY_CLAIM forms
  const warrantyForms = await Form.find({ type: "WARRANTY_CLAIM" }).toArray();
  console.log(`Found ${warrantyForms.length} warranty forms to update`);

  if (warrantyForms.length === 0) {
    console.log("No warranty forms found. Exiting.");
    await mongoose.disconnect();
    return;
  }

  // Update each form
  let updated = 0;
  for (const form of warrantyForms) {
    const updateFields = {};

    // Update name if it's the old value
    if (form.name !== "Aftersales Issue") {
      updateFields.name = "Aftersales Issue";
    }

    // Update publicSlug if it's the old value
    if (form.publicSlug && form.publicSlug !== "aftersales-issue") {
      updateFields.publicSlug = "aftersales-issue";
    }

    // Only update if there are changes
    if (Object.keys(updateFields).length > 0) {
      await Form.updateOne(
        { _id: form._id },
        { $set: updateFields }
      );
      console.log(`Updated form ${form._id}: ${JSON.stringify(updateFields)}`);
      updated++;
    } else {
      console.log(`Form ${form._id} already up to date`);
    }
  }

  console.log(`\nUpdated ${updated} of ${warrantyForms.length} warranty forms`);
  await mongoose.disconnect();
  console.log("Done.");
}

updateWarrantyForms().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
