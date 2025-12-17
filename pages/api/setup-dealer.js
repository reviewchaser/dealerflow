import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import { FORM_TEMPLATES } from "@/libs/formTemplates";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    // Check if dealer already exists
    let dealer = await Dealer.findOne();
    let isNewDealer = false;

    if (!dealer) {
      // Create new dealer
      dealer = await Dealer.create({
        name: req.body.name || "Demo Dealership",
        email: req.body.email || "demo@dealership.com",
        phone: req.body.phone || "01234567890",
        address: req.body.address || "123 High Street",
      });
      isNewDealer = true;
    }

    // Check if forms exist for this dealer
    const existingForms = await Form.countDocuments({ dealerId: dealer._id });

    // If no forms exist, create default forms
    if (existingForms === 0) {
      console.log("[Setup Dealer] Creating default forms for dealer:", dealer.name);

      for (const template of FORM_TEMPLATES) {
        const form = await Form.create({
          dealerId: dealer._id,
          name: template.name,
          type: template.type,
          isPublic: template.isPublic,
          publicSlug: template.publicSlug,
        });

        // Create fields for this form
        for (const field of template.fields) {
          await FormField.create({
            formId: form._id,
            ...field,
            visible: true,
            isDefault: true,
            isCustom: false,
          });
        }
      }

      console.log("[Setup Dealer] Created", FORM_TEMPLATES.length, "default forms");
    }

    return res.status(isNewDealer ? 201 : 200).json({
      message: isNewDealer ? "Dealer created with default forms" : "Dealer already exists",
      dealer: {
        id: dealer._id,
        name: dealer.name,
      },
      formsCreated: existingForms === 0 ? FORM_TEMPLATES.length : 0,
    });
  } catch (error) {
    console.error("Error setting up dealer:", error);
    return res.status(500).json({ error: "Failed to setup dealer" });
  }
}
