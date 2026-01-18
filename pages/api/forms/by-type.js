import connectMongo from "@/libs/mongoose";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import { withDealerContext } from "@/libs/authContext";
import { FORM_TEMPLATES } from "@/libs/formTemplates";

/**
 * GET /api/forms/by-type?type=PDI
 * Returns the form configuration for the given type
 * Used by InlineFormModal to fetch form without knowing the MongoDB ID
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: "Form type is required" });
  }

  // Valid types from the Form model
  const validTypes = ["PDI", "TEST_DRIVE", "WARRANTY_CLAIM", "COURTESY_OUT", "COURTESY_IN", "DELIVERY", "SERVICE_RECEIPT", "REVIEW_FEEDBACK", "OTHER"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid form type: ${type}` });
  }

  try {
    // Find the form by type for this dealer
    let form = await Form.findOne({ dealerId, type }).lean();

    // If form doesn't exist, auto-create from template
    if (!form) {
      const template = FORM_TEMPLATES.find(t => t.type === type);
      if (!template) {
        return res.status(404).json({ error: `No template found for form type: ${type}` });
      }

      // Create the form
      const newForm = await Form.create({
        dealerId,
        name: template.name,
        type: template.type,
        visibility: template.visibility || "INTERNAL",
        isPublic: template.isPublic || false,
        publicSlug: template.publicSlug || null,
      });

      // Create fields from template
      if (template.fields && template.fields.length > 0) {
        const fieldPromises = template.fields.map((field) =>
          FormField.create({
            formId: newForm._id,
            label: field.label,
            fieldName: field.fieldName,
            type: field.type,
            required: field.required || false,
            order: field.order || 0,
            visible: field.visible !== false,
            options: field.options || null,
            placeholder: field.placeholder || null,
            helpText: field.helpText || null,
            gridGroup: field.gridGroup || null,
            autoFillFromLicence: field.autoFillFromLicence || null,
            uppercase: field.uppercase || false,
          })
        );
        await Promise.all(fieldPromises);
      }

      form = newForm.toObject();
    }

    // Get the fields for this form
    const fields = await FormField.find({ formId: form._id })
      .sort({ order: 1 })
      .lean();

    // Get template config for additional settings (vrmLookup, termsText, etc.)
    const template = FORM_TEMPLATES.find(t => t.type === type);

    return res.status(200).json({
      form: {
        ...form,
        id: form._id.toString(),
      },
      fields: fields.map(f => ({
        ...f,
        id: f._id.toString(),
      })),
      template: template ? {
        introText: template.introText,
        termsText: template.termsText,
        vrmLookup: template.vrmLookup,
        showDealerHeader: template.showDealerHeader,
        autoStatusChange: template.autoStatusChange,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching form by type:", error);
    return res.status(500).json({ error: "Failed to fetch form" });
  }
}

export default withDealerContext(handler);
