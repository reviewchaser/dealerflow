// Fix Form indexes - drop the old unique publicSlug index and sync with new compound index
import "dotenv/config";
import connectMongo from "../libs/mongoose.js";
import Form from "../models/Form.js";

async function fixFormIndexes() {
  console.log("Connecting to MongoDB...");
  await connectMongo();

  console.log("Checking current indexes on Form collection...");

  try {
    const indexes = await Form.collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    // Look for the old unique publicSlug index
    const oldIndex = indexes.find(idx =>
      idx.key && idx.key.publicSlug && !idx.key.dealerId && idx.unique
    );

    if (oldIndex) {
      console.log("Found old unique publicSlug index, dropping it...");
      await Form.collection.dropIndex(oldIndex.name);
      console.log("Dropped old index:", oldIndex.name);
    } else {
      console.log("No old unique publicSlug index found.");
    }

    // Sync indexes to create the new compound index
    console.log("Syncing indexes...");
    await Form.syncIndexes();

    // Verify final indexes
    const finalIndexes = await Form.collection.indexes();
    console.log("Final indexes:", JSON.stringify(finalIndexes, null, 2));

    console.log("Done!");
  } catch (error) {
    console.error("Error:", error.message);
  }

  process.exit(0);
}

fixFormIndexes();
