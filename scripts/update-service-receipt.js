/**
 * Update Service Receipt Form - Match PDF Exactly
 *
 * This script updates the Service Receipt form to match the PDF template:
 * - Registration & Mileage side by side (row 1)
 * - Make & Model side by side (row 2) - auto-fill from VRM lookup
 * - Work Carried Out section with 5 checkboxes
 * - Additional Works textarea
 * - Date Carried Out (defaults to today)
 * - No technician signature required
 */

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

// FormField Schema (inline for script)
const formFieldSchema = new mongoose.Schema({
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true },
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  fieldName: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ["TEXT", "TEXTAREA", "NUMBER", "DATE", "TIME", "DATETIME", "DROPDOWN", "CHECKBOX", "RADIO", "FILE", "SIGNATURE", "RATING", "BOOLEAN", "SECTION_HEADER", "PARAGRAPH"],
    required: true
  },
  required: { type: Boolean, default: false },
  options: { type: Object },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  placeholder: { type: String },
  helpText: { type: String },
  vrmLookup: { type: Boolean, default: false },
  gridGroup: { type: String }, // For side-by-side layout
  uppercase: { type: Boolean, default: false }, // For uppercase labels
}, { timestamps: true });

const FormField = mongoose.models.FormField || mongoose.model("FormField", formFieldSchema);

// Form Schema
const formSchema = new mongoose.Schema({
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
  publicSlug: { type: String },
  introText: { type: String },
  showDealerHeader: { type: Boolean, default: false },
}, { timestamps: true });

const Form = mongoose.models.Form || mongoose.model("Form", formSchema);

// Dealer Schema
const dealerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: { type: String },
  companyAddress: { type: String },
  companyPhone: { type: String },
}, { timestamps: true });

const Dealer = mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);

// Service Receipt fields - exact PDF match
const SERVICE_RECEIPT_FIELDS = [
  // Row 1: Registration and Mileage side by side
  {
    fieldName: "vrm",
    label: "REGISTRATION",
    type: "TEXT",
    required: true,
    vrmLookup: true,
    gridGroup: "row1",
    uppercase: true
  },
  {
    fieldName: "mileage",
    label: "MILEAGE",
    type: "NUMBER",
    required: true,
    gridGroup: "row1",
    uppercase: true
  },

  // Row 2: Make and Model side by side (auto-fill from VRM)
  {
    fieldName: "make",
    label: "MAKE",
    type: "TEXT",
    required: false,
    gridGroup: "row2",
    uppercase: true,
    helpText: "Auto-fills when selecting from stock"
  },
  {
    fieldName: "model",
    label: "MODEL",
    type: "TEXT",
    required: false,
    gridGroup: "row2",
    uppercase: true,
    helpText: "Auto-fills when selecting from stock"
  },

  // Work Carried Out section
  {
    fieldName: "_section_work",
    label: "WORK CARRIED OUT",
    type: "SECTION_HEADER",
    required: false,
    uppercase: true
  },

  // Checkboxes for work done
  { fieldName: "oil_filter", label: "OIL FILTER", type: "BOOLEAN", required: false, uppercase: true },
  { fieldName: "air_filter", label: "AIR FILTER", type: "BOOLEAN", required: false, uppercase: true },
  { fieldName: "cabin_filter", label: "CABIN FILTER", type: "BOOLEAN", required: false, uppercase: true },
  { fieldName: "spark_plugs", label: "SPARK PLUGS", type: "BOOLEAN", required: false, uppercase: true },
  { fieldName: "pdi_done", label: "PRE-DELIVERY INSPECTION", type: "BOOLEAN", required: false, uppercase: true },

  // Additional Works section
  {
    fieldName: "_section_additional",
    label: "ADDITIONAL WORKS",
    type: "SECTION_HEADER",
    required: false,
    uppercase: true
  },
  {
    fieldName: "additional_works",
    label: "ADDITIONAL WORKS",
    type: "TEXTAREA",
    required: false,
    uppercase: true
  },

  // Date Carried Out at the end
  {
    fieldName: "service_date",
    label: "DATE CARRIED OUT",
    type: "DATE",
    required: true,
    uppercase: true
  },
];

