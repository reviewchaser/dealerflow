const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...values] = trimmedLine.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
  console.log('✓ Loaded .env.local');
}

// Connect and snapshot using native MongoDB driver
async function snapshotDB() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/dealerflow');

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();

    // Create snapshots directory
    const snapshotDir = path.join(__dirname, '..', 'snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    // Timestamp for snapshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const snapshotPath = path.join(snapshotDir, `snapshot-${timestamp}.json`);

    // Collect data from all relevant collections
    const snapshot = {
      timestamp: new Date().toISOString(),
      collections: {}
    };

    // Collections to snapshot
    const collectionsToSnapshot = [
      'forms',
      'formfields',
      'dealers',
      'appraisalissues',
      'courtesyallocations',
      'reviewrequests',
      'reviewresponses',
      'aftercarecases',
      'vehicles'
    ];

    for (const collectionName of collectionsToSnapshot) {
      try {
        const docs = await db.collection(collectionName).find({}).toArray();
        snapshot.collections[collectionName] = docs;
        console.log(`✓ Snapshotted ${docs.length} ${collectionName}`);
      } catch (err) {
        console.log(`⊘ Collection ${collectionName} not found or empty`);
        snapshot.collections[collectionName] = [];
      }
    }

    // Write snapshot to file
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    const totalRecords = Object.values(snapshot.collections).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`\n✓ Snapshot saved to: ${snapshotPath}`);
    console.log(`  Total records: ${totalRecords}`);

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('Error creating snapshot:', error);
    await client.close();
    process.exit(1);
  }
}

snapshotDB();
