// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️  DEPRECATED - DO NOT USE
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script DESTRUCTIVELY reseeds PDI form only, but uses inline templates
// which may be outdated and will overwrite any customizations.
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

// Load env file
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Safety check - require explicit acknowledgment
if (process.env.I_KNOW_WHAT_IM_DOING !== "true") {
  console.error("\n" + "═".repeat(70));
  console.error("⚠️  THIS SCRIPT IS DEPRECATED AND DESTRUCTIVE");
  console.error("═".repeat(70));
  console.error("\nThis script will DELETE existing PDI form fields and recreate them");
  console.error("from potentially outdated inline templates.\n");
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

// Define schemas inline since we can't use ES modules easily
const dealerSchema = new mongoose.Schema({
  name: String,
});

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

// PDI Template - matching the exact fields from the user's specification
const PDI_TEMPLATE = {
  name: "PDI (Pre-Delivery Inspection)",
  type: "PDI",
  isPublic: false,
  publicSlug: "pdi",
  fields: [
    // SECTION 1 - VEHICLE INFO
    { label: "Vehicle Information", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
    { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
    { label: "Vehicle Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
    { label: "Vehicle Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
    { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 5 },
    { label: "Colour", fieldName: "colour", type: "TEXT", required: false, order: 6 },
    { label: "Number of Keys", fieldName: "num_keys", type: "RADIO", required: true, order: 7, options: { choices: ["1", "2"] } },

    // SECTION 2 - INTERIOR CHECKS
    { label: "Interior Checks", fieldName: "_section_interior", type: "SECTION_HEADER", order: 10 },
    { label: "Seat Adjustment Operation", fieldName: "seat_adjustment", type: "RADIO", required: true, order: 11, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Seat Belt Operation Front/Rear", fieldName: "seat_belts", type: "RADIO", required: true, order: 12, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Sun Visor and Sunroof", fieldName: "sun_visor_sunroof", type: "RADIO", required: true, order: 13, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Glove Box", fieldName: "glove_box", type: "RADIO", required: true, order: 14, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Window Operation Front", fieldName: "window_front", type: "RADIO", required: true, order: 15, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Window Operation Rear", fieldName: "window_rear", type: "RADIO", required: true, order: 16, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Wipers Operation Front/Rear", fieldName: "wipers", type: "RADIO", required: true, order: 17, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Washer Operation", fieldName: "washer", type: "RADIO", required: true, order: 18, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Sat Nav (if present)", fieldName: "sat_nav", type: "RADIO", required: true, order: 19, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Horn Operation", fieldName: "horn", type: "RADIO", required: true, order: 20, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Fuel Gauge Operation", fieldName: "fuel_gauge", type: "RADIO", required: true, order: 21, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Temp Gauge Operation", fieldName: "temp_gauge", type: "RADIO", required: true, order: 22, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Dash Light Operation", fieldName: "dash_lights", type: "RADIO", required: true, order: 23, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Audio System/Speakers", fieldName: "audio_system", type: "RADIO", required: true, order: 24, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Audio Steering Wheel Controls", fieldName: "steering_audio_controls", type: "RADIO", required: true, order: 25, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Rear Camera (if present)", fieldName: "rear_camera", type: "RADIO", required: true, order: 26, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Rear Parking Sensors (if present)", fieldName: "parking_sensors_rear", type: "RADIO", required: true, order: 27, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Front Parking Sensors (if present)", fieldName: "parking_sensors_front", type: "RADIO", required: true, order: 28, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Clock Functions", fieldName: "clock", type: "RADIO", required: true, order: 29, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Steering Wheel Tilt/Lock", fieldName: "steering_tilt_lock", type: "RADIO", required: true, order: 30, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "12V Power Outlet", fieldName: "power_outlet_12v", type: "RADIO", required: true, order: 31, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Outside Mirror Operation", fieldName: "outside_mirrors", type: "RADIO", required: true, order: 32, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Electric Mirror Folding", fieldName: "mirror_folding", type: "RADIO", required: true, order: 33, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Rear View Mirror Operation", fieldName: "rear_view_mirror", type: "RADIO", required: true, order: 34, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Heated Seats (if present)", fieldName: "heated_seats", type: "RADIO", required: true, order: 35, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Air Conditioning", fieldName: "air_conditioning", type: "RADIO", required: true, order: 36, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Key Fob(s) Work", fieldName: "key_fobs", type: "RADIO", required: true, order: 37, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

    // SECTION 3 - EQUIPMENT CHECKS
    { label: "Equipment Checks", fieldName: "_section_equipment", type: "SECTION_HEADER", order: 40 },
    { label: "Jack and Wrench", fieldName: "jack_wrench", type: "RADIO", required: true, order: 41, options: { choices: ["Present", "Tyre Compressor & Foam", "N/A"] } },
    { label: "Locking Wheel Nut Location", fieldName: "locking_wheel_nut_location", type: "TEXT", required: false, order: 42 },
    { label: "Parcel Shelf", fieldName: "parcel_shelf", type: "RADIO", required: true, order: 43, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

    // SECTION 4 - EXTERIOR CHECKS
    { label: "Exterior Checks", fieldName: "_section_exterior", type: "SECTION_HEADER", order: 50 },
    { label: "Wiper Blades Front", fieldName: "wiper_blades_front", type: "RADIO", required: true, order: 51, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Wiper Blades Rear", fieldName: "wiper_blades_rear", type: "RADIO", required: true, order: 52, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Bonnet Operates & Locks", fieldName: "bonnet", type: "RADIO", required: true, order: 53, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Boot Operates & Locks", fieldName: "boot", type: "RADIO", required: true, order: 54, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Door Locks", fieldName: "door_locks", type: "RADIO", required: true, order: 55, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Central Locking", fieldName: "central_locking", type: "RADIO", required: true, order: 56, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Exhaust Condition", fieldName: "exhaust", type: "RADIO", required: true, order: 57, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Fuel Cap Operates", fieldName: "fuel_cap", type: "RADIO", required: true, order: 58, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Tyre Pressures", fieldName: "tyre_pressures_check", type: "RADIO", required: true, order: 59, options: { choices: ["Okay", "Needs Attention"] } },
    { label: "Aerial Mast", fieldName: "aerial", type: "RADIO", required: true, order: 60, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Wing Mirrors Condition", fieldName: "wing_mirrors", type: "RADIO", required: true, order: 61, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

    // SECTION 5 - TYRES & BRAKES
    { label: "Tyres & Brakes", fieldName: "_section_tyres", type: "SECTION_HEADER", order: 70 },
    { label: "Tyre Size Front", fieldName: "tyre_size_front", type: "TEXT", required: true, order: 71 },
    { label: "Front Tyres Runflat", fieldName: "front_runflat", type: "RADIO", required: true, order: 72, options: { choices: ["Yes", "No"] } },
    { label: "Tyre Size Rear (if different)", fieldName: "tyre_size_rear", type: "TEXT", required: false, order: 73 },
    { label: "Rear Tyres Runflat", fieldName: "rear_runflat", type: "RADIO", required: true, order: 74, options: { choices: ["Yes", "No"] } },
    { label: "Offside Front Tyre Depth (mm)", fieldName: "tyre_depth_osf", type: "TEXT", required: true, order: 75 },
    { label: "Nearside Front Tyre Depth (mm)", fieldName: "tyre_depth_nsf", type: "TEXT", required: true, order: 76 },
    { label: "Nearside Rear Tyre Depth (mm)", fieldName: "tyre_depth_nsr", type: "TEXT", required: true, order: 77 },
    { label: "Offside Rear Tyre Depth (mm)", fieldName: "tyre_depth_osr", type: "TEXT", required: true, order: 78 },
    { label: "Offside Front Brake Pad Depth (mm)", fieldName: "brake_pad_osf", type: "TEXT", required: true, order: 79 },
    { label: "Nearside Front Brake Pad Depth (mm)", fieldName: "brake_pad_nsf", type: "TEXT", required: true, order: 80 },
    { label: "Nearside Rear Brake Pad Depth (mm)", fieldName: "brake_pad_nsr", type: "TEXT", required: true, order: 81 },
    { label: "Offside Rear Brake Pad Depth (mm)", fieldName: "brake_pad_osr", type: "TEXT", required: true, order: 82 },
    { label: "Wheel Condition", fieldName: "wheel_condition", type: "RADIO", required: true, order: 83, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Tyre Pressure & Valves", fieldName: "tyre_pressure_valves", type: "RADIO", required: true, order: 84, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Tyre Condition", fieldName: "tyre_condition", type: "RADIO", required: true, order: 85, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Brake Discs", fieldName: "brake_discs", type: "RADIO", required: true, order: 86, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Windscreen Condition", fieldName: "windscreen", type: "RADIO", required: true, order: 87, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

    // SECTION 6 - LIGHT CHECKS
    { label: "Light Checks", fieldName: "_section_lights", type: "SECTION_HEADER", order: 90 },
    { label: "Headlights", fieldName: "headlights", type: "RADIO", required: true, order: 91, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Brake Lights", fieldName: "brake_lights", type: "RADIO", required: true, order: 92, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Fog Lights", fieldName: "fog_lights", type: "RADIO", required: true, order: 93, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Reverse Lights", fieldName: "reverse_lights", type: "RADIO", required: true, order: 94, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Indicator Lights", fieldName: "indicator_lights", type: "RADIO", required: true, order: 95, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Number Plate Lights", fieldName: "number_plate_lights", type: "RADIO", required: true, order: 96, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Hazard Lights", fieldName: "hazard_lights", type: "RADIO", required: true, order: 97, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Interior Lights", fieldName: "interior_lights", type: "RADIO", required: true, order: 98, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

    // SECTION 7 - ROAD TEST
    { label: "Road Test", fieldName: "_section_road_test", type: "SECTION_HEADER", order: 100 },
    { label: "Parking Brake", fieldName: "parking_brake", type: "RADIO", required: true, order: 101, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Steering Effort", fieldName: "steering_effort", type: "RADIO", required: true, order: 102, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Steering Wheel Central/Tracking", fieldName: "tracking", type: "RADIO", required: true, order: 103, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Cruise Control (if present)", fieldName: "cruise_control", type: "RADIO", required: true, order: 104, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Odometer", fieldName: "odometer", type: "RADIO", required: true, order: 105, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Heaters/Defrosters", fieldName: "heaters_defrosters", type: "RADIO", required: true, order: 106, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Steering Vibration", fieldName: "steering_vibration", type: "RADIO", required: true, order: 107, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Brake Wobble Under Braking", fieldName: "brake_wobble", type: "RADIO", required: true, order: 108, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Suspension", fieldName: "suspension", type: "RADIO", required: true, order: 109, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "CV Joint/Axle Noise", fieldName: "cv_joint_noise", type: "RADIO", required: true, order: 110, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Clutch", fieldName: "clutch", type: "RADIO", required: true, order: 111, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Gear Change", fieldName: "gear_change", type: "RADIO", required: true, order: 112, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

    // SECTION 8 - ENGINE CHECKS
    { label: "Engine Checks", fieldName: "_section_engine", type: "SECTION_HEADER", order: 120 },
    { label: "Engine Oil Level", fieldName: "engine_oil", type: "RADIO", required: true, order: 121, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Brake Fluid Level", fieldName: "brake_fluid", type: "RADIO", required: true, order: 122, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Screen Wash Fluid Level", fieldName: "screen_wash", type: "RADIO", required: true, order: 123, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Coolant Level", fieldName: "coolant", type: "RADIO", required: true, order: 124, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Power Steering Level", fieldName: "power_steering", type: "RADIO", required: true, order: 125, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Battery Condition", fieldName: "battery", type: "RADIO", required: true, order: 126, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Coolant (Check Tanks/Leaks)", fieldName: "coolant_leaks", type: "RADIO", required: true, order: 127, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Ignition System Operation", fieldName: "ignition_system", type: "RADIO", required: true, order: 128, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Fuel System Operation", fieldName: "fuel_system", type: "RADIO", required: true, order: 129, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Radiator Condition", fieldName: "radiator", type: "RADIO", required: true, order: 130, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Cooling Fan Operation", fieldName: "cooling_fan", type: "RADIO", required: true, order: 131, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "DPF Soot Level Check (OBD)", fieldName: "dpf_soot", type: "RADIO", required: true, order: 132, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
    { label: "Speed Limiter Ford Only", fieldName: "speed_limiter", type: "RADIO", required: false, order: 133, options: { choices: ["Yes", "No", "N/A"] } },

    // SECTION 9 - SIGN OFF
    { label: "Sign Off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 140 },
    { label: "Notes/Recommendations", fieldName: "notes", type: "TEXTAREA", required: false, order: 141 },
    { label: "PDI Carried Out By", fieldName: "inspector_name", type: "TEXT", required: true, order: 142 },
    { label: "Date", fieldName: "pdi_date", type: "DATE", required: true, order: 143 },
    { label: "Signature", fieldName: "inspector_signature", type: "SIGNATURE", required: true, order: 144 },
  ],
};

async function reseedPDI() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    // Get the first dealer
    const dealer = await Dealer.findOne().lean();
    if (!dealer) {
      console.error("No dealer found. Please set up a dealer first.");
      process.exit(1);
    }
    console.log(`Found dealer: ${dealer.name}`);
    const dealerId = dealer._id;

    console.log("\n=== RESEEDING PDI FORM ===\n");

    // Check if PDI form already exists
    let form = await Form.findOne({ dealerId, type: "PDI" });

    if (form) {
      // Delete ALL existing fields for this form
      const deletedCount = await FormField.deleteMany({ formId: form._id });
      console.log(`Deleted ${deletedCount.deletedCount} existing fields`);
    } else {
      // Create new form
      form = await Form.create({
        dealerId,
        name: PDI_TEMPLATE.name,
        type: PDI_TEMPLATE.type,
        isPublic: PDI_TEMPLATE.isPublic,
        publicSlug: PDI_TEMPLATE.publicSlug,
      });
      console.log("Created new PDI form");
    }

    // Create all fields from template
    let fieldCount = 0;
    for (const field of PDI_TEMPLATE.fields) {
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
    console.log(`Created ${fieldCount} fields`);

    // Verify
    const verifyCount = await FormField.countDocuments({ formId: form._id });
    console.log(`\nVerification: PDI form now has ${verifyCount} fields`);

    await mongoose.disconnect();
    console.log("\nDone! PDI form has been reseeded.");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

reseedPDI();
