const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb+srv://accounts_db_user:NeSyY6B079@cluster0.lqoi4pv.mongodb.net/dealerflow?retryWrites=true&w=majority&appName=Cluster0');

  // Find the warranty claim form
  const warrantyForm = await mongoose.connection.db.collection('forms').findOne({ type: 'WARRANTY_CLAIM' });

  if (!warrantyForm) {
    console.log('No warranty claim form found');
    await mongoose.disconnect();
    return;
  }

  console.log('Found warranty form:', warrantyForm._id.toString());

  // Update form name and intro/terms text
  await mongoose.connection.db.collection('forms').updateOne(
    { _id: warrantyForm._id },
    {
      $set: {
        name: 'Vehicle Warranty Claim Form',
        introText: `Please fill out the form below in as much detail as possible. For more information about what is and isn't covered under your warranty please refer to page 5 of your warranty booklet.

We will only accept one claim per submission, submitting more than once may delay your claim being processed.

Please allow up to 48 hours for a response.

Our Aftersales hours are Mon-Fri 9.30am - 5pm.

PLEASE NOTE: ONLY THE PURCHASER OF THE VEHICLE CAN SUBMIT A CLAIM AND MUST HAVE REGISTERED THEIR WARRANTY.`,
        termsText: `• I understand that I can use this form to report an issue however, it may not be a claimable issue.
• I understand it may take up to 48 hours to receive a response to this claim form, and not to report the issue again as this may delay the claim further.
• I understand that if I go ahead and undertake work without authorisation I am liable for the costs.`
      }
    }
  );
  console.log('Updated form name and texts');

  // Delete existing fields
  const deleteResult = await mongoose.connection.db.collection('formfields').deleteMany({ formId: warrantyForm._id });
  console.log('Deleted existing fields:', deleteResult.deletedCount);

  // Create new fields
  const newFields = [
    // Section: Purchase Information
    { formId: warrantyForm._id, label: "Purchase Information", fieldName: "_section_purchase", type: "SECTION_HEADER", order: 1, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Vehicle Registration", fieldName: "vrm", type: "TEXT", required: true, order: 2, vrmLookup: true, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Purchase Date", fieldName: "purchase_date", type: "DATE", required: true, order: 3, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Vehicle Make and Model", fieldName: "vehicle_make_model", type: "TEXT", required: false, order: 4, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Exact Mileage", fieldName: "exact_mileage", type: "TEXT", required: true, order: 5, placeholder: "e.g. 23456", visible: true, isDefault: true, isCustom: false },

    // Section: Customer Details
    { formId: warrantyForm._id, label: "Customer Details", fieldName: "_section_customer", type: "SECTION_HEADER", order: 10, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Customer Name", fieldName: "customer_name", type: "TEXT", required: true, order: 11, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Email", fieldName: "email", type: "TEXT", required: true, order: 12, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Phone Number", fieldName: "phone", type: "TEXT", required: true, order: 13, helpText: "Please enter a valid phone number", visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Street Address", fieldName: "address_street", type: "TEXT", required: true, order: 14, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Address Line 2", fieldName: "address_line2", type: "TEXT", required: false, order: 15, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "City", fieldName: "address_city", type: "TEXT", required: true, order: 16, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "County / State", fieldName: "address_county", type: "TEXT", required: false, order: 17, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Postcode", fieldName: "address_postcode", type: "TEXT", required: true, order: 18, visible: true, isDefault: true, isCustom: false },

    // Section: Issue Description
    { formId: warrantyForm._id, label: "Issue Description", fieldName: "_section_issue", type: "SECTION_HEADER", order: 20, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Please describe the issue in as much detail as possible", fieldName: "issue_description", type: "TEXTAREA", required: true, order: 21, helpText: "Include any warning lights on the dashboard, noises, symptoms, when the issue occurs, etc.", visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Upload Pictures / Videos", fieldName: "issue_media", type: "FILE", required: false, order: 22, helpText: "You can upload multiple files. Drag and drop or click to select.", visible: true, isDefault: true, isCustom: false },

    // Section: Warranty Type
    { formId: warrantyForm._id, label: "Warranty Information", fieldName: "_section_warranty", type: "SECTION_HEADER", order: 30, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "Warranty Type", fieldName: "warranty_type", type: "DROPDOWN", required: true, order: 31, options: { choices: ["Dealer Warranty", "External Warranty"] }, placeholder: "Please Select", visible: true, isDefault: true, isCustom: false },

    // Section: Terms & Conditions
    { formId: warrantyForm._id, label: "Terms & Conditions", fieldName: "_section_terms", type: "SECTION_HEADER", order: 40, visible: true, isDefault: true, isCustom: false },
    { formId: warrantyForm._id, label: "I agree and I have read the terms and condition details above.", fieldName: "agree_terms", type: "BOOLEAN", required: true, order: 41, visible: true, isDefault: true, isCustom: false },
  ];

  const insertResult = await mongoose.connection.db.collection('formfields').insertMany(newFields);
  console.log('Created new fields:', insertResult.insertedCount);

  await mongoose.disconnect();
  console.log('Done!');
}

fix().catch(console.error);
