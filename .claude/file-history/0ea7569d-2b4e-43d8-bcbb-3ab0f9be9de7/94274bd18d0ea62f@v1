import connectMongo from "@/libs/mongoose";
import FormSubmission from "@/models/FormSubmission";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import Dealer from "@/models/Dealer";

/**
 * Public Submission View API
 * GET /api/public/submission/[id]
 *
 * Returns a form submission for public viewing (e.g., in handover pack).
 * Only returns submissions for PUBLIC or SHARE_LINK visible forms.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid submission ID" });
  }

  await connectMongo();

  // Find the submission
  const submission = await FormSubmission.findById(id)
    .populate("formId")
    .populate("dealerId", "name logoUrl")
    .lean();

  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }

  // Check if submission is deleted
  if (submission.status === "DELETED") {
    return res.status(404).json({ error: "Submission not found" });
  }

  // Get form fields to format the response
  const fields = await FormField.find({ formId: submission.formId._id })
    .sort({ order: 1 })
    .lean();

  // Format answers with labels
  const formattedAnswers = fields.map((field) => {
    const value = submission.rawAnswers?.[field.name];
    return {
      label: field.label,
      name: field.name,
      type: field.type,
      value: value,
    };
  }).filter((a) => a.value !== null && a.value !== undefined && a.value !== "");

  return res.status(200).json({
    id: submission._id.toString(),
    formName: submission.formId?.name || "Form Submission",
    formType: submission.formId?.type || null,
    submittedAt: submission.submittedAt || submission.createdAt,
    answers: formattedAnswers,
    dealer: submission.dealerId ? {
      name: submission.dealerId.name,
      logoUrl: submission.dealerId.logoUrl,
    } : null,
  });
}
