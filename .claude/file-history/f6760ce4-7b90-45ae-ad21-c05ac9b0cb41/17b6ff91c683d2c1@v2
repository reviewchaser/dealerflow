import { withDealerContext, requireRole } from "../../../../../libs/authContext";
import connectMongo from "../../../../../libs/mongoose";
import OvertimeSubmission from "../../../../../models/OvertimeSubmission";
import User from "../../../../../models/User";

/**
 * POST /api/admin/overtime/:id/reject
 * Reject an overtime submission
 * Only OWNER and ADMIN roles can access
 */
async function handler(req, res, ctx) {
  // Require admin or owner role
  requireRole(ctx.membership, ["OWNER", "ADMIN"]);

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
    const { reason } = req.body;

    // Fetch the submission
    const submission = await OvertimeSubmission.findOne({
      _id: id,
      dealerId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Can only reject SUBMITTED submissions
    if (submission.status !== "SUBMITTED") {
      return res.status(400).json({
        error: "Cannot reject",
        reason: `Submission is ${submission.status}, only SUBMITTED submissions can be rejected`,
      });
    }

    // Get rejecter's display name
    const rejecter = await User.findById(userId).lean();
    const rejecterName = rejecter?.fullName || rejecter?.name || ctx.user?.email?.split("@")[0] || "Admin";

    // Update submission
    submission.status = "REJECTED";
    submission.rejectedAt = new Date();
    submission.rejectedByUserId = userId;
    submission.rejectedByName = rejecterName;
    submission.rejectedReason = reason?.trim() || null;

    await submission.save();

    return res.status(200).json({
      submission: submission.toObject(),
      message: "Overtime rejected",
    });
  } catch (error) {
    console.error("Error rejecting overtime:", error);
    return res.status(500).json({ error: "Failed to reject overtime" });
  }
}

export default withDealerContext(handler);
