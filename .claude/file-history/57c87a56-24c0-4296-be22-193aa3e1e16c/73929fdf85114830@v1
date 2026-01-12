import connectMongo from "@/libs/mongoose";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method === "GET") {
    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid form ID" });
    }

    // Ensure form belongs to this dealer
    const form = await Form.findOne({ _id: id, dealerId }).lean();
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Get form fields
    const fields = await FormField.find({ formId: id }).sort({ order: 1 }).lean();

    // Transform IDs for consistency
    const transformedForm = {
      ...form,
      id: form._id.toString(),
    };

    const transformedFields = fields.map(f => ({
      ...f,
      id: f._id.toString(),
    }));

    return res.status(200).json({
      form: transformedForm,
      fields: transformedFields,
    });
  }

  if (req.method === "DELETE") {
    // Ensure form belongs to this dealer
    const form = await Form.findOne({ _id: id, dealerId });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Delete all form fields first
    await FormField.deleteMany({ formId: id });

    // Delete the form
    await Form.findByIdAndDelete(id);

    return res.status(200).json({ message: "Form deleted successfully" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
