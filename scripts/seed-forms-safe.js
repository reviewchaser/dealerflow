/**
 * SAFE Form Seeding Script
 *
 * This script seeds forms NON-DESTRUCTIVELY:
 * - Only inserts forms/fields that don't exist
 * - NEVER overwrites existing fields
 * - Updates only metadata (name, introText, termsText) if form exists
 * - Use --force flag to force reseed (destructive - use with caution)
 *
 * Usage:
 *   node scripts/seed-forms-safe.js           # Safe mode (default)
 *   node scripts/seed-forms-safe.js --force   # Force reseed (destructive)
 *   FORCE_RESEED=true node scripts/seed-forms-safe.js  # Force via env var
 */

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

// Check for force flag
const FORCE_RESEED = process.argv.includes("--force") || process.env.FORCE_RESEED === "true";

// Define schemas inline
const dealerSchema = new mongoose.Schema({ name: String });
const formSchema = new mongoose.Schema({
  dealerId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
  isPublic: Boolean,
  visibility: String,
  publicSlug: String,
  introText: String,
  termsText: String,
  vrmLookup: Object,
  schemaVersion: Number,
  updatedSource: String,
  updatedAt: Date,
});
const formFieldSchema = new mongoose.Schema({
  formId: mongoose.Schema.Types.ObjectId,
  label: String,
  fieldName: String,
  type: String,
  required: Boolean,
  options: Object,
  order: Number,
  visible: Boolean,
  isDefault: Boolean,
  isCustom: Boolean,
  placeholder: String,
  helpText: String,
  vrmLookup: Boolean,
  hiddenWhenStockSelected: Boolean,
  uppercase: Boolean,
});

const Dealer = mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);
const Form = mongoose.models.Form || mongoose.model("Form", formSchema);
const FormField = mongoose.models.FormField || mongoose.model("FormField", formFieldSchema);

// Import templates from the authoritative source
async function loadTemplates() {
  // Dynamic import for ES modules
  const { FORM_TEMPLATES } = await import("../libs/formTemplates.js");
  return FORM_TEMPLATES;
}

