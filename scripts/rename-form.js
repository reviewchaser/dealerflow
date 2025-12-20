/**
 * Safe Form Rename Script
 *
 * Renames a form's display name WITHOUT touching fields/schema.
 * This is the safe way to rename forms without triggering a full reseed.
 *
 * Usage:
 *   node scripts/rename-form.js WARRANTY_CLAIM "Warranty Claim"
 *   node scripts/rename-form.js TEST_DRIVE "Test Drive Request"
 */

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

// Get arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("\nUsage: node scripts/rename-form.js <FORM_TYPE> <NEW_NAME>\n");
  console.log("Examples:");
  console.log('  node scripts/rename-form.js WARRANTY_CLAIM "Warranty Claim"');
  console.log('  node scripts/rename-form.js TEST_DRIVE "Test Drive Request"\n');
  console.log("Available form types:");
  console.log("  PDI, TEST_DRIVE, WARRANTY_CLAIM, COURTESY_OUT, COURTESY_IN,");
  console.log("  SERVICE_RECEIPT, REVIEW_FEEDBACK, DELIVERY\n");
  process.exit(1);
}

const FORM_TYPE = args[0].toUpperCase();
const NEW_NAME = args[1];

// Define schemas inline
const dealerSchema = new mongoose.Schema({ name: String });
const formSchema = new mongoose.Schema({
  dealerId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
});

const Dealer = mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);
const Form = mongoose.models.Form || mongoose.model("Form", formSchema);

async function renameForm() {
  try {
    console.log("\n" + "═".repeat(50));
    console.log("SAFE FORM RENAME");
    console.log("═".repeat(50));
    console.log(`Form Type: ${FORM_TYPE}`);
    console.log(`New Name:  ${NEW_NAME}`);
    console.log("═".repeat(50) + "\n");

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Get the first dealer
    const dealer = await Dealer.findOne().lean();
    if (!dealer) {
      console.error("No dealer found.");
      process.exit(1);
    }
    console.log(`Dealer: ${dealer.name}`);
    const dealerId = dealer._id;

    // Find the form
    const form = await Form.findOne({ dealerId, type: FORM_TYPE });

    if (!form) {
      console.error(`\n❌ Form with type "${FORM_TYPE}" not found.\n`);
      process.exit(1);
    }

    const oldName = form.name;
    console.log(`\nCurrent name: "${oldName}"`);

    if (oldName === NEW_NAME) {
      console.log("\n✓ Form already has this name. No changes needed.\n");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update ONLY the name - nothing else
    await Form.findByIdAndUpdate(form._id, {
      name: NEW_NAME,
    });

    console.log(`New name:     "${NEW_NAME}"`);
    console.log("\n✅ Form renamed successfully!");
    console.log("   (Fields and schema were NOT modified)\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

renameForm();
