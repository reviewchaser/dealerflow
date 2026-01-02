import { withDealerContext } from "../../../../libs/authContext";
import connectMongo from "../../../../libs/mongoose";
import OvertimeSubmission from "../../../../models/OvertimeSubmission";

/**
 * POST /api/overtime/:id/submit
 * Submit a draft overtime submission for review
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Submission ID is required" });
  }

  try {
    // Fetch the submission
    const submission = await OvertimeSubmission.findOne({
      _id: id,
      dealerId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Verify ownership
    if (submission.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check current status
    if (submission.status !== "DRAFT") {
      return res.status(400).json({
        error: "Cannot submit",
        reason: `Submission is already ${submission.status}`,
      });
    }

    // Validate submission has at least one entry with overtime
    const hasOvertimeEntries = submission.entries.some(
      (entry) => entry.overtimeHours > 0
    );

    if (!hasOvertimeEntries) {
      return res.status(400).json({
        error: "Cannot submit empty overtime",
        reason: "At least one day must have overtime hours recorded",
      });
    }

    // Update status to SUBMITTED
    submission.status = "SUBMITTED";
    submission.submittedAt = new Date();

    await submission.save();

    return res.status(200).json({
      submission: submission.toObject(),
      message: "Submission sent for review",
    });
  } catch (error) {
    console.error("Error submitting overtime:", error);
    return res.status(500).json({ error: "Failed to submit overtime" });
  }
}

export default withDealerContext(handler);
