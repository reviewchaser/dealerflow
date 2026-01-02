// Default form templates for new dealers
// Note: Appraisal forms are handled separately in the Appraisals section

// Field types available:
// TEXT, TEXTAREA, NUMBER, DATE, TIME, DATETIME, BOOLEAN, DROPDOWN, RADIO, FILE, SIGNATURE, RATING
// SECTION_HEADER (display only), PARAGRAPH (display only), CHECKLIST (multiple checkboxes)

export const FORM_TEMPLATES = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // PDI (Pre-Delivery Inspection) - Comprehensive 8-section form
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "PDI (Pre-Delivery Inspection)",
    type: "PDI",
    visibility: "SHARE_LINK", // Accessible via share link for 3rd parties (workshops, MOT centres)
    isPublic: false, // Deprecated - kept for backward compat
    publicSlug: "pdi",
    introText: "Complete all sections of this Pre-Delivery Inspection before vehicle handover.",
    vrmLookup: { enabled: true, statuses: ["IN_PREP", "ADVERTISED"] },
    fields: [
      // Section 1: Vehicle Info
      { label: "Vehicle Information", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Make", fieldName: "make", type: "TEXT", required: true, order: 3 },
      { label: "Model", fieldName: "model", type: "TEXT", required: true, order: 4 },
      { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 5 },
      { label: "Colour", fieldName: "colour", type: "TEXT", required: true, order: 6 },
      { label: "Number of Keys", fieldName: "num_keys", type: "RADIO", required: true, order: 7, options: { choices: ["1", "2", "3+"] } },

      // Section 2: Interior Checks
      { label: "Interior Checks", fieldName: "_section_interior", type: "SECTION_HEADER", order: 10 },
      { label: "Seat Adjustment", fieldName: "seat_adjustment", type: "RADIO", required: true, order: 11, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Seat Belts", fieldName: "seat_belts", type: "RADIO", required: true, order: 12, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Sun Visor/Sunroof", fieldName: "sun_visor", type: "RADIO", required: true, order: 13, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Glove Box", fieldName: "glove_box", type: "RADIO", required: true, order: 14, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Windows Front/Rear", fieldName: "windows", type: "RADIO", required: true, order: 15, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Wipers", fieldName: "wipers", type: "RADIO", required: true, order: 16, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Washer System", fieldName: "washer", type: "RADIO", required: true, order: 17, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Sat Nav", fieldName: "sat_nav", type: "RADIO", required: true, order: 18, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Horn", fieldName: "horn", type: "RADIO", required: true, order: 19, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Fuel Gauge", fieldName: "fuel_gauge", type: "RADIO", required: true, order: 20, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Temp Gauge", fieldName: "temp_gauge", type: "RADIO", required: true, order: 21, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Dash Lights", fieldName: "dash_lights", type: "RADIO", required: true, order: 22, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Audio System", fieldName: "audio_system", type: "RADIO", required: true, order: 23, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Steering Wheel Controls", fieldName: "steering_controls", type: "RADIO", required: true, order: 24, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Rear Camera", fieldName: "rear_camera", type: "RADIO", required: true, order: 25, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Parking Sensors Front", fieldName: "parking_sensors_front", type: "RADIO", required: true, order: 26, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Parking Sensors Rear", fieldName: "parking_sensors_rear", type: "RADIO", required: true, order: 27, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Clock", fieldName: "clock", type: "RADIO", required: true, order: 28, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Steering Tilt/Lock", fieldName: "steering_tilt", type: "RADIO", required: true, order: 29, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "12V Outlet", fieldName: "outlet_12v", type: "RADIO", required: true, order: 30, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Mirrors", fieldName: "mirrors", type: "RADIO", required: true, order: 31, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Heated Seats", fieldName: "heated_seats", type: "RADIO", required: true, order: 32, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Air Conditioning", fieldName: "air_con", type: "RADIO", required: true, order: 33, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },
      { label: "Key Fobs Working", fieldName: "key_fobs", type: "RADIO", required: true, order: 34, options: { choices: ["Okay", "Repair/Replace", "N/A"] } },

      // Section 3: Equipment
      { label: "Equipment Checks", fieldName: "_section_equipment", type: "SECTION_HEADER", order: 40 },
      { label: "Jack & Wrench", fieldName: "jack_wrench", type: "RADIO", required: true, order: 41, options: { choices: ["Present", "Missing", "N/A"] } },
      { label: "Locking Wheel Nut Location (if present)", fieldName: "locking_nut_location", type: "TEXT", required: false, order: 42 },
      { label: "Parcel Shelf", fieldName: "parcel_shelf", type: "RADIO", required: true, order: 43, options: { choices: ["Present", "Missing", "N/A"] } },

      // Section 4: Exterior
      { label: "Exterior Checks", fieldName: "_section_exterior", type: "SECTION_HEADER", order: 50 },
      { label: "Wiper Blades", fieldName: "wiper_blades", type: "RADIO", required: true, order: 51, options: { choices: ["Okay", "Replace", "N/A"] } },
      { label: "Bonnet", fieldName: "bonnet", type: "RADIO", required: true, order: 52, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Boot", fieldName: "boot", type: "RADIO", required: true, order: 53, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Door Locks", fieldName: "door_locks", type: "RADIO", required: true, order: 54, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Central Locking", fieldName: "central_locking", type: "RADIO", required: true, order: 55, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Exhaust", fieldName: "exhaust", type: "RADIO", required: true, order: 56, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Fuel Cap", fieldName: "fuel_cap", type: "RADIO", required: true, order: 57, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Aerial", fieldName: "aerial", type: "RADIO", required: true, order: 58, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Wing Mirrors", fieldName: "wing_mirrors", type: "RADIO", required: true, order: 59, options: { choices: ["Okay", "Repair", "N/A"] } },
      { label: "Windscreen Condition", fieldName: "windscreen", type: "RADIO", required: true, order: 60, options: { choices: ["Okay", "Chip", "Crack", "Replace"] } },

      // Tyres
      { label: "Tyres & Wheels", fieldName: "_section_tyres", type: "SECTION_HEADER", order: 70 },
      { label: "Tyre Size Front", fieldName: "tyre_size_front", type: "TEXT", required: true, order: 71 },
      { label: "Tyre Size Rear", fieldName: "tyre_size_rear", type: "TEXT", required: true, order: 72 },
      { label: "Runflat Tyres", fieldName: "runflat", type: "RADIO", required: true, order: 73, options: { choices: ["Yes", "No"] } },
      { label: "Tyre Depth - Front Left (mm)", fieldName: "tyre_depth_fl", type: "NUMBER", required: true, order: 74 },
      { label: "Tyre Depth - Front Right (mm)", fieldName: "tyre_depth_fr", type: "NUMBER", required: true, order: 75 },
      { label: "Tyre Depth - Rear Left (mm)", fieldName: "tyre_depth_rl", type: "NUMBER", required: true, order: 76 },
      { label: "Tyre Depth - Rear Right (mm)", fieldName: "tyre_depth_rr", type: "NUMBER", required: true, order: 77 },
      { label: "Brake Pad Depth - Front Left (mm)", fieldName: "brake_pad_fl", type: "NUMBER", required: true, order: 78 },
      { label: "Brake Pad Depth - Front Right (mm)", fieldName: "brake_pad_fr", type: "NUMBER", required: true, order: 79 },
      { label: "Brake Pad Depth - Rear Left (mm)", fieldName: "brake_pad_rl", type: "NUMBER", required: true, order: 80 },
      { label: "Brake Pad Depth - Rear Right (mm)", fieldName: "brake_pad_rr", type: "NUMBER", required: true, order: 81 },
      { label: "Wheels Condition", fieldName: "wheels_condition", type: "RADIO", required: true, order: 82, options: { choices: ["Good", "Minor Damage", "Needs Refurb"] } },
      { label: "Tyre Pressure/Valves", fieldName: "tyre_pressure", type: "RADIO", required: true, order: 83, options: { choices: ["Okay", "Adjusted", "Issue"] } },
      { label: "Brake Discs", fieldName: "brake_discs", type: "RADIO", required: true, order: 84, options: { choices: ["Okay", "Worn", "Replace"] } },

      // Section 5: Lights
      { label: "Light Checks", fieldName: "_section_lights", type: "SECTION_HEADER", order: 90 },
      { label: "Headlights", fieldName: "headlights", type: "RADIO", required: true, order: 91, options: { choices: ["Okay", "Replace Bulb", "Repair"] } },
      { label: "Brake Lights", fieldName: "brake_lights", type: "RADIO", required: true, order: 92, options: { choices: ["Okay", "Replace Bulb", "Repair"] } },
      { label: "Fog Lights", fieldName: "fog_lights", type: "RADIO", required: true, order: 93, options: { choices: ["Okay", "Replace Bulb", "N/A"] } },
      { label: "Reverse Lights", fieldName: "reverse_lights", type: "RADIO", required: true, order: 94, options: { choices: ["Okay", "Replace Bulb", "Repair"] } },
      { label: "Indicators", fieldName: "indicators", type: "RADIO", required: true, order: 95, options: { choices: ["Okay", "Replace Bulb", "Repair"] } },
      { label: "Number Plate Lights", fieldName: "number_plate_lights", type: "RADIO", required: true, order: 96, options: { choices: ["Okay", "Replace Bulb", "Repair"] } },
      { label: "Hazard Lights", fieldName: "hazard_lights", type: "RADIO", required: true, order: 97, options: { choices: ["Okay", "Repair"] } },
      { label: "Interior Lights", fieldName: "interior_lights", type: "RADIO", required: true, order: 98, options: { choices: ["Okay", "Replace Bulb", "Repair"] } },

      // Section 6: Road Test
      { label: "Road Test", fieldName: "_section_road_test", type: "SECTION_HEADER", order: 100 },
      { label: "Parking Brake", fieldName: "parking_brake", type: "RADIO", required: true, order: 101, options: { choices: ["Okay", "Adjust", "Repair"] } },
      { label: "Steering Effort", fieldName: "steering_effort", type: "RADIO", required: true, order: 102, options: { choices: ["Normal", "Heavy", "Light"] } },
      { label: "Tracking", fieldName: "tracking", type: "RADIO", required: true, order: 103, options: { choices: ["Okay", "Needs Alignment"] } },
      { label: "Cruise Control", fieldName: "cruise_control", type: "RADIO", required: true, order: 104, options: { choices: ["Okay", "Not Working", "N/A"] } },
      { label: "Odometer Matches", fieldName: "odometer_matches", type: "RADIO", required: true, order: 105, options: { choices: ["Yes", "No"] } },
      { label: "Heaters Working", fieldName: "heaters", type: "RADIO", required: true, order: 106, options: { choices: ["Okay", "Not Working"] } },
      { label: "Steering Vibration", fieldName: "steering_vibration", type: "RADIO", required: true, order: 107, options: { choices: ["None", "Minor", "Significant"] } },
      { label: "Brake Wobble", fieldName: "brake_wobble", type: "RADIO", required: true, order: 108, options: { choices: ["None", "Minor", "Significant"] } },
      { label: "Suspension", fieldName: "suspension", type: "RADIO", required: true, order: 109, options: { choices: ["Okay", "Noisy", "Repair"] } },
      { label: "CV Joints", fieldName: "cv_joints", type: "RADIO", required: true, order: 110, options: { choices: ["Okay", "Clicking", "Replace"] } },
      { label: "Clutch", fieldName: "clutch", type: "RADIO", required: true, order: 111, options: { choices: ["Okay", "Slipping", "N/A (Auto)"] } },
      { label: "Gear Change", fieldName: "gear_change", type: "RADIO", required: true, order: 112, options: { choices: ["OK", "Repair"] } },

      // Section 7: Engine
      { label: "Engine Checks", fieldName: "_section_engine", type: "SECTION_HEADER", order: 120 },
      { label: "Oil Level", fieldName: "oil_level", type: "RADIO", required: true, order: 121, options: { choices: ["Okay", "Low", "Topped Up"] } },
      { label: "Brake Fluid", fieldName: "brake_fluid", type: "RADIO", required: true, order: 122, options: { choices: ["Okay", "Low", "Topped Up"] } },
      { label: "Screen Wash", fieldName: "screen_wash", type: "RADIO", required: true, order: 123, options: { choices: ["Okay", "Low", "Topped Up"] } },
      { label: "Coolant Level", fieldName: "coolant_level", type: "RADIO", required: true, order: 124, options: { choices: ["Okay", "Low", "Topped Up"] } },
      { label: "Power Steering Fluid", fieldName: "power_steering", type: "RADIO", required: true, order: 125, options: { choices: ["Okay", "Low", "N/A (Electric)"] } },
      { label: "Battery Condition", fieldName: "battery", type: "RADIO", required: true, order: 126, options: { choices: ["Good", "Weak", "Replace"] } },
      { label: "Ignition", fieldName: "ignition", type: "RADIO", required: true, order: 127, options: { choices: ["Okay", "Issue"] } },
      { label: "Fuel System", fieldName: "fuel_system", type: "RADIO", required: true, order: 128, options: { choices: ["Okay", "Leak", "Issue"] } },
      { label: "Radiator", fieldName: "radiator", type: "RADIO", required: true, order: 129, options: { choices: ["Okay", "Leak", "Damage"] } },
      { label: "Cooling Fan", fieldName: "cooling_fan", type: "RADIO", required: true, order: 130, options: { choices: ["Working", "Not Working"] } },
      { label: "DPF Soot Level", fieldName: "dpf_soot", type: "RADIO", required: false, order: 131, options: { choices: ["OK", "Repair/Replace"] } },

      // Section 8: Issues Found (structured for automation)
      { label: "Issues Found", fieldName: "_section_issues", type: "SECTION_HEADER", order: 133 },
      { label: "Add issues that need attention. These will be automatically added to the vehicle's issue list.", fieldName: "_issues_help", type: "PARAGRAPH", order: 134 },
      { label: "Issues", fieldName: "pdi_issues", type: "PDI_ISSUES", required: false, order: 135 },

      // Section 9: Sign-off
      { label: "Sign-off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 140 },
      { label: "Notes / Recommendations", fieldName: "notes", type: "TEXTAREA", required: false, order: 141 },
      { label: "Photos", fieldName: "photos", type: "FILE", required: false, order: 142 },
      { label: "PDI Carried Out By", fieldName: "inspector_name", type: "TEXT", required: true, order: 143 },
      { label: "Date", fieldName: "pdi_date", type: "DATE", required: true, order: 144 },
      { label: "Inspector Signature", fieldName: "inspector_signature", type: "SIGNATURE", required: true, order: 145 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Test Drive Request
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Test Drive Request",
    type: "TEST_DRIVE",
    visibility: "PUBLIC", // Fully public - customers can access
    isPublic: true, // Deprecated - kept for backward compat
    publicSlug: "test-drive",
    introText: "Please complete this form to book a test drive. You can scan your driving licence to auto-fill your details.",
    vrmLookup: { enabled: true, statuses: ["IN_PREP", "ADVERTISED", "LIVE"] },
    termsText: `By signing this form, I confirm that:
- I hold a valid UK driving licence
- I am covered by {dealer.companyName}'s insurance for the duration of the test drive
- I will follow all road traffic laws
- I am responsible for any parking or speeding fines incurred during the test drive
- I will not allow any other person to drive the vehicle`,
    fields: [
      // Step 1: Scan Driving Licence (OCR extraction enabled)
      { label: "Scan Your Driving Licence", fieldName: "_section_licence_scan", type: "SECTION_HEADER", order: 1 },
      { label: "Take a photo or upload your driving licence (front)", fieldName: "licence_photo", type: "LICENCE_SCAN", required: true, order: 2, helpText: "We'll automatically extract your details to speed up the process" },

      // Test Drive Details - date defaults to today, time defaults to current time (handled in frontend)
      { label: "Test Drive Details", fieldName: "_section_testdrive", type: "SECTION_HEADER", order: 5 },
      { label: "Date of Test Drive", fieldName: "date", type: "DATE", required: true, order: 6, defaultToday: true },
      { label: "Time", fieldName: "time", type: "TIME", required: true, order: 7, defaultNow: true },

      // Your Details - auto-filled from licence if scanned
      { label: "Your Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "First Name", fieldName: "first_name", type: "TEXT", required: true, order: 11, autoFillFromLicence: "firstName" },
      { label: "Last Name", fieldName: "last_name", type: "TEXT", required: true, order: 12, autoFillFromLicence: "lastName" },
      { label: "Email", fieldName: "email", type: "TEXT", required: true, order: 13 },
      { label: "Contact Number", fieldName: "phone", type: "TEXT", required: true, order: 14 },

      // Address - auto-filled from licence if scanned
      { label: "Address", fieldName: "_section_address", type: "SECTION_HEADER", order: 20 },
      { label: "Street Address", fieldName: "address_street", type: "TEXT", required: true, order: 21, autoFillFromLicence: "addressLine1" },
      { label: "Address Line 2", fieldName: "address_line2", type: "TEXT", required: false, order: 22, autoFillFromLicence: "addressLine2" },
      { label: "City", fieldName: "address_city", type: "TEXT", required: true, order: 23, autoFillFromLicence: "town" },
      { label: "Post Code", fieldName: "address_postcode", type: "TEXT", required: true, order: 24, autoFillFromLicence: "postcode" },

      // Vehicle Details
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 30 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 31, vrmLookup: true },
      // Make and Model are hidden when vehicle is selected from stock (handled in frontend)
      { label: "Vehicle Make", fieldName: "vehicle_make", type: "TEXT", required: false, order: 32, hiddenWhenStockSelected: true },
      { label: "Vehicle Model", fieldName: "vehicle_model", type: "TEXT", required: false, order: 33, hiddenWhenStockSelected: true },
      { label: "Where did you find this vehicle?", fieldName: "source", type: "DROPDOWN", required: true, order: 35, options: { choices: ["AutoTrader", "eBay", "Facebook", "Google", "Referral", "Walk-in", "Other"] } },

      // Terms & Conditions
      { label: "Terms & Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 40 },
      { label: "I agree to the Terms & Conditions", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 41 },
      { label: "Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 42 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Courtesy Car Out
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Courtesy Car Out",
    type: "COURTESY_OUT",
    visibility: "INTERNAL", // Staff only - requires login
    isPublic: false, // Deprecated - kept for backward compat
    publicSlug: "courtesy-out",
    introText: "Complete this form when issuing a courtesy vehicle to a customer.",
    vrmLookup: { enabled: true, statuses: ["COURTESY"], vehicleType: "COURTESY" },
    termsText: `TERMS OF USE - COURTESY VEHICLE

1. The vehicle must be returned with the same fuel level as when collected.
2. The driver is responsible for any parking fines, speeding tickets, or congestion charges.
3. The vehicle must not be driven outside the UK.
4. Only named drivers on this form may drive the vehicle.
5. Any damage must be reported immediately to {dealer.companyName}.
6. The vehicle is covered by our insurance policy. Excess of £500 applies for any claims.
7. The vehicle must be returned on the agreed date unless prior arrangement is made.

For emergencies, contact: {dealer.companyPhone}`,
    fields: [
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Courtesy Vehicle Registration", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Current Mileage", fieldName: "mileage_out", type: "NUMBER", required: true, order: 3 },
      { label: "Date/Time Out", fieldName: "datetime_out", type: "DATETIME", required: true, order: 4 },
      { label: "Expected Return Date", fieldName: "date_due_back", type: "DATE", required: true, order: 5 },
      { label: "Fuel Level", fieldName: "fuel_out", type: "RADIO", required: true, order: 6, options: { choices: ["Empty", "1/4", "1/2", "3/4", "Full"] } },
      { label: "Customer Vehicle Registration", fieldName: "customer_vehicle_reg", type: "TEXT", required: false, order: 7, placeholder: "Customer's vehicle being repaired (if applicable)" },

      { label: "Driver Information", fieldName: "_section_driver", type: "SECTION_HEADER", order: 10 },
      { label: "First Name", fieldName: "driver_first_name", type: "TEXT", required: true, order: 11 },
      { label: "Last Name", fieldName: "driver_last_name", type: "TEXT", required: true, order: 12 },
      { label: "Mobile Number", fieldName: "driver_phone", type: "TEXT", required: true, order: 13 },
      { label: "Date of Birth", fieldName: "driver_dob", type: "DATE", required: true, order: 14 },
      { label: "Street Address", fieldName: "driver_address_street", type: "TEXT", required: true, order: 15 },
      { label: "City", fieldName: "driver_address_city", type: "TEXT", required: true, order: 16 },
      { label: "County", fieldName: "driver_address_county", type: "TEXT", required: false, order: 17 },
      { label: "Post Code", fieldName: "driver_address_postcode", type: "TEXT", required: true, order: 18 },

      { label: "Additional Driver (Optional)", fieldName: "_section_additional", type: "SECTION_HEADER", order: 25 },
      { label: "Additional Driver Name", fieldName: "additional_driver_name", type: "TEXT", required: false, order: 26 },
      { label: "Additional Driver Mobile", fieldName: "additional_driver_phone", type: "TEXT", required: false, order: 27 },
      { label: "Additional Driver DOB", fieldName: "additional_driver_dob", type: "DATE", required: false, order: 28 },

      { label: "Documents", fieldName: "_section_docs", type: "SECTION_HEADER", order: 35 },
      { label: "Upload Driving Licence (Front & Back)", fieldName: "licence_photos", type: "FILE", required: true, order: 36 },

      { label: "Condition Report", fieldName: "_section_condition", type: "SECTION_HEADER", order: 40 },
      { label: "Existing Damage Notes", fieldName: "existing_damage", type: "TEXTAREA", required: false, order: 41, placeholder: "Note any existing scratches, dents, etc." },
      { label: "Condition Photos", fieldName: "condition_photos", type: "FILE", required: false, order: 42 },

      { label: "Agreement", fieldName: "_section_agreement", type: "SECTION_HEADER", order: 50 },
      { label: "I have read and agree to the terms of use", fieldName: "terms_accepted", type: "BOOLEAN", required: true, order: 51 },
      { label: "I confirm the fuel level and mileage are correct", fieldName: "confirm_details", type: "BOOLEAN", required: true, order: 52 },
      { label: "Driver Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 53 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Courtesy Car Return
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Courtesy Car Return",
    type: "COURTESY_IN",
    visibility: "INTERNAL", // Staff only - requires login
    isPublic: false, // Deprecated - kept for backward compat
    publicSlug: "courtesy-in",
    introText: "Complete this form when a courtesy vehicle is returned.",
    vrmLookup: { enabled: true, statuses: ["COURTESY"], vehicleType: "COURTESY" },
    fields: [
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Courtesy Vehicle Registration", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Date/Time Returned", fieldName: "datetime_returned", type: "DATETIME", required: true, order: 3 },
      { label: "Mileage In", fieldName: "mileage_in", type: "NUMBER", required: true, order: 4 },
      { label: "Fuel Level", fieldName: "fuel_in", type: "RADIO", required: true, order: 5, options: { choices: ["Empty", "1/4", "1/2", "3/4", "Full"] } },
      { label: "Customer Vehicle Registration", fieldName: "customer_vehicle_reg", type: "TEXT", required: false, order: 6, placeholder: "Customer's vehicle being repaired (if applicable)" },

      { label: "Driver Information", fieldName: "_section_driver", type: "SECTION_HEADER", order: 10 },
      { label: "Driver Name", fieldName: "driver_name", type: "TEXT", required: true, order: 11 },

      { label: "Return Condition", fieldName: "_section_condition", type: "SECTION_HEADER", order: 20 },
      { label: "Vehicle returned clean", fieldName: "returned_clean", type: "BOOLEAN", required: true, order: 21 },
      { label: "No new damage", fieldName: "no_new_damage", type: "BOOLEAN", required: true, order: 22 },
      { label: "All belongings removed", fieldName: "belongings_removed", type: "BOOLEAN", required: true, order: 23 },
      { label: "Fuel level acceptable", fieldName: "fuel_acceptable", type: "BOOLEAN", required: true, order: 24 },

      { label: "Issues / Disclosure", fieldName: "_section_issues", type: "SECTION_HEADER", order: 30 },
      { label: "Any damage or issues to report?", fieldName: "issues_notes", type: "TEXTAREA", required: false, order: 31 },
      { label: "Damage Photos", fieldName: "damage_photos", type: "FILE", required: false, order: 32 },

      { label: "Sign-off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 40 },
      { label: "Driver Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 41 },
      { label: "Staff Member Name", fieldName: "staff_name", type: "TEXT", required: true, order: 42 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Delivery Form
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Vehicle Delivery",
    type: "DELIVERY",
    visibility: "SHARE_LINK", // Accessible via share link for 3rd parties (delivery drivers)
    isPublic: false, // Deprecated - kept for backward compat
    publicSlug: "delivery",
    introText: "Complete this form when handing over a vehicle to the customer.",
    vrmLookup: { enabled: true, statuses: ["SOLD", "ADVERTISED"] },
    autoStatusChange: { newStatus: "DELIVERED" },
    fields: [
      { label: "Vehicle Details", fieldName: "_section_vehicle", type: "SECTION_HEADER", order: 1 },
      { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Date", fieldName: "delivery_date", type: "DATE", required: true, order: 3 },
      { label: "Time", fieldName: "delivery_time", type: "TIME", required: true, order: 4 },

      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "Customer First Name", fieldName: "customer_first_name", type: "TEXT", required: true, order: 11 },
      { label: "Customer Last Name", fieldName: "customer_last_name", type: "TEXT", required: true, order: 12 },

      { label: "Documentation", fieldName: "_section_docs", type: "SECTION_HEADER", order: 20 },
      { label: "Photo of Invoice with ID", fieldName: "invoice_id_photo", type: "FILE", required: true, order: 21 },
      { label: "Photo of Customer with Vehicle", fieldName: "customer_vehicle_photo", type: "FILE", required: true, order: 22 },

      { label: "Consent", fieldName: "_section_consent", type: "SECTION_HEADER", order: 30 },
      { label: "Do you consent for the delivery photo to be used on our website/social media?", fieldName: "photo_consent", type: "RADIO", required: true, order: 31, options: { choices: ["Yes", "No"] } },

      { label: "Sign-off", fieldName: "_section_signoff", type: "SECTION_HEADER", order: 40 },
      { label: "Customer Signature", fieldName: "customer_signature", type: "SIGNATURE", required: true, order: 41 },
      { label: "Staff Member Name", fieldName: "staff_name", type: "TEXT", required: true, order: 42 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Service Receipt - Simplified layout matching PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Service Receipt",
    type: "SERVICE_RECEIPT",
    visibility: "INTERNAL", // Staff only - requires login
    isPublic: false, // Deprecated - kept for backward compat
    publicSlug: "service-receipt",
    introText: null, // No intro text - clean header with dealer info
    showDealerHeader: true, // Show dealer logo + address/phone in header
    vrmLookup: { enabled: true, statuses: ["IN_PREP", "ADVERTISED", "SOLD", "DELIVERED"] },
    fields: [
      // Row 1: Registration and Mileage side by side
      { label: "REGISTRATION", fieldName: "vrm", type: "TEXT", required: true, order: 1, vrmLookup: true, gridGroup: "row1", uppercase: true },
      { label: "MILEAGE", fieldName: "mileage", type: "NUMBER", required: true, order: 2, gridGroup: "row1", uppercase: true },

      // Row 2: Make and Model side by side (auto-fill from VRM lookup)
      { label: "MAKE", fieldName: "make", type: "TEXT", required: false, order: 3, gridGroup: "row2", uppercase: true },
      { label: "MODEL", fieldName: "model", type: "TEXT", required: false, order: 4, gridGroup: "row2", uppercase: true },

      // Work Carried Out section with checkboxes
      { label: "WORK CARRIED OUT", fieldName: "_section_work", type: "SECTION_HEADER", order: 10, uppercase: true },
      { label: "OIL FILTER", fieldName: "oil_filter", type: "BOOLEAN", required: false, order: 11, uppercase: true },
      { label: "AIR FILTER", fieldName: "air_filter", type: "BOOLEAN", required: false, order: 12, uppercase: true },
      { label: "CABIN FILTER", fieldName: "cabin_filter", type: "BOOLEAN", required: false, order: 13, uppercase: true },
      { label: "SPARK PLUGS", fieldName: "spark_plugs", type: "BOOLEAN", required: false, order: 14, uppercase: true },
      { label: "PRE-DELIVERY INSPECTION", fieldName: "pdi_done", type: "BOOLEAN", required: false, order: 15, uppercase: true },

      // Additional Works section
      { label: "ADDITIONAL WORKS", fieldName: "_section_additional", type: "SECTION_HEADER", order: 20, uppercase: true },
      { label: "ADDITIONAL WORKS", fieldName: "additional_works", type: "TEXTAREA", required: false, order: 21, uppercase: true },

      // Date Carried Out at the end
      { label: "DATE CARRIED OUT", fieldName: "service_date", type: "DATE", required: true, order: 30, uppercase: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Warranty Claim
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Warranty Claim",
    type: "WARRANTY_CLAIM",
    visibility: "PUBLIC", // Fully public - customers can access
    isPublic: true, // Deprecated - kept for backward compat
    publicSlug: "warranty-claim",
    introText: `Please fill out the form below in as much detail as possible. For more information about what is and isn't covered under your warranty please refer to page 5 of your warranty booklet.

We will only accept one claim per submission, submitting more than once may delay your claim being processed.

Please allow up to 48 hours for a response.

PLEASE NOTE: ONLY THE PURCHASER OF THE VEHICLE CAN SUBMIT A CLAIM AND MUST HAVE REGISTERED THEIR WARRANTY.`,
    vrmLookup: { enabled: true, statuses: ["SOLD", "DELIVERED"] },
    termsText: `• I understand that I can use this form to report an issue however, it may not be a claimable issue.
• I understand it may take up to 48 hours to receive a response to this claim form, and not to report the issue again as this may delay the claim further.
• I understand that if I go ahead and undertake work without authorisation I am liable for the costs.`,
    fields: [
      // Section: Purchase Information
      { label: "Purchase Information", fieldName: "_section_purchase", type: "SECTION_HEADER", order: 1 },
      { label: "Registration at time of purchase", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true },
      { label: "Purchase Date", fieldName: "purchase_date", type: "DATE", required: true, order: 3 },
      { label: "Vehicle Make and Model", fieldName: "vehicle_make_model", type: "TEXT", required: false, order: 4 },
      { label: "Exact Mileage", fieldName: "exact_mileage", type: "TEXT", required: true, order: 5, placeholder: "e.g. 23456" },

      // Section: Customer Details
      { label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10 },
      { label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: true, order: 11 },
      { label: "Email", fieldName: "email", type: "TEXT", required: true, order: 12 },
      { label: "Phone Number", fieldName: "phone", type: "TEXT", required: true, order: 13, helpText: "Please enter a valid phone number" },
      { label: "Street Address", fieldName: "address_street", type: "TEXT", required: true, order: 14 },
      { label: "Address Line 2", fieldName: "address_line2", type: "TEXT", required: false, order: 15 },
      { label: "City", fieldName: "address_city", type: "TEXT", required: true, order: 16 },
      { label: "County / State", fieldName: "address_county", type: "TEXT", required: false, order: 17 },
      { label: "Postcode", fieldName: "address_postcode", type: "TEXT", required: true, order: 18 },

      // Section: Issue Description
      { label: "Issue Description", fieldName: "_section_issue", type: "SECTION_HEADER", order: 20 },
      { label: "Please describe the issue in as much detail as possible", fieldName: "issue_description", type: "TEXTAREA", required: true, order: 21, helpText: "Include any warning lights on the dashboard, noises, symptoms, when the issue occurs, etc." },
      { label: "Upload Pictures / Videos", fieldName: "issue_media", type: "FILE", required: false, order: 22, helpText: "You can upload multiple files. Drag and drop or click to select." },

      // Section: Warranty Type
      { label: "Warranty Information", fieldName: "_section_warranty", type: "SECTION_HEADER", order: 30 },
      { label: "Warranty Type", fieldName: "warranty_type", type: "DROPDOWN", required: true, order: 31, options: { choices: ["Dealer Warranty", "External Warranty"] }, placeholder: "Please Select" },

      // Section: Terms & Conditions
      { label: "Terms & Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 40 },
      { label: "I agree and I have read the terms and condition details above.", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 41 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Review & Feedback
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: "Review & Feedback",
    type: "REVIEW_FEEDBACK",
    visibility: "PUBLIC", // Fully public - customers can access
    isPublic: true, // Deprecated - kept for backward compat
    publicSlug: "review",
    introText: "We'd love to hear about your experience! Your feedback helps us improve our service.",
    fields: [
      { label: "Your Name", fieldName: "name", type: "TEXT", required: true, order: 1 },
      { label: "Email (optional)", fieldName: "email", type: "TEXT", required: false, order: 2 },
      { label: "Overall Rating", fieldName: "rating", type: "RATING", required: true, order: 3 },
      { label: "What did we do well?", fieldName: "positive_feedback", type: "TEXTAREA", required: false, order: 4 },
      { label: "What could we improve?", fieldName: "improvement_feedback", type: "TEXTAREA", required: false, order: 5 },
      { label: "Would you recommend us to friends and family?", fieldName: "would_recommend", type: "RADIO", required: true, order: 6, options: { choices: ["Definitely", "Probably", "Not Sure", "Probably Not", "Definitely Not"] } },
    ],
  },
];

// List of form types that have been deprecated and should be removed
export const DEPRECATED_FORM_TYPES = ["CAR_PREP", "BUYING_APPRAISAL", "CUSTOMER_PX_APPRAISAL"];

// Valid form types (for model enum)
export const VALID_FORM_TYPES = ["PDI", "TEST_DRIVE", "WARRANTY_CLAIM", "COURTESY_OUT", "COURTESY_IN", "DELIVERY", "SERVICE_RECEIPT", "REVIEW_FEEDBACK", "OTHER"];

// Default intro/terms text that can be customized per dealer
export const DEFAULT_FORM_TEXT = {
  WARRANTY_CLAIM: {
    introText: `Please fill out the form below in as much detail as possible. We will only accept one claim per submission, submitting more than once may delay your claim being processed.

Please allow up to 48 hours for a response.`,
  },
  TEST_DRIVE: {
    termsText: `By signing this form, I confirm that:
- I hold a valid UK driving licence
- I am covered by {dealer.companyName}'s insurance for the duration of the test drive
- I will follow all road traffic laws
- I am responsible for any parking or speeding fines incurred during the test drive
- I will not allow any other person to drive the vehicle`,
  },
  COURTESY_OUT: {
    termsText: `TERMS OF USE - COURTESY VEHICLE

1. The vehicle must be returned with the same fuel level as when collected.
2. The driver is responsible for any parking fines, speeding tickets, or congestion charges.
3. The vehicle must not be driven outside the UK.
4. Only named drivers on this form may drive the vehicle.
5. Any damage must be reported immediately.
6. The vehicle is covered by our insurance policy. Excess of £500 applies for any claims.
7. The vehicle must be returned on the agreed date unless prior arrangement is made.`,
  },
};
