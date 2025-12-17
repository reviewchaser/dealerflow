/**
 * Migration Script: Add new courtesy car fields to AftercareCase and CourtesyAllocation
 *
 * This script is IDEMPOTENT - safe to run multiple times.
 *
 * Changes:
 * 1. AftercareCase: Set courtesyRequired to false where missing
 * 2. CourtesyAllocation: Set status to "RETURNED" where dateReturned exists, else "OUT"
 * 3. CourtesyAllocation: Set source to "MANUAL" where missing
 * 4. Does NOT unset any old fields (backwards compatibility)
 *
 * Run: node scripts/migrate-courtesy-fields.js
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

  const aftercareCases = mongoose.connection.db.collection('aftercarecases');
  const courtesyAllocations = mongoose.connection.db.collection('courtesyallocations');

  let totalModified = 0;

  // ═══════════════════════════════════════════════════════════════════════════════
  // AftercareCase migrations
  // ═══════════════════════════════════════════════════════════════════════════════

  // Step 1: Set default courtesyRequired where missing
  console.log('Step 1: Setting default courtesyRequired on AftercareCase...');
  const missingCourtesyRequired = await aftercareCases.countDocuments({
    courtesyRequired: { $exists: false }
  });
  console.log(`  Found ${missingCourtesyRequired} cases without courtesyRequired`);

  if (missingCourtesyRequired > 0) {
    const result1 = await aftercareCases.updateMany(
      { courtesyRequired: { $exists: false } },
      { $set: { courtesyRequired: false } }
    );
    console.log(`  Set courtesyRequired to false for ${result1.modifiedCount} cases`);
    totalModified += result1.modifiedCount;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CourtesyAllocation migrations
  // ═══════════════════════════════════════════════════════════════════════════════

  // Step 2: Set status based on dateReturned
  console.log('\nStep 2: Setting status on CourtesyAllocation...');

  // 2a: Set status to RETURNED where dateReturned exists
  const withDateReturned = await courtesyAllocations.countDocuments({
    dateReturned: { $exists: true, $ne: null },
    status: { $exists: false }
  });
  console.log(`  Found ${withDateReturned} allocations with dateReturned but no status`);

  if (withDateReturned > 0) {
    const result2a = await courtesyAllocations.updateMany(
      { dateReturned: { $exists: true, $ne: null }, status: { $exists: false } },
      { $set: { status: "RETURNED" } }
    );
    console.log(`  Set status to "RETURNED" for ${result2a.modifiedCount} allocations`);
    totalModified += result2a.modifiedCount;
  }

  // 2b: Set status to OUT where dateReturned is null/missing
  const withoutDateReturned = await courtesyAllocations.countDocuments({
    $or: [
      { dateReturned: { $exists: false } },
      { dateReturned: null }
    ],
    status: { $exists: false }
  });
  console.log(`  Found ${withoutDateReturned} allocations without dateReturned and no status`);

  if (withoutDateReturned > 0) {
    const result2b = await courtesyAllocations.updateMany(
      {
        $or: [
          { dateReturned: { $exists: false } },
          { dateReturned: null }
        ],
        status: { $exists: false }
      },
      { $set: { status: "OUT" } }
    );
    console.log(`  Set status to "OUT" for ${result2b.modifiedCount} allocations`);
    totalModified += result2b.modifiedCount;
  }

  // Step 3: Set default source where missing
  console.log('\nStep 3: Setting default source on CourtesyAllocation...');
  const missingSource = await courtesyAllocations.countDocuments({
    source: { $exists: false }
  });
  console.log(`  Found ${missingSource} allocations without source`);

  if (missingSource > 0) {
    const result3 = await courtesyAllocations.updateMany(
      { source: { $exists: false } },
      { $set: { source: "MANUAL" } }
    );
    console.log(`  Set source to "MANUAL" for ${result3.modifiedCount} allocations`);
    totalModified += result3.modifiedCount;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════════
  const totalCases = await aftercareCases.countDocuments({});
  const totalAllocations = await courtesyAllocations.countDocuments({});

  console.log('\n--- Migration Summary ---');
  console.log(`Total aftercare cases: ${totalCases}`);
  console.log(`Total courtesy allocations: ${totalAllocations}`);
  console.log(`Total documents modified: ${totalModified}`);

  // Verification
  console.log('\n--- Verification ---');
  const verifyCourtesyRequired = await aftercareCases.countDocuments({
    courtesyRequired: { $exists: true }
  });
  const verifyStatus = await courtesyAllocations.countDocuments({
    status: { $in: ["OUT", "RETURNED"] }
  });
  const verifySource = await courtesyAllocations.countDocuments({
    source: { $in: ["MANUAL", "FORM"] }
  });
  console.log(`Cases with courtesyRequired field: ${verifyCourtesyRequired}/${totalCases}`);
  console.log(`Allocations with valid status: ${verifyStatus}/${totalAllocations}`);
  console.log(`Allocations with valid source: ${verifySource}/${totalAllocations}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
