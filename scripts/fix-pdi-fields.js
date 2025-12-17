// Fix PDI form fields - Updates Gear Change, DPF Soot Level, and adds Issues Found section
// Run with: node scripts/fix-pdi-fields.js

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas inline for standalone script
const formFieldSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  label: { type: String, required: true },
  fieldName: { type: String, required: true },
  type: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: { type: Object },
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
  isCustom: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  placeholder: { type: String },
  helpText: { type: String },
  vrmLookup: { type: Boolean, default: false },
}, { timestamps: true });

const formSchema = new mongoose.Schema({
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
  name: { type: String, required: true },
  type: { type: String, required: true },
}, { timestamps: true });

const FormField = mongoose.models.FormField || mongoose.model("FormField", formFieldSchema);
const Form = mongoose.models.Form || mongoose.model("Form", formSchema);

async function fixPDIFields() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all PDI forms across all dealers
    const pdiForms = await Form.find({ type: "PDI" });
    console.log(`Found ${pdiForms.length} PDI form(s)`);

    for (const form of pdiForms) {
      console.log(`\nProcessing form: ${form.name} (${form._id})`);

      // 1. Update Gear Change field
      const gearChangeResult = await FormField.updateOne(
        { formId: form._id, fieldName: "gear_change" },
        {
          $set: {
            type: "RADIO",
            options: { choices: ["OK", "Repair"] },
            label: "Gear Change",
          }
        }
      );
      console.log(`  - Gear Change: ${gearChangeResult.modifiedCount ? "Updated" : "Already correct or not found"}`);

      // 2. Update DPF Soot Level field
      const dpfResult = await FormField.updateOne(
        { formId: form._id, fieldName: "dpf_soot" },
        {
          $set: {
            type: "RADIO",
            options: { choices: ["OK", "Repair/Replace"] },
            label: "DPF Soot Level",
          }
        }
      );
      console.log(`  - DPF Soot Level: ${dpfResult.modifiedCount ? "Updated" : "Already correct or not found"}`);

      // 3. Check if Issues Found section exists
      const issuesSectionExists = await FormField.findOne({
        formId: form._id,
        fieldName: "_section_issues"
      });

      if (!issuesSectionExists) {
        console.log("  - Adding Issues Found section...");

        // Add section header
        await FormField.create({
          formId: form._id,
          label: "Issues Found",
          fieldName: "_section_issues",
          type: "SECTION_HEADER",
          order: 133,
          visible: true,
          isDefault: true,
          isCustom: false,
        });

        // Add help text
        await FormField.create({
          formId: form._id,
          label: "Add issues that need attention. These will be automatically added to the vehicle's issue list.",
          fieldName: "_issues_help",
          type: "PARAGRAPH",
          order: 134,
          visible: true,
          isDefault: true,
          isCustom: false,
        });

        // Add PDI Issues field
        await FormField.create({
          formId: form._id,
          label: "Issues",
          fieldName: "pdi_issues",
          type: "PDI_ISSUES",
          required: false,
          order: 135,
          visible: true,
          isDefault: true,
          isCustom: false,
        });

        console.log("  - Issues Found section added");
      } else {
        console.log("  - Issues Found section already exists");
      }
    }

    console.log("\n✅ PDI fields fix complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing PDI fields:", error);
    process.exit(1);
  }
}

fixPDIFields();
