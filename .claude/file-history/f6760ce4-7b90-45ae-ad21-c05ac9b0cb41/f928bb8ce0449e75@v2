import { withDealerContext, requireRole } from "../../../../../libs/authContext";
import connectMongo from "../../../../../libs/mongoose";
import OvertimeSubmission from "../../../../../models/OvertimeSubmission";
import User from "../../../../../models/User";

/**
 * POST /api/admin/overtime/:id/approve
 * Approve an overtime submission
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
    // Fetch the submission
    const submission = await OvertimeSubmission.findOne({
      _id: id,
      dealerId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Can only approve SUBMITTED submissions
    if (submission.status !== "SUBMITTED") {
      return res.status(400).json({
        error: "Cannot approve",
        reason: `Submission is ${submission.status}, only SUBMITTED submissions can be approved`,
      });
    }

    // Get approver's display name
    const approver = await User.findById(userId).lean();
    const approverName = approver?.fullName || approver?.name || ctx.user?.email?.split("@")[0] || "Admin";

    // Update submission
    submission.status = "APPROVED";
    submission.approvedAt = new Date();
    submission.approvedByUserId = userId;
    submission.approvedByName = approverName;

    await submission.save();

    return res.status(200).json({
      submission: submission.toObject(),
      message: "Overtime approved successfully",
    });
  } catch (error) {
    console.error("Error approving overtime:", error);
    return res.status(500).json({ error: "Failed to approve overtime" });
  }
}

export default withDealerContext(handler);
