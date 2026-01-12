// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️  DEPRECATED - DO NOT USE
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script DESTRUCTIVELY overwrites all form templates, deleting any
// customizations or updates. It uses INLINE templates which may be outdated.
//
// USE INSTEAD:
//   node scripts/seed-forms-safe.js          # Safe seeding (non-destructive)
//   node scripts/repair-form-templates.js    # Repair from libs/formTemplates.js
//   node scripts/rename-form.js TYPE "Name"  # Safe rename without field reset
//
// If you MUST use this script, set: I_KNOW_WHAT_IM_DOING=true
//
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Safety check - require explicit acknowledgment
if (process.env.I_KNOW_WHAT_IM_DOING !== "true") {
  console.error("\n" + "═".repeat(70));
  console.error("⚠️  THIS SCRIPT IS DEPRECATED AND DESTRUCTIVE");
  console.error("═".repeat(70));
  console.error("\nThis script will DELETE all existing form fields and recreate them");
  console.error("from outdated inline templates. This will LOSE any customizations.\n");
  console.error("Use instead:");
  console.error("  node scripts/seed-forms-safe.js          # Safe seeding");
  console.error("  node scripts/repair-form-templates.js    # Repair templates");
  console.error("  node scripts/rename-form.js TYPE 'Name'  # Safe rename\n");
  console.error("If you MUST run this, set: I_KNOW_WHAT_IM_DOING=true\n");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

// Define schemas inline
const dealerSchema = new mongoose.Schema({ name: String });
const formSchema = new mongoose.Schema({
  dealerId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
  isPublic: Boolean,
  publicSlug: String,
  introText: String,
  termsText: String,
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
});

const Dealer = mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);
const Form = mongoose.models.Form || mongoose.model("Form", formSchema);
const FormField = mongoose.models.FormField || mongoose.model("FormField", formFieldSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// FORM TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_TEMPLATES = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST DRIVE
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Test Drive",
    type: "TEST_DRIVE",
    isPublic: true,
    publicSlug: "test-drive",
    introText: "Please complete this form to book a test drive. You must bring your valid driving licence on the day.",
    termsText: `By signing this form, I confirm that:
- I hold a valid UK driving licence
- I am covered by {dealer.companyName}'s insurance for the duration of the test drive
- I will follow all road traffic laws
- I am responsible for any parking or speeding fines incurred during the test drive
- I will not allow any other person to drive the vehicle`,
    fields: [
      // Vehicle Selection
      { label: "Vehicle Information", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true, helpText: "Search for vehicle in stock" },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Colour", fieldName: "colour", type: "TEXT", required: false, order: 5 },

      // Customer Details
      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "Full Name", fieldName: "customer_name", type: "TEXT", required: true, order: 11 },
      { label: "Address", fieldName: "customer_address", type: "TEXTAREA", required: true, order: 12 },
      { label: "Postcode", fieldName: "customer_postcode", type: "TEXT", required: true, order: 13 },
      { label: "Phone Number", fieldName: "customer_phone", type: "TEXT", required: true, order: 14 },
      { label: "Email Address", fieldName: "customer_email", type: "TEXT", required: false, order: 15 },
      { label: "Date of Birth", fieldName: "customer_dob", type: "DATE", required: true, order: 16 },

      // Driving Licence
      { label: "Driving Licence", fieldName: "_section_licence", type: "SECTION_HEADER", order: 20 },
      { label: "Licence Number", fieldName: "licence_number", type: "TEXT", required: true, order: 21 },
      { label: "Licence Expiry Date", fieldName: "licence_expiry", type: "DATE", required: true, order: 22 },
      { label: "Licence Type", fieldName: "licence_type", type: "RADIO", required: true, order: 23, options: { choices: ["Full UK", "Provisional", "EU", "International"] } },
      { label: "Photo of Driving Licence (Front)", fieldName: "licence_photo_front", type: "FILE", required: true, order: 24 },
      { label: "Photo of Driving Licence (Back)", fieldName: "licence_photo_back", type: "FILE", required: false, order: 25 },

      // Insurance
      { label: "Insurance Details", fieldName: "_section_insurance", type: "SECTION_HEADER", order: 30 },
      { label: "Do you have your own insurance?", fieldName: "own_insurance", type: "RADIO", required: true, order: 31, options: { choices: ["Yes - Own Insurance", "No - Use Dealer Insurance"] } },
      { label: "Insurance Company (if own)", fieldName: "insurance_company", type: "TEXT", required: false, order: 32 },
      { label: "Policy Number (if own)", fieldName: "insurance_policy", type: "TEXT", required: false, order: 33 },

      // Test Drive Details
      { label: "Test Drive Details", fieldName: "_section_testdrive", type: "SECTION_HEADER", order: 40 },
      { label: "Date of Test Drive", fieldName: "test_drive_date", type: "DATE", required: true, order: 41 },
      { label: "Time Out", fieldName: "time_out", type: "TIME", required: true, order: 42 },
      { label: "Mileage Out", fieldName: "mileage_out", type: "NUMBER", required: true, order: 43 },
      { label: "Fuel Level Out", fieldName: "fuel_out", type: "RADIO", required: true, order: 44, options: { choices: ["Full", "3/4", "1/2", "1/4", "Empty"] } },
      { label: "Accompanied by Staff Member", fieldName: "accompanied", type: "RADIO", required: true, order: 45, options: { choices: ["Yes", "No - Unaccompanied"] } },
      { label: "Staff Member Name", fieldName: "staff_name", type: "TEXT", required: false, order: 46 },

      // Terms & Signature
      { label: "Terms & Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 50 },
      { label: "I agree to the terms and conditions", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 51 },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: true, order: 52 },
      { label: "Date", fieldName: "signature_date", type: "DATE", required: true, order: 53 },

      // Return Details (filled on return)
      { label: "Return Details", fieldName: "_section_return", type: "SECTION_HEADER", order: 60 },
      { label: "Time Returned", fieldName: "time_in", type: "TIME", required: false, order: 61 },
      { label: "Mileage Returned", fieldName: "mileage_in", type: "NUMBER", required: false, order: 62 },
      { label: "Fuel Level Returned", fieldName: "fuel_in", type: "RADIO", required: false, order: 63, options: { choices: ["Full", "3/4", "1/2", "1/4", "Empty"] } },
      { label: "Any Damage Noted?", fieldName: "damage_noted", type: "RADIO", required: false, order: 64, options: { choices: ["No Damage", "Minor Damage", "Significant Damage"] } },
      { label: "Damage Description", fieldName: "damage_description", type: "TEXTAREA", required: false, order: 65 },
      { label: "Damage Photos", fieldName: "damage_photos", type: "FILE", required: false, order: 66 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // COURTESY CAR OUT
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Courtesy Car Out",
    type: "COURTESY_OUT",
    isPublic: true,
    publicSlug: "courtesy-out",
    fields: [
      // Vehicle Details
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Courtesy Car Registration", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Colour", fieldName: "colour", type: "TEXT", required: false, order: 5 },

      // Driver Details
      { label: "Driver Details", fieldName: "_section_driver", type: "SECTION_HEADER", order: 10 },
      { label: "Driver Full Name", fieldName: "driver_name", type: "TEXT", required: true, order: 11 },
      { label: "Address", fieldName: "driver_address", type: "TEXTAREA", required: true, order: 12 },
      { label: "Postcode", fieldName: "driver_postcode", type: "TEXT", required: true, order: 13 },
      { label: "Phone Number", fieldName: "driver_phone", type: "TEXT", required: true, order: 14 },
      { label: "Email Address", fieldName: "driver_email", type: "TEXT", required: false, order: 15 },
      { label: "Date of Birth", fieldName: "driver_dob", type: "DATE", required: true, order: 16 },

      // Driving Licence
      { label: "Driving Licence", fieldName: "_section_licence", type: "SECTION_HEADER", order: 20 },
      { label: "Licence Number", fieldName: "licence_number", type: "TEXT", required: true, order: 21 },
      { label: "Licence Expiry Date", fieldName: "licence_expiry", type: "DATE", required: true, order: 22 },
      { label: "Years Held", fieldName: "licence_years_held", type: "NUMBER", required: true, order: 23 },
      { label: "Any Endorsements?", fieldName: "endorsements", type: "RADIO", required: true, order: 24, options: { choices: ["None", "Yes - Details Below"] } },
      { label: "Endorsement Details", fieldName: "endorsement_details", type: "TEXTAREA", required: false, order: 25 },
      { label: "Photo of Driving Licence", fieldName: "licence_photo", type: "FILE", required: true, order: 26 },

      // Additional Driver
      { label: "Additional Driver (if applicable)", fieldName: "_section_additional", type: "SECTION_HEADER", order: 30 },
      { label: "Will there be an additional driver?", fieldName: "additional_driver", type: "RADIO", required: true, order: 31, options: { choices: ["No", "Yes"] } },
      { label: "Additional Driver Name", fieldName: "additional_driver_name", type: "TEXT", required: false, order: 32 },
      { label: "Additional Driver Licence Number", fieldName: "additional_driver_licence", type: "TEXT", required: false, order: 33 },
      { label: "Additional Driver DOB", fieldName: "additional_driver_dob", type: "DATE", required: false, order: 34 },

      // Vehicle Condition Out
      { label: "Vehicle Condition (Out)", fieldName: "_section_condition_out", type: "SECTION_HEADER", order: 40 },
      { label: "Date Out", fieldName: "date_out", type: "DATE", required: true, order: 41 },
      { label: "Time Out", fieldName: "time_out", type: "TIME", required: true, order: 42 },
      { label: "Mileage Out", fieldName: "mileage_out", type: "NUMBER", required: true, order: 43 },
      { label: "Fuel Level Out", fieldName: "fuel_out", type: "RADIO", required: true, order: 44, options: { choices: ["Full", "3/4", "1/2", "1/4", "Empty"] } },
      { label: "Exterior Condition", fieldName: "exterior_condition", type: "RADIO", required: true, order: 45, options: { choices: ["Excellent", "Good", "Fair", "Damage Present"] } },
      { label: "Interior Condition", fieldName: "interior_condition", type: "RADIO", required: true, order: 46, options: { choices: ["Excellent", "Good", "Fair", "Damage Present"] } },
      { label: "Existing Damage Notes", fieldName: "existing_damage", type: "TEXTAREA", required: false, order: 47, helpText: "Document any existing damage" },
      { label: "Condition Photos", fieldName: "condition_photos", type: "FILE", required: false, order: 48 },

      // Customer's Vehicle
      { label: "Customer's Vehicle (In For Work)", fieldName: "_section_customer_vehicle", type: "SECTION_HEADER", order: 50 },
      { label: "Customer Vehicle Registration", fieldName: "customer_vrm", type: "TEXT", required: false, order: 51 },
      { label: "Reason for Courtesy Car", fieldName: "reason", type: "TEXT", required: true, order: 52, placeholder: "e.g. Service, Repair, Warranty Work" },
      { label: "Expected Return Date", fieldName: "expected_return", type: "DATE", required: true, order: 53 },

      // Terms & Agreement
      { label: "Terms & Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 60 },
      { label: "I confirm that I hold a valid full UK driving licence and have held it for at least 12 months. I agree to return the vehicle in the same condition with the same fuel level. I understand I am responsible for any parking fines, speeding tickets, or congestion charges incurred. I agree to pay the excess in the event of any damage not covered by insurance.", fieldName: "terms_text", type: "PARAGRAPH", order: 61 },
      { label: "Insurance Excess Amount", fieldName: "excess_amount", type: "TEXT", required: false, order: 62, placeholder: "e.g. £500" },
      { label: "I agree to the terms and conditions", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 63 },
      { label: "Driver Signature", fieldName: "driver_signature", type: "SIGNATURE", required: true, order: 64 },
      { label: "Date", fieldName: "signature_date", type: "DATE", required: true, order: 65 },
      { label: "Staff Member Name", fieldName: "staff_name", type: "TEXT", required: true, order: 66 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // COURTESY CAR RETURN (IN)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Courtesy Car In",
    type: "COURTESY_IN",
    isPublic: false,
    publicSlug: "courtesy-in",
    fields: [
      // Vehicle Details
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Courtesy Car Registration", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Driver Name", fieldName: "driver_name", type: "TEXT", required: true, order: 3 },

      // Return Condition
      { label: "Return Condition", fieldName: "_section_return", type: "SECTION_HEADER", order: 10 },
      { label: "Date Returned", fieldName: "date_in", type: "DATE", required: true, order: 11 },
      { label: "Time Returned", fieldName: "time_in", type: "TIME", required: true, order: 12 },
      { label: "Mileage Returned", fieldName: "mileage_in", type: "NUMBER", required: true, order: 13 },
      { label: "Fuel Level Returned", fieldName: "fuel_in", type: "RADIO", required: true, order: 14, options: { choices: ["Full", "3/4", "1/2", "1/4", "Empty"] } },

      // Condition Check
      { label: "Condition Checklist", fieldName: "_section_checklist", type: "SECTION_HEADER", order: 20 },
      { label: "Exterior Condition", fieldName: "exterior_condition", type: "RADIO", required: true, order: 21, options: { choices: ["No Issues", "Minor Marks", "Damage - See Notes"] } },
      { label: "Interior Condition", fieldName: "interior_condition", type: "RADIO", required: true, order: 22, options: { choices: ["Clean", "Needs Cleaning", "Damage - See Notes"] } },
      { label: "All Keys Returned?", fieldName: "keys_returned", type: "RADIO", required: true, order: 23, options: { choices: ["Yes", "No"] } },
      { label: "Documents Present?", fieldName: "documents_present", type: "RADIO", required: true, order: 24, options: { choices: ["Yes", "No"] } },
      { label: "Warning Lights On?", fieldName: "warning_lights", type: "RADIO", required: true, order: 25, options: { choices: ["None", "Yes - See Notes"] } },

      // Damage Report
      { label: "Damage Report", fieldName: "_section_damage", type: "SECTION_HEADER", order: 30 },
      { label: "Any New Damage?", fieldName: "new_damage", type: "RADIO", required: true, order: 31, options: { choices: ["No New Damage", "Yes - New Damage Found"] } },
      { label: "Damage Description", fieldName: "damage_description", type: "TEXTAREA", required: false, order: 32 },
      { label: "Damage Location", fieldName: "damage_location", type: "TEXT", required: false, order: 33, placeholder: "e.g. Front bumper, rear quarter panel" },
      { label: "Damage Photos", fieldName: "damage_photos", type: "FILE", required: false, order: 34 },
      { label: "Customer Accepts Responsibility?", fieldName: "customer_accepts", type: "RADIO", required: false, order: 35, options: { choices: ["Yes", "No", "Disputed", "N/A"] } },

      // Charges
      { label: "Additional Charges", fieldName: "_section_charges", type: "SECTION_HEADER", order: 40 },
      { label: "Fuel Charge?", fieldName: "fuel_charge", type: "RADIO", required: true, order: 41, options: { choices: ["No Charge", "Yes - Amount Below"] } },
      { label: "Fuel Charge Amount (£)", fieldName: "fuel_charge_amount", type: "NUMBER", required: false, order: 42 },
      { label: "Cleaning Charge?", fieldName: "cleaning_charge", type: "RADIO", required: true, order: 43, options: { choices: ["No Charge", "Yes - Amount Below"] } },
      { label: "Cleaning Charge Amount (£)", fieldName: "cleaning_charge_amount", type: "NUMBER", required: false, order: 44 },
      { label: "Damage Charge/Excess?", fieldName: "damage_charge", type: "RADIO", required: true, order: 45, options: { choices: ["No Charge", "Yes - Amount Below"] } },
      { label: "Damage Charge Amount (£)", fieldName: "damage_charge_amount", type: "NUMBER", required: false, order: 46 },

      // Sign Off
      { label: "Sign Off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 50 },
      { label: "Notes", fieldName: "notes", type: "TEXTAREA", required: false, order: 51 },
      { label: "Checked By (Staff Name)", fieldName: "checked_by", type: "TEXT", required: true, order: 52 },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: false, order: 53 },
      { label: "Staff Signature", fieldName: "staff_signature", type: "SIGNATURE", required: true, order: 54 },
      { label: "Date", fieldName: "signoff_date", type: "DATE", required: true, order: 55 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVICE RECEIPT
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Service Receipt",
    type: "SERVICE_RECEIPT",
    isPublic: false,
    publicSlug: "service-receipt",
    fields: [
      // Vehicle Details
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2 },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 5 },

      // Customer Details
      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: true, order: 11 },
      { label: "Phone Number", fieldName: "customer_phone", type: "TEXT", required: true, order: 12 },

      // Service Details
      { label: "Service Details", fieldName: "_section_service", type: "SECTION_HEADER", order: 20 },
      { label: "Date of Service", fieldName: "service_date", type: "DATE", required: true, order: 21 },
      { label: "Service Type", fieldName: "service_type", type: "RADIO", required: true, order: 22, options: { choices: ["Interim Service", "Full Service", "Major Service", "Inspection", "Other"] } },

      // Work Performed
      { label: "Work Performed", fieldName: "_section_work", type: "SECTION_HEADER", order: 30 },
      { label: "Oil & Filter Change", fieldName: "oil_filter", type: "RADIO", required: true, order: 31, options: { choices: ["Done", "Not Required", "N/A"] } },
      { label: "Air Filter", fieldName: "air_filter", type: "RADIO", required: true, order: 32, options: { choices: ["Replaced", "Checked OK", "N/A"] } },
      { label: "Pollen/Cabin Filter", fieldName: "pollen_filter", type: "RADIO", required: true, order: 33, options: { choices: ["Replaced", "Checked OK", "N/A"] } },
      { label: "Fuel Filter", fieldName: "fuel_filter", type: "RADIO", required: true, order: 34, options: { choices: ["Replaced", "Checked OK", "N/A"] } },
      { label: "Spark Plugs", fieldName: "spark_plugs", type: "RADIO", required: true, order: 35, options: { choices: ["Replaced", "Checked OK", "N/A"] } },
      { label: "Brake Fluid", fieldName: "brake_fluid", type: "RADIO", required: true, order: 36, options: { choices: ["Replaced", "Topped Up", "Checked OK"] } },
      { label: "Coolant", fieldName: "coolant", type: "RADIO", required: true, order: 37, options: { choices: ["Replaced", "Topped Up", "Checked OK"] } },
      { label: "Power Steering Fluid", fieldName: "power_steering", type: "RADIO", required: true, order: 38, options: { choices: ["Topped Up", "Checked OK", "N/A (Electric)"] } },
      { label: "Washer Fluid", fieldName: "washer_fluid", type: "RADIO", required: true, order: 39, options: { choices: ["Topped Up", "Checked OK"] } },
      { label: "Wiper Blades", fieldName: "wiper_blades", type: "RADIO", required: true, order: 40, options: { choices: ["Replaced", "Checked OK"] } },
      { label: "Lights Check", fieldName: "lights_check", type: "RADIO", required: true, order: 41, options: { choices: ["All OK", "Bulbs Replaced", "Issue Found"] } },
      { label: "Tyre Check", fieldName: "tyre_check", type: "RADIO", required: true, order: 42, options: { choices: ["All OK", "Pressures Adjusted", "Recommend Replacement"] } },
      { label: "Brake Inspection", fieldName: "brake_inspection", type: "RADIO", required: true, order: 43, options: { choices: ["All OK", "Advisory - See Notes", "Work Required"] } },
      { label: "Battery Check", fieldName: "battery_check", type: "RADIO", required: true, order: 44, options: { choices: ["Good", "Weak - Monitor", "Replaced"] } },

      // Additional Work
      { label: "Additional Work", fieldName: "_section_additional", type: "SECTION_HEADER", order: 50 },
      { label: "Additional Work Performed", fieldName: "additional_work", type: "TEXTAREA", required: false, order: 51 },
      { label: "Recommendations for Future", fieldName: "recommendations", type: "TEXTAREA", required: false, order: 52 },

      // Sign Off
      { label: "Sign Off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 60 },
      { label: "Next Service Due (Date)", fieldName: "next_service_date", type: "DATE", required: false, order: 61 },
      { label: "Next Service Due (Mileage)", fieldName: "next_service_mileage", type: "NUMBER", required: false, order: 62 },
      { label: "Technician Name", fieldName: "technician_name", type: "TEXT", required: true, order: 63 },
      { label: "Technician Signature", fieldName: "technician_signature", type: "SIGNATURE", required: true, order: 64 },
      { label: "Date", fieldName: "signoff_date", type: "DATE", required: true, order: 65 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // WARRANTY CLAIM
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Warranty Claim",
    type: "WARRANTY_CLAIM",
    isPublic: false,
    publicSlug: "warranty-claim",
    fields: [
      // Vehicle Details
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Current Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 5 },
      { label: "Date of Purchase", fieldName: "purchase_date", type: "DATE", required: true, order: 6 },
      { label: "Mileage at Purchase", fieldName: "purchase_mileage", type: "NUMBER", required: true, order: 7 },

      // Customer Details
      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: true, order: 11 },
      { label: "Phone Number", fieldName: "customer_phone", type: "TEXT", required: true, order: 12 },
      { label: "Email Address", fieldName: "customer_email", type: "TEXT", required: false, order: 13 },
      { label: "Address", fieldName: "customer_address", type: "TEXTAREA", required: true, order: 14 },

      // Warranty Details
      { label: "Warranty Details", fieldName: "_section_warranty", type: "SECTION_HEADER", order: 20 },
      { label: "Warranty Type", fieldName: "warranty_type", type: "RADIO", required: true, order: 21, options: { choices: ["Dealer Warranty", "Manufacturer Warranty", "Extended Warranty", "Goodwill"] } },
      { label: "Warranty Provider", fieldName: "warranty_provider", type: "TEXT", required: false, order: 22 },
      { label: "Warranty Policy Number", fieldName: "warranty_policy", type: "TEXT", required: false, order: 23 },
      { label: "Warranty Expiry Date", fieldName: "warranty_expiry", type: "DATE", required: false, order: 24 },

      // Claim Details
      { label: "Claim Details", fieldName: "_section_claim", type: "SECTION_HEADER", order: 30 },
      { label: "Date Issue First Noticed", fieldName: "issue_date", type: "DATE", required: true, order: 31 },
      { label: "Mileage When Issue Noticed", fieldName: "issue_mileage", type: "NUMBER", required: false, order: 32 },
      { label: "Description of Fault/Issue", fieldName: "fault_description", type: "TEXTAREA", required: true, order: 33, helpText: "Please describe the problem in detail" },
      { label: "Symptoms", fieldName: "symptoms", type: "TEXTAREA", required: false, order: 34, placeholder: "e.g. noise, warning light, loss of power" },
      { label: "Is Vehicle Driveable?", fieldName: "driveable", type: "RADIO", required: true, order: 35, options: { choices: ["Yes", "Yes - With Caution", "No"] } },

      // Diagnosis
      { label: "Diagnosis", fieldName: "_section_diagnosis", type: "SECTION_HEADER", order: 40 },
      { label: "Diagnosis Findings", fieldName: "diagnosis", type: "TEXTAREA", required: false, order: 41 },
      { label: "Fault Codes", fieldName: "fault_codes", type: "TEXT", required: false, order: 42 },
      { label: "Repair Required", fieldName: "repair_required", type: "TEXTAREA", required: false, order: 43 },
      { label: "Parts Required", fieldName: "parts_required", type: "TEXTAREA", required: false, order: 44 },
      { label: "Estimated Labour (hours)", fieldName: "labour_hours", type: "NUMBER", required: false, order: 45 },
      { label: "Estimated Cost (£)", fieldName: "estimated_cost", type: "NUMBER", required: false, order: 46 },

      // Claim Status
      { label: "Claim Status", fieldName: "_section_status", type: "SECTION_HEADER", order: 50 },
      { label: "Claim Status", fieldName: "claim_status", type: "RADIO", required: true, order: 51, options: { choices: ["Pending Review", "Approved", "Partially Approved", "Rejected", "Completed"] } },
      { label: "Approved Amount (£)", fieldName: "approved_amount", type: "NUMBER", required: false, order: 52 },
      { label: "Rejection Reason", fieldName: "rejection_reason", type: "TEXTAREA", required: false, order: 53 },

      // Evidence
      { label: "Evidence", fieldName: "_section_evidence", type: "SECTION_HEADER", order: 60 },
      { label: "Photos of Issue", fieldName: "photos", type: "FILE", required: false, order: 61 },
      { label: "Service History Available?", fieldName: "service_history", type: "RADIO", required: true, order: 62, options: { choices: ["Yes - Full", "Yes - Partial", "No"] } },

      // Sign Off
      { label: "Sign Off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 70 },
      { label: "Claim Raised By", fieldName: "raised_by", type: "TEXT", required: true, order: 71 },
      { label: "Date", fieldName: "claim_date", type: "DATE", required: true, order: 72 },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: false, order: 73 },
      { label: "Staff Signature", fieldName: "staff_signature", type: "SIGNATURE", required: true, order: 74 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELIVERY
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Vehicle Delivery",
    type: "DELIVERY",
    isPublic: false,
    publicSlug: "delivery",
    fields: [
      // Vehicle Details
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Colour", fieldName: "colour", type: "TEXT", required: false, order: 5 },
      { label: "VIN", fieldName: "vin", type: "TEXT", required: false, order: 6 },
      { label: "Mileage at Delivery", fieldName: "mileage", type: "NUMBER", required: true, order: 7 },

      // Customer Details
      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: true, order: 11 },
      { label: "Phone Number", fieldName: "customer_phone", type: "TEXT", required: true, order: 12 },
      { label: "Email Address", fieldName: "customer_email", type: "TEXT", required: false, order: 13 },

      // Delivery Checklist
      { label: "Pre-Delivery Checklist", fieldName: "_section_checklist", type: "SECTION_HEADER", order: 20 },
      { label: "PDI Completed?", fieldName: "pdi_complete", type: "RADIO", required: true, order: 21, options: { choices: ["Yes", "No"] } },
      { label: "Vehicle Valeted?", fieldName: "valeted", type: "RADIO", required: true, order: 22, options: { choices: ["Yes", "No"] } },
      { label: "Fuel Level", fieldName: "fuel_level", type: "RADIO", required: true, order: 23, options: { choices: ["Full", "3/4", "1/2", "1/4"] } },
      { label: "Number of Keys Provided", fieldName: "keys_provided", type: "RADIO", required: true, order: 24, options: { choices: ["1", "2", "3+"] } },
      { label: "Locking Wheel Nut Present?", fieldName: "locking_nut", type: "RADIO", required: true, order: 25, options: { choices: ["Yes", "N/A"] } },
      { label: "Service Book Present?", fieldName: "service_book", type: "RADIO", required: true, order: 26, options: { choices: ["Yes", "No", "Digital"] } },
      { label: "Owner's Manual Present?", fieldName: "owners_manual", type: "RADIO", required: true, order: 27, options: { choices: ["Yes", "No", "Digital"] } },
      { label: "V5C Given/Posted?", fieldName: "v5c", type: "RADIO", required: true, order: 28, options: { choices: ["Given to Customer", "Will Be Posted", "DVLA Processing"] } },
      { label: "MOT Certificate (if applicable)", fieldName: "mot_certificate", type: "RADIO", required: true, order: 29, options: { choices: ["Given", "N/A - New Vehicle", "N/A - Exempt"] } },

      // Handover Items
      { label: "Customer Handover", fieldName: "_section_handover", type: "SECTION_HEADER", order: 30 },
      { label: "Controls Explained?", fieldName: "controls_explained", type: "RADIO", required: true, order: 31, options: { choices: ["Yes", "Customer Declined"] } },
      { label: "Sat Nav/Infotainment Explained?", fieldName: "satnav_explained", type: "RADIO", required: true, order: 32, options: { choices: ["Yes", "N/A", "Customer Declined"] } },
      { label: "Bluetooth Paired?", fieldName: "bluetooth_paired", type: "RADIO", required: true, order: 33, options: { choices: ["Yes", "Customer Declined", "N/A"] } },
      { label: "Service Schedule Explained?", fieldName: "service_explained", type: "RADIO", required: true, order: 34, options: { choices: ["Yes", "Customer Declined"] } },
      { label: "Warranty Explained?", fieldName: "warranty_explained", type: "RADIO", required: true, order: 35, options: { choices: ["Yes", "Customer Declined"] } },

      // Documentation
      { label: "Documentation", fieldName: "_section_docs", type: "SECTION_HEADER", order: 40 },
      { label: "Invoice Provided?", fieldName: "invoice_provided", type: "RADIO", required: true, order: 41, options: { choices: ["Yes", "Will Be Emailed", "Will Be Posted"] } },
      { label: "Finance Documents (if applicable)", fieldName: "finance_docs", type: "RADIO", required: false, order: 42, options: { choices: ["Signed", "N/A"] } },
      { label: "Insurance Confirmed?", fieldName: "insurance_confirmed", type: "RADIO", required: true, order: 43, options: { choices: ["Yes - Confirmed", "Trade Policy Applied", "Customer to Arrange"] } },

      // Sign Off
      { label: "Delivery Sign Off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 50 },
      { label: "Date of Delivery", fieldName: "delivery_date", type: "DATE", required: true, order: 51 },
      { label: "Time of Delivery", fieldName: "delivery_time", type: "TIME", required: true, order: 52 },
      { label: "Customer Satisfied?", fieldName: "customer_satisfied", type: "RADIO", required: true, order: 53, options: { choices: ["Yes", "Issues Noted Below"] } },
      { label: "Issues/Notes", fieldName: "notes", type: "TEXTAREA", required: false, order: 54 },
      { label: "Delivered By (Staff Name)", fieldName: "delivered_by", type: "TEXT", required: true, order: 55 },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: true, order: 56 },
      { label: "Staff Signature", fieldName: "staff_signature", type: "SIGNATURE", required: true, order: 57 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // REVIEW & FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Review & Feedback",
    type: "REVIEW_FEEDBACK",
    isPublic: true,
    publicSlug: "review",
    fields: [
      { label: "Your Experience", fieldName: "_section_experience", type: "SECTION_HEADER", order: 1 },
      { label: "Your Name", fieldName: "customer_name", type: "TEXT", required: true, order: 2 },
      { label: "Vehicle Purchased/Serviced", fieldName: "vehicle", type: "TEXT", required: false, order: 3 },
      { label: "Date of Visit", fieldName: "visit_date", type: "DATE", required: false, order: 4 },

      { label: "Rating", fieldName: "_section_rating", type: "SECTION_HEADER", order: 10 },
      { label: "Overall Experience", fieldName: "overall_rating", type: "RATING", required: true, order: 11 },
      { label: "Sales Staff", fieldName: "sales_rating", type: "RATING", required: false, order: 12 },
      { label: "Vehicle Condition", fieldName: "condition_rating", type: "RATING", required: false, order: 13 },
      { label: "Value for Money", fieldName: "value_rating", type: "RATING", required: false, order: 14 },

      { label: "Feedback", fieldName: "_section_feedback", type: "SECTION_HEADER", order: 20 },
      { label: "What did you like most?", fieldName: "positive_feedback", type: "TEXTAREA", required: false, order: 21 },
      { label: "What could we improve?", fieldName: "improvement_feedback", type: "TEXTAREA", required: false, order: 22 },
      { label: "Would you recommend us?", fieldName: "recommend", type: "RADIO", required: true, order: 23, options: { choices: ["Definitely", "Probably", "Not Sure", "Probably Not", "Definitely Not"] } },
      { label: "Can we contact you about your feedback?", fieldName: "can_contact", type: "RADIO", required: true, order: 24, options: { choices: ["Yes", "No"] } },
      { label: "Contact Email/Phone", fieldName: "contact_details", type: "TEXT", required: false, order: 25 },

      { label: "Submission", fieldName: "_section_submit", type: "SECTION_HEADER", order: 30 },
      { label: "Date", fieldName: "submission_date", type: "DATE", required: true, order: 31 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function reseedAllForms() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!\n");

    // Get the first dealer
    const dealer = await Dealer.findOne().lean();
    if (!dealer) {
      console.error("No dealer found. Please set up a dealer first.");
      process.exit(1);
    }
    console.log(`Found dealer: ${dealer.name}`);
    const dealerId = dealer._id;

    console.log("\n" + "═".repeat(60));
    console.log("RESEEDING ALL FORMS");
    console.log("═".repeat(60) + "\n");

    for (const template of FORM_TEMPLATES) {
      console.log(`\n▶ ${template.name} (${template.type})`);
      console.log("─".repeat(40));

      // Check if form already exists
      let form = await Form.findOne({ dealerId, type: template.type });

      if (form) {
        // Delete ALL existing fields for this form
        const deletedCount = await FormField.deleteMany({ formId: form._id });
        console.log(`  ✓ Deleted ${deletedCount.deletedCount} existing fields`);

        // Update form with latest introText and termsText
        await Form.findByIdAndUpdate(form._id, {
          introText: template.introText || null,
          termsText: template.termsText || null,
        });
        console.log(`  ✓ Updated form text`);
      } else {
        // Create new form
        form = await Form.create({
          dealerId,
          name: template.name,
          type: template.type,
          isPublic: template.isPublic || false,
          publicSlug: template.publicSlug,
          introText: template.introText || null,
          termsText: template.termsText || null,
        });
        console.log(`  ✓ Created new form`);
      }

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
        });
        fieldCount++;
      }
      console.log(`  ✓ Created ${fieldCount} fields`);
    }

    console.log("\n" + "═".repeat(60));
    console.log("SUMMARY");
    console.log("═".repeat(60) + "\n");

    // Summary
    const forms = await Form.find({ dealerId }).sort({ type: 1 });
    for (const form of forms) {
      const fieldCount = await FormField.countDocuments({ formId: form._id });
      const visibleCount = await FormField.countDocuments({ formId: form._id, visible: true });
      console.log(`  ${form.type.padEnd(20)} │ ${fieldCount} fields (${visibleCount} visible)`);
    }

    await mongoose.disconnect();
    console.log("\n✅ All forms reseeded successfully!\n");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

reseedAllForms();
