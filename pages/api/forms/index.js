import connectMongo from "@/libs/mongoose";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import { withDealerContext } from "@/libs/authContext";
import { DEPRECATED_FORM_TYPES } from "@/libs/formTemplates";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;

  if (req.method === "GET") {
    // Clean up deprecated forms automatically
    for (const deprecatedType of DEPRECATED_FORM_TYPES) {
      const deprecatedForms = await Form.find({ dealerId, type: deprecatedType });
      for (const form of deprecatedForms) {
        await FormField.deleteMany({ formId: form._id });
        await Form.findByIdAndDelete(form._id);
      }
    }

    // Exclude deprecated form types from query
    const forms = await Form.find({
      dealerId,
      type: { $nin: DEPRECATED_FORM_TYPES }
    }).sort({ type: 1, createdAt: -1 }).lean();

    // Get field counts for each form
    const formsWithCounts = await Promise.all(
      forms.map(async (form) => {
        const fieldCount = await FormField.countDocuments({ formId: form._id });
        const visibleCount = await FormField.countDocuments({ formId: form._id, visible: true });
        return { ...form, fieldCount, visibleCount };
      })
    );

    return res.status(200).json(formsWithCounts);
  }

  if (req.method === "POST") {
    const { name, type, isPublic, publicSlug, fields } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const form = await Form.create({
      dealerId,
      name,
      type,
      isPublic,
      publicSlug,
      createdByUserId: userId,
    });

    // Create associated fields if provided
    if (fields && Array.isArray(fields)) {
      const fieldPromises = fields.map((field) =>
        FormField.create({
          formId: form._id,
          ...field,
        })
      );
      await Promise.all(fieldPromises);
    }

    return res.status(201).json(form);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
