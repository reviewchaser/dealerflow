/**
 * Migration Script: Add events array to existing AftercareCase documents
 *
 * This script:
 * 1. Ensures all cases have an events array (sets to [] if missing)
 * 2. Optionally adds CASE_CREATED event for cases with empty events array
 *
 * Run: node scripts/migrate-aftercare-events.js
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

  // Step 1: Find cases without events field
  const casesWithoutEvents = await collection.countDocuments({
    events: { $exists: false }
  });
  console.log(`Found ${casesWithoutEvents} cases without events field`);

  if (casesWithoutEvents > 0) {
    // Add empty events array to cases missing it
    const result1 = await collection.updateMany(
      { events: { $exists: false } },
      { $set: { events: [] } }
    );
    console.log(`Added empty events array to ${result1.modifiedCount} cases`);
  }

  // Step 2: Find cases with empty events array and add CASE_CREATED event
  const casesWithEmptyEvents = await collection.find({
    events: { $size: 0 }
  }).toArray();

  console.log(`\nFound ${casesWithEmptyEvents.length} cases with empty events array`);

  if (casesWithEmptyEvents.length > 0) {
    let updated = 0;
    for (const c of casesWithEmptyEvents) {
      await collection.updateOne(
        { _id: c._id },
        {
          $push: {
            events: {
              type: "CASE_CREATED",
              createdAt: c.createdAt || new Date(),
              summary: "Case created"
            }
          }
        }
      );
      updated++;
    }
    console.log(`Added CASE_CREATED event to ${updated} cases`);
  }

  // Step 3: Ensure attachments array exists
  const casesWithoutAttachments = await collection.countDocuments({
    attachments: { $exists: false }
  });
  console.log(`\nFound ${casesWithoutAttachments} cases without attachments field`);

  if (casesWithoutAttachments > 0) {
    const result2 = await collection.updateMany(
      { attachments: { $exists: false } },
      { $set: { attachments: [] } }
    );
    console.log(`Added empty attachments array to ${result2.modifiedCount} cases`);
  }

  // Summary
  const totalCases = await collection.countDocuments({});
  console.log(`\n--- Migration Complete ---`);
  console.log(`Total cases in database: ${totalCases}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
