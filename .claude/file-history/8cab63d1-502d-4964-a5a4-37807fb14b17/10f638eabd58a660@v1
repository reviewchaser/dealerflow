const mongoose = require('mongoose');

async function updateWarrantyForm() {
  await mongoose.connect('mongodb+srv://accounts_db_user:NeSyY6B079@cluster0.lqoi4pv.mongodb.net/dealerflow?retryWrites=true&w=majority&appName=Cluster0');

  // Find all warranty claim forms
  const warrantyForms = await mongoose.connection.db.collection('forms').find({ type: 'WARRANTY_CLAIM' }).toArray();

  if (warrantyForms.length === 0) {
    console.log('No warranty claim forms found');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${warrantyForms.length} warranty claim form(s)`);

  const newIntroText = `Please fill out the form below in as much detail as possible. For more information about what is and isn't covered under your warranty please refer to page 5 of your warranty booklet.

We will only accept one claim per submission, submitting more than once may delay your claim being processed.

Please allow up to 48 hours for a response.

PLEASE NOTE: ONLY THE PURCHASER OF THE VEHICLE CAN SUBMIT A CLAIM AND MUST HAVE REGISTERED THEIR WARRANTY.`;

  for (const form of warrantyForms) {
    console.log(`\nUpdating form: ${form._id.toString()}`);

    // Update the form's introText (remove Aftersales hours line)
    await mongoose.connection.db.collection('forms').updateOne(
      { _id: form._id },
      { $set: { introText: newIntroText } }
    );
    console.log('  - Updated introText');

    // Update the VRM field label
    const updateResult = await mongoose.connection.db.collection('formfields').updateOne(
      { formId: form._id, fieldName: 'vrm' },
      { $set: { label: 'Registration at time of purchase' } }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('  - Updated VRM field label to "Registration at time of purchase"');
    } else {
      console.log('  - VRM field not found or already updated');
    }
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

updateWarrantyForm().catch(console.error);
