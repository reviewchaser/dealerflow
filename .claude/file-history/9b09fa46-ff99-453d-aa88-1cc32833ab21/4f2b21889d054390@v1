const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...values] = trimmedLine.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
  console.log('✓ Loaded .env.local');
}

// Import models - using require since this is a standalone script
const connectMongo = require('../libs/mongoose').default;

// Connect and seed
async function seedForms() {
  try {
    // Connect to MongoDB
    await connectMongo();
    console.log('✓ Connected to MongoDB');

    // Import models after connection
    const Form = (await import('../models/Form.js')).default;
    const FormField = (await import('../models/FormField.js')).default;
    const Dealer = (await import('../models/Dealer.js')).default;

    // Get or create a dealer
    let dealer = await Dealer.findOne();

    if (!dealer) {
      console.log('No dealer found, creating a test dealer...');
      dealer = await Dealer.create({
        name: 'Test Dealership',
        email: 'test@dealership.com',
        phone: '01234567890',
      });
      console.log(`✓ Created dealer: ${dealer.name} (ID: ${dealer._id})`);
    } else {
      console.log(`✓ Using existing dealer: ${dealer.name} (ID: ${dealer._id})`);
    }

    const dealerId = dealer._id;

    // Deprecated form types to clean up
    const DEPRECATED_FORM_TYPES = ["CAR_PREP", "DELIVERY", "BUYING_APPRAISAL", "CUSTOMER_PX_APPRAISAL"];

    // Clean up deprecated forms
    for (const deprecatedType of DEPRECATED_FORM_TYPES) {
      const deprecatedForms = await Form.find({ dealerId, type: deprecatedType });
      for (const form of deprecatedForms) {
        await FormField.deleteMany({ formId: form._id });
        await Form.findByIdAndDelete(form._id);
        console.log(`✓ Deleted deprecated form: ${form.name} (${deprecatedType})`);
      }
    }

    // Form templates - only active form types
    // Note: Appraisal forms are handled separately in the Appraisals section
    const FORM_TEMPLATES = [
      {
        name: "PDI (Pre-Delivery Inspection)",
        type: "PDI",
        isPublic: false,
        publicSlug: "pdi",
        fields: [
          { label: "Inspector Name", fieldName: "inspector_name", type: "TEXT", required: true, order: 1 },
          { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2 },
          { label: "Date", fieldName: "date", type: "DATE", required: true, order: 3 },
          { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 4 },
          { label: "Exterior Condition", fieldName: "exterior", type: "RATING", required: true, order: 5 },
          { label: "Interior Condition", fieldName: "interior", type: "RATING", required: true, order: 6 },
          { label: "Tyres", fieldName: "tyres", type: "RATING", required: true, order: 7 },
          { label: "Brakes", fieldName: "brakes", type: "RATING", required: true, order: 8 },
          { label: "Fluids Checked", fieldName: "fluids_checked", type: "BOOLEAN", required: true, order: 9 },
          { label: "Notes", fieldName: "notes", type: "TEXTAREA", required: false, order: 10 },
          { label: "Photos", fieldName: "photos", type: "FILE", required: false, order: 11 },
          { label: "Inspector Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 12 },
        ],
      },
      {
        name: "Warranty Claim",
        type: "WARRANTY_CLAIM",
        isPublic: true,
        publicSlug: "warranty-claim",
        fields: [
          { label: "Your Name", fieldName: "name", type: "TEXT", required: true, order: 1 },
          { label: "Email", fieldName: "email", type: "TEXT", required: true, order: 2 },
          { label: "Phone", fieldName: "phone", type: "TEXT", required: true, order: 3 },
          { label: "Vehicle Registration", fieldName: "reg", type: "TEXT", required: true, order: 4 },
          { label: "Date of Purchase", fieldName: "purchase_date", type: "DATE", required: true, order: 5 },
          { label: "Issue Description", fieldName: "issue_description", type: "TEXTAREA", required: true, order: 6 },
          { label: "When did the issue start?", fieldName: "issue_start_date", type: "DATE", required: true, order: 7 },
          { label: "Upload Photos", fieldName: "photos", type: "FILE", required: false, order: 8 },
          { label: "Preferred Contact Method", fieldName: "contact_method", type: "DROPDOWN", required: true, order: 9, options: { choices: ["Phone", "Email", "WhatsApp"] } },
        ],
      },
      {
        name: "Test Drive Request",
        type: "TEST_DRIVE",
        isPublic: true,
        publicSlug: "test-drive",
        fields: [
          { label: "Your Name", fieldName: "name", type: "TEXT", required: true, order: 1 },
          { label: "Email", fieldName: "email", type: "TEXT", required: true, order: 2 },
          { label: "Phone", fieldName: "phone", type: "TEXT", required: true, order: 3 },
          { label: "Driving Licence Number", fieldName: "licence_number", type: "TEXT", required: true, order: 4 },
          { label: "Upload Driving Licence", fieldName: "licence_photo", type: "FILE", required: true, order: 5 },
          { label: "Vehicle of Interest (Reg)", fieldName: "vrm", type: "TEXT", required: true, order: 6 },
          { label: "Preferred Date", fieldName: "preferred_date", type: "DATE", required: true, order: 7 },
          { label: "Preferred Time", fieldName: "preferred_time", type: "TEXT", required: false, order: 8 },
          { label: "Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 9 },
        ],
      },
      {
        name: "Courtesy Car Out",
        type: "COURTESY_OUT",
        isPublic: true,
        publicSlug: "courtesy-out",
        fields: [
          { label: "Driver Name", fieldName: "driver_name", type: "TEXT", required: true, order: 1 },
          { label: "Phone", fieldName: "phone", type: "TEXT", required: true, order: 2 },
          { label: "Driving Licence Number", fieldName: "licence_number", type: "TEXT", required: true, order: 3 },
          { label: "Upload Driving Licence", fieldName: "licence_photo", type: "FILE", required: true, order: 4 },
          { label: "Courtesy Vehicle Reg", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 5 },
          { label: "Mileage Out", fieldName: "mileage_out", type: "NUMBER", required: true, order: 6 },
          { label: "Fuel Level Out", fieldName: "fuel_out", type: "DROPDOWN", required: true, order: 7, options: { choices: ["Full", "3/4", "Half", "1/4", "Empty"] } },
          { label: "Date Out", fieldName: "date_out", type: "DATE", required: true, order: 8 },
          { label: "Expected Return Date", fieldName: "date_due_back", type: "DATE", required: true, order: 9 },
          { label: "T&Cs Accepted", fieldName: "terms_accepted", type: "BOOLEAN", required: true, order: 10 },
          { label: "Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 11 },
        ],
      },
      {
        name: "Courtesy Car In",
        type: "COURTESY_IN",
        isPublic: false,
        publicSlug: "courtesy-in",
        fields: [
          { label: "Courtesy Vehicle Reg", fieldName: "courtesy_vrm", type: "TEXT", required: true, order: 1 },
          { label: "Mileage In", fieldName: "mileage_in", type: "NUMBER", required: true, order: 2 },
          { label: "Fuel Level In", fieldName: "fuel_in", type: "DROPDOWN", required: true, order: 3, options: { choices: ["Full", "3/4", "Half", "1/4", "Empty"] } },
          { label: "Date Returned", fieldName: "date_returned", type: "DATE", required: true, order: 4 },
          { label: "Condition Notes", fieldName: "condition_notes", type: "TEXTAREA", required: false, order: 5 },
          { label: "Damage Photos", fieldName: "damage_photos", type: "FILE", required: false, order: 6 },
          { label: "Signature", fieldName: "signature", type: "SIGNATURE", required: true, order: 7 },
        ],
      },
      {
        name: "Service Receipt",
        type: "SERVICE_RECEIPT",
        isPublic: false,
        publicSlug: "service-receipt",
        fields: [
          { label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: true, order: 1 },
          { label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2 },
          { label: "Service Date", fieldName: "service_date", type: "DATE", required: true, order: 3 },
          { label: "Mileage", fieldName: "mileage", type: "NUMBER", required: true, order: 4 },
          { label: "Work Performed", fieldName: "work_performed", type: "TEXTAREA", required: true, order: 5 },
          { label: "Parts Used", fieldName: "parts_used", type: "TEXTAREA", required: false, order: 6 },
          { label: "Next Service Due", fieldName: "next_service_due", type: "DATE", required: false, order: 7 },
          { label: "Technician Signature", fieldName: "tech_signature", type: "SIGNATURE", required: true, order: 8 },
        ],
      },
      {
        name: "Review & Feedback",
        type: "REVIEW_FEEDBACK",
        isPublic: true,
        publicSlug: "review",
        fields: [
          { label: "Your Name", fieldName: "name", type: "TEXT", required: true, order: 1 },
          { label: "Email (optional)", fieldName: "email", type: "TEXT", required: false, order: 2 },
          { label: "Overall Rating", fieldName: "rating", type: "RATING", required: true, order: 3 },
          { label: "What did we do well?", fieldName: "positive_feedback", type: "TEXTAREA", required: false, order: 4 },
          { label: "What could we improve?", fieldName: "improvement_feedback", type: "TEXTAREA", required: false, order: 5 },
          { label: "Would you recommend us?", fieldName: "would_recommend", type: "BOOLEAN", required: true, order: 6 },
        ],
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const template of FORM_TEMPLATES) {
      // Check if form already exists
      const existing = await Form.findOne({
        dealerId,
        type: template.type,
      });

      if (existing) {
        console.log(`⊘ Skipped ${template.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create form
      const form = await Form.create({
        dealerId,
        name: template.name,
        type: template.type,
        isPublic: template.isPublic,
        publicSlug: template.publicSlug,
      });

      // Create fields
      for (const field of template.fields) {
        await FormField.create({
          formId: form._id,
          ...field,
        });
      }

      console.log(`✓ Created ${template.name} (${template.fields.length} fields)`);
      createdCount++;
    }

    console.log('\n=================================');
    console.log('✓ SEEDING COMPLETE!');
    console.log(`  Created: ${createdCount} forms`);
    console.log(`  Skipped: ${skippedCount} forms`);
    console.log(`  Dealer ID: ${dealerId}`);
    console.log('=================================\n');

    console.log('Public form URLs:');
    console.log('  http://localhost:3000/public/forms/warranty-claim');
    console.log('  http://localhost:3000/public/forms/test-drive');
    console.log('  http://localhost:3000/public/forms/pdi');
    console.log('  http://localhost:3000/public/forms/courtesy-out');
    console.log('  http://localhost:3000/public/forms/review');
    console.log('  ...\n');

    console.log('Forms dashboard:');
    console.log('  http://localhost:3000/forms\n');

    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Error seeding forms:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

seedForms();
