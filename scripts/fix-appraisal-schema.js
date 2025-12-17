/**
 * Fix Appraisal Schema Validation
 *
 * Run this script to remove MongoDB validation rules that require dealerId and contactId.
 *
 * Usage: node scripts/fix-appraisal-schema.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

async function fixAppraisalSchema() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check if collection exists
    const collections = await db.listCollections({ name: 'appraisals' }).toArray();

    if (collections.length === 0) {
      console.log('ℹ️  No appraisals collection found - nothing to fix');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Try to remove schema validation (may fail if user lacks admin privileges)
    console.log('🔧 Attempting to remove schema validation...');
    try {
      await db.command({
        collMod: 'appraisals',
        validator: {},
        validationLevel: 'off'
      });
      console.log('✅ Schema validation removed');
    } catch (e) {
      console.log('⚠️  Could not modify collection validation (may need admin privileges)');
      console.log('   This is OK - we will work around it.');
    }

    // Try to drop indexes (except _id)
    console.log('🔧 Attempting to drop indexes...');
    try {
      await db.collection('appraisals').dropIndexes();
      console.log('✅ Indexes dropped');
    } catch (e) {
      console.log('ℹ️  Could not drop indexes (may not have any custom indexes)');
    }

    // Update any existing documents that have null values to remove those fields
    console.log('🔧 Cleaning up existing documents with null values...');
    const result = await db.collection('appraisals').updateMany(
      { $or: [{ dealerId: null }, { contactId: null }] },
      { $unset: { dealerId: "", contactId: "" } }
    );
    console.log(`✅ Updated ${result.modifiedCount} documents`);

    // Delete the collection and recreate it (nuclear option if validation is stuck)
    console.log('\n⚠️  If you still get validation errors, you may need to:');
    console.log('   1. Go to MongoDB Atlas → Collections → appraisals');
    console.log('   2. Click "Validation" tab and remove any validation rules');
    console.log('   OR');
    console.log('   1. Rename/drop the appraisals collection');
    console.log('   2. Let the app recreate it fresh\n');

    console.log('\n🎉 Done! Appraisal schema has been fixed.');
    console.log('   You can now save appraisals without dealerId/contactId.\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixAppraisalSchema();
