// Run with: node scripts/reseed-forms-pdf-match.js
// This script reseeds ALL forms to EXACTLY match the PDF templates

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

// Define schemas
const dealerSchema = new mongoose.Schema({ name: String });
const formSchema = new mongoose.Schema({
  dealerId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
  isPublic: Boolean,
  publicSlug: String,
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
// FORM TEMPLATES - EXACT MATCH TO PDFs
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_TEMPLATES = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST DRIVE REQUEST - EXACT MATCH TO PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Test Drive Request",
    type: "TEST_DRIVE",
    isPublic: true,
    publicSlug: "test-drive",
    fields: [
      { label: "Date", fieldName: "date", type: "DATE", required: true, order: 1 },
      { label: "First Name", fieldName: "first_name", type: "TEXT", required: true, order: 2 },
      { label: "Last Name", fieldName: "last_name", type: "TEXT", required: true, order: 3 },
      { label: "E-mail", fieldName: "email", type: "TEXT", required: true, order: 4 },
      { label: "Mobile", fieldName: "mobile", type: "TEXT", required: true, order: 5 },
      { label: "Upload Photo of Driving Licence", fieldName: "licence_photo", type: "FILE", required: true, order: 6, helpText: "Please upload a clear photo of your driving licence" },

      // Address section
      { label: "Address (If different from licence)", fieldName: "_section_address", type: "SECTION_HEADER", order: 10 },
      { label: "Street Address", fieldName: "street_address", type: "TEXT", required: false, order: 11 },
      { label: "Street Address Line 2", fieldName: "street_address_2", type: "TEXT", required: false, order: 12 },
      { label: "City", fieldName: "city", type: "TEXT", required: false, order: 13 },
      { label: "Post Code", fieldName: "postcode", type: "TEXT", required: false, order: 14 },

      // Vehicle section
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 20 },
      { label: "Vehicle Make", fieldName: "vehicle_make", type: "TEXT", required: true, order: 21, placeholder: "For example: Audi" },
      { label: "Vehicle Model", fieldName: "vehicle_model", type: "TEXT", required: true, order: 22, placeholder: "For example: A3" },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 23, vrmLookup: true },
      { label: "Where did you find the vehicle advertised?", fieldName: "source", type: "DROPDOWN", required: true, order: 24, options: { choices: ["AutoTrader", "eBay", "Facebook", "Google", "Gumtree", "Referral", "Other"] } },

      // Terms - displayed as paragraph, checkbox at end
      { label: "Terms & Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 30 },
      { label: "I have read, understood and agree to abide by the terms & conditions.", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 31 },

      // Signature and time
      { label: "Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 40 },
      { label: "Time", fieldName: "time", type: "TIME", required: true, order: 41 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // COURTESY CAR OUT - EXACT MATCH TO PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Courtesy Car Out",
    type: "COURTESY_OUT",
    isPublic: true,
    publicSlug: "courtesy-out",
    fields: [
      // Vehicle Information
      { label: "Vehicle Information", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Select Vehicle", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 2, vrmLookup: true, helpText: "Select from courtesy vehicles" },
      { label: "Current Mileage", fieldName: "mileage_out", type: "NUMBER", required: true, order: 3 },
      { label: "Date Out", fieldName: "date_out", type: "DATE", required: true, order: 4 },
      { label: "Time Out", fieldName: "time_out", type: "TIME", required: true, order: 5 },

      // Driver Information
      { label: "Driver's Information", fieldName: "_section_driver", type: "SECTION_HEADER", order: 10 },
      { label: "First Name", fieldName: "driver_first_name", type: "TEXT", required: true, order: 11 },
      { label: "Last Name", fieldName: "driver_last_name", type: "TEXT", required: true, order: 12 },
      { label: "Mobile Number", fieldName: "driver_mobile", type: "TEXT", required: true, order: 13 },
      { label: "Date of Birth", fieldName: "driver_dob", type: "DATE", required: true, order: 14 },
      { label: "Street Address", fieldName: "driver_street", type: "TEXT", required: true, order: 15 },
      { label: "City", fieldName: "driver_city", type: "TEXT", required: true, order: 16 },
      { label: "County", fieldName: "driver_county", type: "TEXT", required: false, order: 17 },
      { label: "Postcode", fieldName: "driver_postcode", type: "TEXT", required: true, order: 18 },

      // Additional Driver
      { label: "Additional Driver (Optional)", fieldName: "_section_additional", type: "SECTION_HEADER", order: 20 },
      { label: "Additional Driver First Name", fieldName: "additional_first_name", type: "TEXT", required: false, order: 21 },
      { label: "Additional Driver Last Name", fieldName: "additional_last_name", type: "TEXT", required: false, order: 22 },
      { label: "Additional Driver Mobile", fieldName: "additional_mobile", type: "TEXT", required: false, order: 23 },
      { label: "Additional Driver Date of Birth", fieldName: "additional_dob", type: "DATE", required: false, order: 24 },
      { label: "Additional Driver Street Address", fieldName: "additional_street", type: "TEXT", required: false, order: 25 },
      { label: "Additional Driver City", fieldName: "additional_city", type: "TEXT", required: false, order: 26 },
      { label: "Additional Driver Postcode", fieldName: "additional_postcode", type: "TEXT", required: false, order: 27 },

      // Licence
      { label: "Driving Licence", fieldName: "_section_licence", type: "SECTION_HEADER", order: 30 },
      { label: "Upload Photo of Driving Licence", fieldName: "licence_photo", type: "FILE", required: true, order: 31, helpText: "Please upload front and back of licence" },

      // Terms
      { label: "Terms and Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 40 },
      { label: "I agree to the Terms and Conditions", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 41 },

      // Condition Report
      { label: "Condition Report", fieldName: "_section_condition", type: "SECTION_HEADER", order: 50 },
      { label: "Existing Damage Notes", fieldName: "existing_damage", type: "TEXTAREA", required: false, order: 51, helpText: "Note any existing damage to the vehicle" },

      // Fuel Level
      { label: "Fuel Level", fieldName: "_section_fuel", type: "SECTION_HEADER", order: 60 },
      { label: "Fuel Level", fieldName: "fuel_level", type: "RADIO", required: true, order: 61, options: { choices: ["EMPTY", "1/4 TANK", "1/2 TANK", "3/4 TANK", "FULL TANK"] } },
      { label: "I agree to return the vehicle with the same fuel level", fieldName: "fuel_agreement", type: "BOOLEAN", required: true, order: 62 },

      // Signature
      { label: "Driver Signature", fieldName: "driver_signature", type: "SIGNATURE", required: true, order: 70 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // COURTESY CAR RETURN - EXACT MATCH TO PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Courtesy Car Return",
    type: "COURTESY_IN",
    isPublic: false,
    publicSlug: "courtesy-in",
    fields: [
      // Vehicle Information
      { label: "Vehicle Information", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Select Vehicle", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Date Returned", fieldName: "date_in", type: "DATE", required: true, order: 3 },
      { label: "Time Returned", fieldName: "time_in", type: "TIME", required: true, order: 4 },

      // Driver Information
      { label: "Driver's Information", fieldName: "_section_driver", type: "SECTION_HEADER", order: 10 },
      { label: "First Name", fieldName: "driver_first_name", type: "TEXT", required: true, order: 11 },
      { label: "Last Name", fieldName: "driver_last_name", type: "TEXT", required: true, order: 12 },

      // Return Conditions
      { label: "Return Conditions", fieldName: "_section_conditions", type: "SECTION_HEADER", order: 20 },
      { label: "I agree to the return terms and conditions", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 21 },

      // Fuel
      { label: "Fuel Level", fieldName: "_section_fuel", type: "SECTION_HEADER", order: 30 },
      { label: "I confirm fuel level is as agreed", fieldName: "fuel_agreement", type: "BOOLEAN", required: true, order: 31 },

      // Disclosure
      { label: "Disclosure", fieldName: "_section_disclosure", type: "SECTION_HEADER", order: 40 },
      { label: "Disclosure/Notes", fieldName: "disclosure_notes", type: "TEXTAREA", required: false, order: 41, helpText: "Report any issues, damage, or incidents" },

      // Signature
      { label: "Driver Signature", fieldName: "driver_signature", type: "SIGNATURE", required: true, order: 50 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELIVERY FORM - EXACT MATCH TO PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Vehicle Delivery",
    type: "DELIVERY",
    isPublic: false,
    publicSlug: "delivery",
    fields: [
      { label: "Customer First Name", fieldName: "customer_first_name", type: "TEXT", required: true, order: 1 },
      { label: "Customer Last Name", fieldName: "customer_last_name", type: "TEXT", required: true, order: 2 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 3, vrmLookup: true, helpText: "Vehicle status will be changed to DELIVERED" },
      { label: "Photo of Invoice with ID", fieldName: "invoice_photo", type: "FILE", required: false, order: 4 },
      { label: "Photo of Customer with Vehicle", fieldName: "customer_photo", type: "FILE", required: false, order: 5 },
      { label: "Date", fieldName: "delivery_date", type: "DATE", required: true, order: 6 },
      { label: "Time", fieldName: "delivery_time", type: "TIME", required: true, order: 7 },
      { label: "Do you consent for the delivery photo to be used online?", fieldName: "photo_consent", type: "RADIO", required: true, order: 8, options: { choices: ["Yes", "No"] } },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: true, order: 9 },
      { label: "Staff Member First Name", fieldName: "staff_first_name", type: "TEXT", required: true, order: 10 },
      { label: "Staff Member Last Name", fieldName: "staff_last_name", type: "TEXT", required: true, order: 11 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVICE RECEIPT - EXACT MATCH TO PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Service Receipt",
    type: "SERVICE_RECEIPT",
    isPublic: false,
    publicSlug: "service-receipt",
    fields: [
      { label: "Registration", fieldName: "vrm", type: "TEXT", required: true, order: 1, vrmLookup: true },
      { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 2 },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },

      // Work Carried Out
      { label: "Work Carried Out", fieldName: "_section_work", type: "SECTION_HEADER", order: 10 },
      { label: "Oil Filter", fieldName: "oil_filter", type: "BOOLEAN", required: false, order: 11 },
      { label: "Air Filter", fieldName: "air_filter", type: "BOOLEAN", required: false, order: 12 },
      { label: "Cabin Filter", fieldName: "cabin_filter", type: "BOOLEAN", required: false, order: 13 },
      { label: "Spark Plugs", fieldName: "spark_plugs", type: "BOOLEAN", required: false, order: 14 },
      { label: "Pre-Delivery Inspection", fieldName: "pdi_done", type: "BOOLEAN", required: false, order: 15 },
      { label: "Additional Works", fieldName: "additional_works", type: "TEXTAREA", required: false, order: 16 },

      { label: "Date Carried Out", fieldName: "service_date", type: "DATE", required: true, order: 20 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // WARRANTY CLAIM - EXACT MATCH TO PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Warranty Claim",
    type: "WARRANTY_CLAIM",
    isPublic: true,
    publicSlug: "warranty-claim",
    fields: [
      // Purchase Information
      { label: "Purchase Information", fieldName: "_section_purchase", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration at Time of Purchase", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true, helpText: "Enter the registration the vehicle had when you purchased it, not any private plate" },
      { label: "Purchase Date", fieldName: "purchase_date", type: "DATE", required: true, order: 3 },
      { label: "Vehicle Make and Model", fieldName: "make_model", type: "TEXT", required: false, order: 4, helpText: "Auto-filled if vehicle found" },
      { label: "Exact Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 5 },

      // Issue Description
      { label: "Issue Details", fieldName: "_section_issue", type: "SECTION_HEADER", order: 10 },
      { label: "Please describe the issue in as much detail as possible", fieldName: "issue_description", type: "TEXTAREA", required: true, order: 11, helpText: "Include when the issue first started, any lights on the dash, noises, symptoms etc." },
      { label: "Upload pictures/videos to support your claim", fieldName: "evidence_files", type: "FILE", required: false, order: 12 },

      // Warranty Type
      { label: "Warranty Type", fieldName: "warranty_type", type: "DROPDOWN", required: true, order: 13, options: { choices: ["3 Month Warranty", "6 Month Warranty", "12 Month Warranty", "Extended Warranty"] } },

      // Customer Details
      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 20 },
      { label: "First Name", fieldName: "customer_first_name", type: "TEXT", required: true, order: 21 },
      { label: "Last Name", fieldName: "customer_last_name", type: "TEXT", required: true, order: 22 },
      { label: "Email", fieldName: "customer_email", type: "TEXT", required: true, order: 23 },
      { label: "Phone Number", fieldName: "customer_phone", type: "TEXT", required: true, order: 24 },
      { label: "Street Address", fieldName: "street_address", type: "TEXT", required: true, order: 25 },
      { label: "Street Address Line 2", fieldName: "street_address_2", type: "TEXT", required: false, order: 26 },
      { label: "City", fieldName: "city", type: "TEXT", required: true, order: 27 },
      { label: "County", fieldName: "county", type: "TEXT", required: false, order: 28 },
      { label: "Postal Code", fieldName: "postcode", type: "TEXT", required: true, order: 29 },

      // Terms
      { label: "Terms", fieldName: "_section_terms", type: "SECTION_HEADER", order: 30 },
      { label: "I agree and I have read the terms and conditions details above", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 31 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // PDI - PRE-DELIVERY INSPECTION - EXACT MATCH TO PDF (107 FIELDS)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "PDI (Pre-Delivery Inspection)",
    type: "PDI",
    isPublic: false,
    publicSlug: "pdi",
    fields: [
      // VEHICLE INFO
      { label: "Vehicle Information", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Vehicle Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Vehicle Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 5 },
      { label: "Colour", fieldName: "colour", type: "TEXT", required: true, order: 6 },
      { label: "Number of Keys", fieldName: "num_keys", type: "RADIO", required: true, order: 7, options: { choices: ["1", "2"] } },

      // INTERIOR CHECKS
      { label: "Interior Checks", fieldName: "_section_interior", type: "SECTION_HEADER", order: 10 },
      { label: "Seat Adjustment Operation", fieldName: "seat_adjustment", type: "RADIO", required: true, order: 11, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Seat Belt Operation Front/Rear", fieldName: "seat_belts", type: "RADIO", required: true, order: 12, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Sun Visor and Sunroof", fieldName: "sun_visor_sunroof", type: "RADIO", required: true, order: 13, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Glove Box", fieldName: "glove_box", type: "RADIO", required: true, order: 14, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Window Operation Front", fieldName: "window_front", type: "RADIO", required: true, order: 15, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Window Operation Rear", fieldName: "window_rear", type: "RADIO", required: true, order: 16, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Wipers Operation Front/Rear", fieldName: "wipers", type: "RADIO", required: true, order: 17, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Washer Operation", fieldName: "washer", type: "RADIO", required: true, order: 18, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Sat Nav Operates (if present)", fieldName: "sat_nav", type: "RADIO", required: true, order: 19, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Horn Operation", fieldName: "horn", type: "RADIO", required: true, order: 20, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Fuel Gauge Operation", fieldName: "fuel_gauge", type: "RADIO", required: true, order: 21, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Temp Gauge Operation", fieldName: "temp_gauge", type: "RADIO", required: true, order: 22, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Dash Light Operation", fieldName: "dash_lights", type: "RADIO", required: true, order: 23, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Audio System Speakers", fieldName: "audio_speakers", type: "RADIO", required: true, order: 24, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Audio Steering Wheel Controls", fieldName: "audio_controls", type: "RADIO", required: true, order: 25, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Rear Camera (if present)", fieldName: "rear_camera", type: "RADIO", required: true, order: 26, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Rear Parking Sensors (if present)", fieldName: "parking_sensors_rear", type: "RADIO", required: true, order: 27, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Front Parking Sensors (if present)", fieldName: "parking_sensors_front", type: "RADIO", required: true, order: 28, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Clock Functions", fieldName: "clock", type: "RADIO", required: true, order: 29, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Steering Wheel Tilt/Lock", fieldName: "steering_tilt", type: "RADIO", required: true, order: 30, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "12V Power Outlet", fieldName: "power_outlet", type: "RADIO", required: true, order: 31, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Outside Mirror Operation", fieldName: "outside_mirrors", type: "RADIO", required: true, order: 32, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Electric Mirror Folding", fieldName: "mirror_folding", type: "RADIO", required: true, order: 33, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Rear View Mirror Operation", fieldName: "rear_view_mirror", type: "RADIO", required: true, order: 34, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Seat Belt Operation/Condition", fieldName: "seat_belt_condition", type: "RADIO", required: true, order: 35, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Heated Seats (if present)", fieldName: "heated_seats", type: "RADIO", required: true, order: 36, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Air Conditioning", fieldName: "air_con", type: "RADIO", required: true, order: 37, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Key Fob(s) Work", fieldName: "key_fobs", type: "RADIO", required: true, order: 38, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },

      // EQUIPMENT CHECKS
      { label: "Equipment Checks", fieldName: "_section_equipment", type: "SECTION_HEADER", order: 40 },
      { label: "Jack and Wrench (if present)", fieldName: "jack_wrench", type: "RADIO", required: true, order: 41, options: { choices: ["PRESENT", "TYRE COMPRESSOR & FOAM", "NOT APPLICABLE"] } },
      { label: "Locking Wheel Nut Location (if present)", fieldName: "locking_nut_location", type: "TEXT", required: false, order: 42 },
      { label: "Parcel Shelf", fieldName: "parcel_shelf", type: "RADIO", required: true, order: 43, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },

      // EXTERIOR CHECKS
      { label: "Exterior Checks", fieldName: "_section_exterior", type: "SECTION_HEADER", order: 50 },
      { label: "Wiper Blades Front (Visual)", fieldName: "wiper_blades_front", type: "RADIO", required: true, order: 51, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Wiper Blades Rear (Visual)", fieldName: "wiper_blades_rear", type: "RADIO", required: true, order: 52, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Bonnet Operates & Locks", fieldName: "bonnet", type: "RADIO", required: true, order: 53, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Boot Operates and Locks", fieldName: "boot", type: "RADIO", required: true, order: 54, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Door Locks", fieldName: "door_locks", type: "RADIO", required: true, order: 55, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Central Locking Operates", fieldName: "central_locking", type: "RADIO", required: true, order: 56, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Exhaust Condition", fieldName: "exhaust", type: "RADIO", required: true, order: 57, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Fuel Cap Operates", fieldName: "fuel_cap", type: "RADIO", required: true, order: 58, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Tyre Pressures", fieldName: "tyre_pressures_check", type: "RADIO", required: true, order: 59, options: { choices: ["OKAY"] } },
      { label: "Aerial Mast", fieldName: "aerial", type: "RADIO", required: true, order: 60, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Wing Mirrors Condition", fieldName: "wing_mirrors", type: "RADIO", required: true, order: 61, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },

      // TYRES
      { label: "Tyres", fieldName: "_section_tyres", type: "SECTION_HEADER", order: 70 },
      { label: "Tyre Size Front", fieldName: "tyre_size_front", type: "TEXT", required: true, order: 71 },
      { label: "Front Tyres Runflat?", fieldName: "front_runflat", type: "RADIO", required: true, order: 72, options: { choices: ["YES", "NO"] } },
      { label: "Tyre Size Rear (if different)", fieldName: "tyre_size_rear", type: "TEXT", required: false, order: 73 },
      { label: "Rear Tyres Runflat?", fieldName: "rear_runflat", type: "RADIO", required: true, order: 74, options: { choices: ["YES", "NO"] } },
      { label: "Offside Front Tyre Depth (mm)", fieldName: "tyre_depth_osf", type: "TEXT", required: true, order: 75 },
      { label: "Nearside Front Tyre Depth (mm)", fieldName: "tyre_depth_nsf", type: "TEXT", required: true, order: 76 },
      { label: "Nearside Rear Tyre Depth (mm)", fieldName: "tyre_depth_nsr", type: "TEXT", required: true, order: 77 },
      { label: "Offside Rear Tyre Depth (mm)", fieldName: "tyre_depth_osr", type: "TEXT", required: true, order: 78 },

      // BRAKES
      { label: "Brakes", fieldName: "_section_brakes", type: "SECTION_HEADER", order: 80 },
      { label: "Offside Front Brake Pad Depth (mm)", fieldName: "brake_pad_osf", type: "TEXT", required: true, order: 81 },
      { label: "Nearside Front Brake Pad Depth (mm)", fieldName: "brake_pad_nsf", type: "TEXT", required: true, order: 82 },
      { label: "Nearside Rear Brake Pad Depth (mm)", fieldName: "brake_pad_nsr", type: "TEXT", required: true, order: 83 },
      { label: "Offside Rear Brake Pad Depth (mm)", fieldName: "brake_pad_osr", type: "TEXT", required: true, order: 84 },
      { label: "Wheel (Cracking/Rims/Damage)", fieldName: "wheel_condition", type: "RADIO", required: true, order: 85, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Tyre Pressure & Valves", fieldName: "tyre_valves", type: "RADIO", required: true, order: 86, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Tyre Condition (Perished/Cracks)", fieldName: "tyre_condition", type: "RADIO", required: true, order: 87, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Brake Discs", fieldName: "brake_discs", type: "RADIO", required: true, order: 88, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Windscreen Condition", fieldName: "windscreen", type: "RADIO", required: true, order: 89, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },

      // LIGHT CHECKS
      { label: "Light Checks", fieldName: "_section_lights", type: "SECTION_HEADER", order: 90 },
      { label: "Headlights", fieldName: "headlights", type: "RADIO", required: true, order: 91, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Brake Lights", fieldName: "brake_lights", type: "RADIO", required: true, order: 92, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Fog Lights", fieldName: "fog_lights", type: "RADIO", required: true, order: 93, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Reverse Light(s)", fieldName: "reverse_lights", type: "RADIO", required: true, order: 94, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Indicator Lights", fieldName: "indicator_lights", type: "RADIO", required: true, order: 95, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Number Plate Lights", fieldName: "number_plate_lights", type: "RADIO", required: true, order: 96, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Hazard Lights", fieldName: "hazard_lights", type: "RADIO", required: true, order: 97, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Interior Lights", fieldName: "interior_lights", type: "RADIO", required: true, order: 98, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },

      // ROAD TEST
      { label: "Road Test", fieldName: "_section_road_test", type: "SECTION_HEADER", order: 100 },
      { label: "Parking Brake", fieldName: "parking_brake", type: "RADIO", required: true, order: 101, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Steering Effort", fieldName: "steering_effort", type: "RADIO", required: true, order: 102, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Steering Wheel Central/Tracking", fieldName: "tracking", type: "RADIO", required: true, order: 103, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Cruise Control (if present)", fieldName: "cruise_control", type: "RADIO", required: true, order: 104, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Odometer", fieldName: "odometer_check", type: "RADIO", required: true, order: 105, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Heaters/Defrosters", fieldName: "heaters", type: "RADIO", required: true, order: 106, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Steering Vibration", fieldName: "steering_vibration", type: "RADIO", required: true, order: 107, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Brake Wobble Under Braking", fieldName: "brake_wobble", type: "RADIO", required: true, order: 108, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Suspension", fieldName: "suspension", type: "RADIO", required: true, order: 109, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "CV Joint / Axle Noise", fieldName: "cv_joint", type: "RADIO", required: true, order: 110, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Clutch", fieldName: "clutch", type: "RADIO", required: true, order: 111, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Gear Change", fieldName: "gear_change", type: "RADIO", required: true, order: 112, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },

      // ENGINE CHECKS
      { label: "Engine Checks", fieldName: "_section_engine", type: "SECTION_HEADER", order: 120 },
      { label: "Engine Oil Level", fieldName: "engine_oil", type: "RADIO", required: true, order: 121, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Brake Fluid Level", fieldName: "brake_fluid", type: "RADIO", required: true, order: 122, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Screen Wash Fluid Level", fieldName: "screen_wash", type: "RADIO", required: true, order: 123, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Coolant Level", fieldName: "coolant", type: "RADIO", required: true, order: 124, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Power Steering Level", fieldName: "power_steering", type: "RADIO", required: true, order: 125, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Battery Condition", fieldName: "battery", type: "RADIO", required: true, order: 126, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Coolant (Check Tanks/Leaks)", fieldName: "coolant_leaks", type: "RADIO", required: true, order: 127, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Ignition System Operation", fieldName: "ignition", type: "RADIO", required: true, order: 128, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Fuel System Operation", fieldName: "fuel_system", type: "RADIO", required: true, order: 129, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Radiator Condition", fieldName: "radiator", type: "RADIO", required: true, order: 130, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Cooling Fan Operation", fieldName: "cooling_fan", type: "RADIO", required: true, order: 131, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "DPF Soot Level Check (OBD)", fieldName: "dpf_soot", type: "RADIO", required: true, order: 132, options: { choices: ["OKAY", "REPAIR/REPLACE", "NOT APPLICABLE"] } },
      { label: "Speed Limiter (Ford Only)", fieldName: "speed_limiter", type: "RADIO", required: false, order: 133, options: { choices: ["YES", "NO", "NOT APPLICABLE"] } },

      // SIGN OFF
      { label: "Sign Off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 140 },
      { label: "Notes/Any Recommendations", fieldName: "notes", type: "TEXTAREA", required: false, order: 141 },
      { label: "PDI Carried Out By - First Name", fieldName: "inspector_first_name", type: "TEXT", required: true, order: 142 },
      { label: "PDI Carried Out By - Last Name", fieldName: "inspector_last_name", type: "TEXT", required: true, order: 143 },
      { label: "Date", fieldName: "pdi_date", type: "DATE", required: true, order: 144 },

      // CUSTOMER CONFIRMATION
      { label: "Customer Confirmation", fieldName: "_section_customer", type: "SECTION_HEADER", order: 150 },
      { label: "I have checked through the vehicle documents", fieldName: "checked_documents", type: "BOOLEAN", required: false, order: 151 },
      { label: "I have test driven the vehicle", fieldName: "test_driven", type: "BOOLEAN", required: false, order: 152 },
      { label: "I have inspected the vehicle & am happy with the condition", fieldName: "inspected_happy", type: "BOOLEAN", required: false, order: 153 },
      { label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: false, order: 154 },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: false, order: 155 },
      { label: "Customer Signature Date", fieldName: "customer_signature_date", type: "DATE", required: false, order: 156 },
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
      { label: "Your Name", fieldName: "customer_name", type: "TEXT", required: true, order: 1 },
      { label: "Vehicle Purchased/Serviced", fieldName: "vehicle", type: "TEXT", required: false, order: 2 },
      { label: "Date of Visit", fieldName: "visit_date", type: "DATE", required: false, order: 3 },
      { label: "Overall Experience", fieldName: "overall_rating", type: "RATING", required: true, order: 4 },
      { label: "What did you like most?", fieldName: "positive_feedback", type: "TEXTAREA", required: false, order: 5 },
      { label: "What could we improve?", fieldName: "improvement_feedback", type: "TEXTAREA", required: false, order: 6 },
      { label: "Would you recommend us?", fieldName: "recommend", type: "RADIO", required: true, order: 7, options: { choices: ["Definitely", "Probably", "Not Sure", "Probably Not", "Definitely Not"] } },
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

    const dealer = await Dealer.findOne().lean();
    if (!dealer) {
      console.error("No dealer found.");
      process.exit(1);
    }
    console.log(`Dealer: ${dealer.name}`);
    const dealerId = dealer._id;

    console.log("\n" + "═".repeat(60));
    console.log("RESEEDING ALL FORMS - PDF MATCH");
    console.log("═".repeat(60) + "\n");

    for (const template of FORM_TEMPLATES) {
      console.log(`\n▶ ${template.name} (${template.type})`);
      console.log("─".repeat(40));

      let form = await Form.findOne({ dealerId, type: template.type });

      if (form) {
        const deletedCount = await FormField.deleteMany({ formId: form._id });
        console.log(`  ✓ Deleted ${deletedCount.deletedCount} existing fields`);
      } else {
        form = await Form.create({
          dealerId,
          name: template.name,
          type: template.type,
          isPublic: template.isPublic || false,
          publicSlug: template.publicSlug,
        });
        console.log(`  ✓ Created new form`);
      }

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

    const forms = await Form.find({ dealerId }).sort({ type: 1 });
    for (const form of forms) {
      const fieldCount = await FormField.countDocuments({ formId: form._id });
      console.log(`  ${form.type.padEnd(20)} │ ${fieldCount} fields`);
    }

    await mongoose.disconnect();
    console.log("\n✅ All forms reseeded to match PDFs!\n");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

reseedAllForms();
