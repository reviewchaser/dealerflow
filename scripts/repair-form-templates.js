/**
 * Form Template Repair Script
 *
 * This script repairs form templates that were accidentally overwritten by reseed.
 * It restores fields from libs/formTemplates.js (the authoritative source).
 *
 * What it does:
 * - Loads the correct template definitions from libs/formTemplates.js
 * - For each form type, replaces the fields with the correct versions
 * - Preserves form _id, dealerId, and any dealer-specific settings
 * - Does NOT touch submissions (FormSubmission collection)
 *
 * Usage:
 *   node scripts/repair-form-templates.js          # Dry run (preview changes)
 *   node scripts/repair-form-templates.js --apply  # Actually apply changes
 */

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--apply");

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
  const { FORM_TEMPLATES } = await import("../libs/formTemplates.js");
  return FORM_TEMPLATES;
}

async function repairTemplates() {
  try {
    console.log("\n" + "═".repeat(70));
    console.log("FORM TEMPLATE REPAIR SCRIPT");
    console.log("═".repeat(70));
    console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (preview only)" : "⚠️  APPLYING CHANGES"}`);
    console.log(`Source: libs/formTemplates.js (authoritative)`);
    console.log("═".repeat(70) + "\n");

    if (DRY_RUN) {
      console.log("ℹ️  This is a dry run. No changes will be made.");
      console.log("   Run with --apply to actually apply changes.\n");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const FORM_TEMPLATES = await loadTemplates();

    // Get the first dealer
    const dealer = await Dealer.findOne().lean();
    if (!dealer) {
      console.error("No dealer found.");
      process.exit(1);
    }
    console.log(`Dealer: ${dealer.name}`);
    const dealerId = dealer._id;

    const stats = {
      formsRepaired: 0,
      formsNotFound: 0,
      formsUnchanged: 0,
      totalFieldsDeleted: 0,
      totalFieldsCreated: 0,
    };

    for (const template of FORM_TEMPLATES) {
      console.log(`\n▶ ${template.name} (${template.type})`);
      console.log("─".repeat(50));

      // Find the form
      const form = await Form.findOne({ dealerId, type: template.type });

      if (!form) {
        console.log("  ⚠️  Form not found in database - will be created");
        stats.formsNotFound++;

        if (!DRY_RUN) {
          const newForm = await Form.create({
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
            updatedSource: "repair",
            updatedAt: new Date(),
          });

          // Create fields
          for (const field of template.fields) {
            await FormField.create({
              formId: newForm._id,
              label: field.label,
              fieldName: field.fieldName,
              type: field.type,
              required: field.required || false,
              options: field.options,
              order: field.order || 0,
              visible: true,
              isDefault: true,
              isCustom: false,
              placeholder: field.placeholder,
              helpText: field.helpText,
              vrmLookup: field.vrmLookup || false,
              hiddenWhenStockSelected: field.hiddenWhenStockSelected || false,
              uppercase: field.uppercase || false,
            });
          }
          console.log(`  ✓ Created form with ${template.fields.length} fields`);
          stats.totalFieldsCreated += template.fields.length;
        }
        continue;
      }

      // Get current fields
      const currentFields = await FormField.find({ formId: form._id }).lean();
      const currentFieldCount = currentFields.length;
      const templateFieldCount = template.fields.length;

      console.log(`  Current fields: ${currentFieldCount}`);
      console.log(`  Template fields: ${templateFieldCount}`);

      // Compare field signatures
      const currentFieldNames = new Set(currentFields.map(f => f.fieldName));
      const templateFieldNames = new Set(template.fields.map(f => f.fieldName));

      const missingInDb = [...templateFieldNames].filter(x => !currentFieldNames.has(x));
      const extraInDb = [...currentFieldNames].filter(x => !templateFieldNames.has(x));

      if (missingInDb.length > 0) {
        console.log(`  Missing fields: ${missingInDb.join(", ")}`);
      }
      if (extraInDb.length > 0) {
        console.log(`  Extra fields (will be removed): ${extraInDb.join(", ")}`);
      }

      if (currentFieldCount === templateFieldCount && missingInDb.length === 0) {
        console.log("  ✓ Fields match template - no repair needed");
        stats.formsUnchanged++;
        continue;
      }

      // Fields don't match - need repair
      console.log("  ⚠️  Fields need repair");
      stats.formsRepaired++;
      stats.totalFieldsDeleted += currentFieldCount;
      stats.totalFieldsCreated += templateFieldCount;

      if (!DRY_RUN) {
        // Delete all current fields
        await FormField.deleteMany({ formId: form._id });
        console.log(`  ✗ Deleted ${currentFieldCount} old fields`);

        // Update form metadata
        await Form.findByIdAndUpdate(form._id, {
          name: template.name,
          introText: template.introText || null,
          termsText: template.termsText || null,
          visibility: template.visibility || (template.isPublic ? "PUBLIC" : "INTERNAL"),
          vrmLookup: template.vrmLookup || null,
          schemaVersion: 1,
          updatedSource: "repair",
          updatedAt: new Date(),
        });

        // Create new fields from template
        for (const field of template.fields) {
          await FormField.create({
            formId: form._id,
            label: field.label,
            fieldName: field.fieldName,
            type: field.type,
            required: field.required || false,
            options: field.options,
            order: field.order || 0,
            visible: true,
            isDefault: true,
            isCustom: false,
            placeholder: field.placeholder,
            helpText: field.helpText,
            vrmLookup: field.vrmLookup || false,
            hiddenWhenStockSelected: field.hiddenWhenStockSelected || false,
            uppercase: field.uppercase || false,
          });
        }
        console.log(`  ✓ Created ${templateFieldCount} fields from template`);
      } else {
        console.log(`  [DRY RUN] Would delete ${currentFieldCount} and create ${templateFieldCount} fields`);
      }
    }

    // Print summary
    console.log("\n" + "═".repeat(70));
    console.log("REPAIR SUMMARY");
    console.log("═".repeat(70));
    console.log(`  Forms repaired:   ${stats.formsRepaired}`);
    console.log(`  Forms created:    ${stats.formsNotFound}`);
    console.log(`  Forms unchanged:  ${stats.formsUnchanged}`);
    console.log(`  Fields deleted:   ${stats.totalFieldsDeleted}`);
    console.log(`  Fields created:   ${stats.totalFieldsCreated}`);

    if (DRY_RUN) {
      console.log("\n📋 This was a DRY RUN. No changes were made.");
      console.log("   Run with --apply to actually apply these changes.");
    } else {
      console.log("\n✅ Repair complete! Templates restored from libs/formTemplates.js");
    }

    // Show current state
    console.log("\n" + "─".repeat(70));
    console.log("CURRENT STATE");
    console.log("─".repeat(70));
    const forms = await Form.find({ dealerId }).sort({ type: 1 });
    for (const form of forms) {
      const fieldCount = await FormField.countDocuments({ formId: form._id });
      console.log(`  ${form.type.padEnd(20)} │ ${form.name.padEnd(30)} │ ${fieldCount} fields`);
    }

    await mongoose.disconnect();
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

repairTemplates();