async function seedFormsSafe() {
  try {
    console.log("\n" + "═".repeat(60));
    console.log("SAFE FORM SEEDING");
    console.log("═".repeat(60));
    console.log(`Mode: ${FORCE_RESEED ? "⚠️  FORCE (destructive)" : "✅ SAFE (non-destructive)"}\n`);

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const FORM_TEMPLATES = await loadTemplates();

    // Get the first dealer
    const dealer = await Dealer.findOne().lean();
    if (!dealer) {
      console.error("No dealer found. Please set up a dealer first.");
      process.exit(1);
    }
    console.log(`Dealer: ${dealer.name}\n`);
    const dealerId = dealer._id;

    const stats = {
      formsCreated: 0,
      formsSkipped: 0,
      formsUpdatedMetadata: 0,
      fieldsCreated: 0,
      fieldsSkipped: 0,
      fieldsDeleted: 0,
    };

    for (const template of FORM_TEMPLATES) {
      console.log(`\n▶ ${template.name} (${template.type})`);
      console.log("─".repeat(40));

      // Check if form already exists
      let form = await Form.findOne({ dealerId, type: template.type });

      if (form) {
        if (FORCE_RESEED) {
          // Force mode: Delete all existing fields and recreate
          console.log("  ⚠️  Force mode: deleting existing fields...");
          const deletedCount = await FormField.deleteMany({ formId: form._id });
          stats.fieldsDeleted += deletedCount.deletedCount;
          console.log(`  ✗ Deleted ${deletedCount.deletedCount} fields`);

          // Update form metadata
          await Form.findByIdAndUpdate(form._id, {
            name: template.name,
            introText: template.introText || null,
            termsText: template.termsText || null,
            visibility: template.visibility || (template.isPublic ? "PUBLIC" : "INTERNAL"),
            vrmLookup: template.vrmLookup || null,
            schemaVersion: 1,
            updatedSource: "seed",
            updatedAt: new Date(),
          });
          console.log("  ✓ Updated form metadata");

          // Create all fields from template
          let fieldCount = 0;
          for (const field of template.fields) {
            await FormField.create({
              formId: form._id,
              label: field.label,
              fieldName: field.fieldName,
              type: field.type,
              required: field.required || false,
              options: field.options,
              order: field.order || fieldCount,
              visible: true,
              isDefault: true,
              isCustom: false,
              placeholder: field.placeholder,
              helpText: field.helpText,
              vrmLookup: field.vrmLookup || false,
              hiddenWhenStockSelected: field.hiddenWhenStockSelected || false,
              uppercase: field.uppercase || false,
            });
            fieldCount++;
          }
          stats.fieldsCreated += fieldCount;
          console.log(`  ✓ Created ${fieldCount} fields`);
        } else {
          // Safe mode: Only update metadata, don't touch fields
          console.log("  ℹ Form exists - updating metadata only (use --force to reseed fields)");

          await Form.findByIdAndUpdate(form._id, {
            name: template.name,
            introText: template.introText || null,
            termsText: template.termsText || null,
            visibility: template.visibility || (template.isPublic ? "PUBLIC" : "INTERNAL"),
            vrmLookup: template.vrmLookup || null,
            updatedAt: new Date(),
          });
          stats.formsUpdatedMetadata++;

          // Check if any fields are missing and add them
          const existingFields = await FormField.find({ formId: form._id }).lean();
          const existingFieldNames = new Set(existingFields.map(f => f.fieldName));

          let addedCount = 0;
          for (const field of template.fields) {
            if (!existingFieldNames.has(field.fieldName)) {
              await FormField.create({
                formId: form._id,
                label: field.label,
                fieldName: field.fieldName,
                type: field.type,
                required: field.required || false,
                options: field.options,
                order: field.order || 999,
                visible: true,
                isDefault: true,
                isCustom: false,
                placeholder: field.placeholder,
                helpText: field.helpText,
                vrmLookup: field.vrmLookup || false,
                hiddenWhenStockSelected: field.hiddenWhenStockSelected || false,
                uppercase: field.uppercase || false,
              });
              addedCount++;
            }
          }

          if (addedCount > 0) {
            console.log(`  ✓ Added ${addedCount} new fields (${existingFields.length} existing preserved)`);
            stats.fieldsCreated += addedCount;
          } else {
            console.log(`  ✓ All ${existingFields.length} fields already exist - no changes`);
            stats.fieldsSkipped += existingFields.length;
          }
          stats.formsSkipped++;
        }
      } else {
        // Form doesn't exist - create it
        console.log("  ℹ Form not found - creating...");

        form = await Form.create({
          dealerId,
          name: template.name,
          type: template.type,
          isPublic: template.isPublic || false,
          visibility: template.visibility || (template.isPublic ? "PUBLIC" : "INTERNAL"),
          publicSlug: template.publicSlug,
          introText: template.introText || null,
          termsText: template.termsText || null,
          vrmLookup: template.vrmLookup || null,
          schemaVersion: 1,
          updatedSource: "seed",
          updatedAt: new Date(),
        });
        stats.formsCreated++;
        console.log("  ✓ Created form");

        // Create all fields
        let fieldCount = 0;
        for (const field of template.fields) {
          await FormField.create({
            formId: form._id,
            label: field.label,
            fieldName: field.fieldName,
            type: field.type,
            required: field.required || false,
            options: field.options,
            order: field.order || fieldCount,
            visible: true,
            isDefault: true,
            isCustom: false,
            placeholder: field.placeholder,
            helpText: field.helpText,
            vrmLookup: field.vrmLookup || false,
            hiddenWhenStockSelected: field.hiddenWhenStockSelected || false,
            uppercase: field.uppercase || false,
          });
          fieldCount++;
        }
        stats.fieldsCreated += fieldCount;
        console.log(`  ✓ Created ${fieldCount} fields`);
      }
    }

    // Print summary
    console.log("\n" + "═".repeat(60));
    console.log("SUMMARY");
    console.log("═".repeat(60));
    console.log(`  Forms created:          ${stats.formsCreated}`);
    console.log(`  Forms updated metadata: ${stats.formsUpdatedMetadata}`);
    console.log(`  Forms skipped:          ${stats.formsSkipped}`);
    console.log(`  Fields created:         ${stats.fieldsCreated}`);
    console.log(`  Fields skipped:         ${stats.fieldsSkipped}`);
    if (FORCE_RESEED) {
      console.log(`  Fields deleted:         ${stats.fieldsDeleted}`);
    }

    // Current state
    console.log("\n" + "─".repeat(60));
    console.log("CURRENT STATE");
    console.log("─".repeat(60));
    const forms = await Form.find({ dealerId }).sort({ type: 1 });
    for (const form of forms) {
      const fieldCount = await FormField.countDocuments({ formId: form._id });
      console.log(`  ${form.type.padEnd(20)} │ ${fieldCount} fields`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Seeding complete!\n");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

seedFormsSafe();