async function updateServiceReceiptForm() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!\n");

  // Get the dealer
  const dealer = await Dealer.findOne();
  if (!dealer) {
    console.error("No dealer found!");
    process.exit(1);
  }
  console.log(`Dealer: ${dealer.name}`);
  console.log(`Company: ${dealer.companyName || "(not set)"}`);
  console.log(`Phone: ${dealer.companyPhone || "(not set)"}`);
  console.log(`Address: ${dealer.companyAddress || "(not set)"}\n`);

  // Find the Service Receipt form
  let form = await Form.findOne({ dealerId: dealer._id, type: "SERVICE_RECEIPT" });

  if (!form) {
    console.log("Service Receipt form not found, creating new one...");
    form = await Form.create({
      dealerId: dealer._id,
      name: "Service Receipt",
      type: "SERVICE_RECEIPT",
      isPublic: false,
      publicSlug: "service-receipt",
      introText: null,
      showDealerHeader: true,
    });
    console.log(`Created form: ${form.name} (${form._id})`);
  } else {
    console.log(`Found form: ${form.name} (${form._id})`);
    // Update form settings
    await Form.updateOne(
      { _id: form._id },
      {
        $set: {
          introText: null,
          showDealerHeader: true
        }
      }
    );
    console.log("Updated form settings (showDealerHeader: true, introText: null)");
  }

  // Delete existing fields
  const deleted = await FormField.deleteMany({ formId: form._id });
  console.log(`Deleted ${deleted.deletedCount} existing fields`);

  // Create new fields
  const fieldsToCreate = SERVICE_RECEIPT_FIELDS.map((field, index) => ({
    dealerId: dealer._id,
    formId: form._id,
    fieldName: field.fieldName,
    label: field.label,
    type: field.type,
    required: field.required || false,
    options: field.options || null,
    order: index,
    isVisible: true,
    placeholder: field.placeholder || null,
    helpText: field.helpText || null,
    vrmLookup: field.vrmLookup || false,
    gridGroup: field.gridGroup || null,
    uppercase: field.uppercase || false,
  }));

  await FormField.insertMany(fieldsToCreate);
  console.log(`Created ${fieldsToCreate.length} new fields\n`);

  // Verify
  const count = await FormField.countDocuments({ formId: form._id });
  console.log(`\n═════════════════════════════════════════════`);
  console.log(`SERVICE RECEIPT FORM UPDATED`);
  console.log(`═════════════════════════════════════════════`);
  console.log(`Total fields: ${count}`);
  console.log(`\nFields created:`);
  SERVICE_RECEIPT_FIELDS.forEach((f, i) => {
    const grid = f.gridGroup ? ` [${f.gridGroup}]` : "";
    console.log(`  ${i + 1}. ${f.fieldName}: ${f.type}${f.required ? " (required)" : ""}${grid}`);
  });

  console.log(`\n═════════════════════════════════════════════`);
  console.log(`FORM LAYOUT:`);
  console.log(`═════════════════════════════════════════════`);
  console.log(`┌─────────────────────────┬─────────────────────────┐`);
  console.log(`│ REGISTRATION            │ MILEAGE                 │`);
  console.log(`├─────────────────────────┼─────────────────────────┤`);
  console.log(`│ MAKE                    │ MODEL                   │`);
  console.log(`└─────────────────────────┴─────────────────────────┘`);
  console.log(`─────────────────────────────────────────────────────`);
  console.log(`WORK CARRIED OUT`);
  console.log(`☐ OIL FILTER`);
  console.log(`☐ AIR FILTER`);
  console.log(`☐ CABIN FILTER`);
  console.log(`☐ SPARK PLUGS`);
  console.log(`☐ PRE-DELIVERY INSPECTION`);
  console.log(`─────────────────────────────────────────────────────`);
  console.log(`ADDITIONAL WORKS`);
  console.log(`[                                                   ]`);
  console.log(`─────────────────────────────────────────────────────`);
  console.log(`DATE CARRIED OUT *`);
  console.log(`[_____________]`);
  console.log(`═════════════════════════════════════════════════════`);

  await mongoose.disconnect();
  console.log("\nDone!");
}

updateServiceReceiptForm().catch(console.error);
