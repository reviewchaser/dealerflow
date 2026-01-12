/**
 * Migration Script: Add new repair location, booking, and parts fields to AftercareCase
 *
 * This script is IDEMPOTENT - safe to run multiple times.
 *
 * Changes:
 * 1. Sets repairLocationType to "WITH_CUSTOMER" where missing (vehicle starts with customer)
 * 2. Migrates old enum values (EXTERNAL_GARAGE, MOBILE_REPAIR, CUSTOMER_ARRANGE) to "THIRD_PARTY"
 * 3. Sets partsRequired to false where missing
 * 4. Sets priority to "normal" where missing
 * 5. Does NOT unset any old fields (backwards compatibility)
 *
 * Run: node scripts/migrate-aftercarecase-fields.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('Error: MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully\n');

  const collection = mongoose.connection.db.collection('aftercarecases');

  let totalModified = 0;

  // Step 1: Set default repairLocationType where missing
  // Default is WITH_CUSTOMER because new claims start with the vehicle at the customer
  console.log('Step 1: Setting default repairLocationType...');
  const missingLocationType = await collection.countDocuments({
    repairLocationType: { $exists: false }
  });
  console.log(`  Found ${missingLocationType} cases without repairLocationType`);

  if (missingLocationType > 0) {
    const result1 = await collection.updateMany(
      { repairLocationType: { $exists: false } },
      { $set: { repairLocationType: "WITH_CUSTOMER" } }
    );
    console.log(`  Set repairLocationType to "WITH_CUSTOMER" for ${result1.modifiedCount} cases`);
    totalModified += result1.modifiedCount;
  }

  // Step 2: Migrate old repairLocationType values to THIRD_PARTY
  // These were old enum values that no longer exist
  console.log('\nStep 2: Migrating old repairLocationType enum values...');
  const oldEnumValues = ["EXTERNAL_GARAGE", "MOBILE_REPAIR", "CUSTOMER_ARRANGE"];
  const withOldValues = await collection.countDocuments({
    repairLocationType: { $in: oldEnumValues }
  });
  console.log(`  Found ${withOldValues} cases with old enum values`);

  if (withOldValues > 0) {
    const result2 = await collection.updateMany(
      { repairLocationType: { $in: oldEnumValues } },
      { $set: { repairLocationType: "THIRD_PARTY" } }
    );
    console.log(`  Migrated ${result2.modifiedCount} cases to "THIRD_PARTY"`);
    totalModified += result2.modifiedCount;
  }

  // Step 3: Set default partsRequired where missing
  console.log('\nStep 3: Setting default partsRequired...');
  const missingPartsRequired = await collection.countDocuments({
    partsRequired: { $exists: false }
  });
  console.log(`  Found ${missingPartsRequired} cases without partsRequired`);

  if (missingPartsRequired > 0) {
    const result3 = await collection.updateMany(
      { partsRequired: { $exists: false } },
      { $set: { partsRequired: false } }
    );
    console.log(`  Set partsRequired to false for ${result3.modifiedCount} cases`);
    totalModified += result3.modifiedCount;
  }

  // Step 4: Set default priority where missing
  console.log('\nStep 4: Setting default priority...');
  const missingPriority = await collection.countDocuments({
    priority: { $exists: false }
  });
  console.log(`  Found ${missingPriority} cases without priority`);

  if (missingPriority > 0) {
    const result4 = await collection.updateMany(
      { priority: { $exists: false } },
      { $set: { priority: "normal" } }
    );
    console.log(`  Set priority to "normal" for ${result4.modifiedCount} cases`);
    totalModified += result4.modifiedCount;
  }

  // Summary
  const totalCases = await collection.countDocuments({});
  console.log('\n--- Migration Summary ---');
  console.log(`Total cases in database: ${totalCases}`);
  console.log(`Total documents modified: ${totalModified}`);

  // Verification
  console.log('\n--- Verification ---');
  const verifyLocationType = await collection.countDocuments({
    repairLocationType: { $in: ["WITH_CUSTOMER", "ON_SITE", "THIRD_PARTY"] }
  });
  const verifyPartsRequired = await collection.countDocuments({
    partsRequired: { $exists: true }
  });
  const verifyPriority = await collection.countDocuments({
    priority: { $exists: true }
  });
  console.log(`Cases with valid repairLocationType: ${verifyLocationType}/${totalCases}`);
  console.log(`Cases with partsRequired field: ${verifyPartsRequired}/${totalCases}`);
  console.log(`Cases with priority field: ${verifyPriority}/${totalCases}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
