import { withDealerContext } from "../../../libs/authContext";
import connectMongo from "../../../libs/mongoose";
import OvertimeSubmission from "../../../models/OvertimeSubmission";

/**
 * User Overtime API - Single Submission
 * GET   - Get a specific submission (own only)
 * PATCH - Update a draft submission (own only)
 * DELETE - Delete a draft submission (own only)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Submission ID is required" });
  }

  // Fetch the submission
  const submission = await OvertimeSubmission.findOne({
    _id: id,
    dealerId,
  });

  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }

  // Verify ownership (users can only access their own)
  if (submission.userId.toString() !== userId.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (req.method === "GET") {
    return res.status(200).json({ submission: submission.toObject() });
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res, submission);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, submission);
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

/**
 * PATCH /api/overtime/:id
 * Body:
 *   - entries: day entries to update
 *   - notes: optional notes
 */
async function handlePatch(req, res, submission) {
  try {
    // Can only edit DRAFT submissions
    if (submission.status !== "DRAFT") {
      return res.status(400).json({
        error: "Cannot edit submission",
        reason: `Submission is ${submission.status} and cannot be modified`,
      });
    }

    const { entries, notes } = req.body;

    // Update entries if provided
    if (entries !== undefined) {
      submission.entries = validateEntries(entries);
    }

    // Update notes if provided
    if (notes !== undefined) {
      submission.notes = notes?.trim() || null;
    }

    await submission.save();

    return res.status(200).json({
      submission: submission.toObject(),
      message: "Submission updated successfully",
    });
  } catch (error) {
    console.error("Error updating overtime submission:", error);
    return res.status(500).json({ error: "Failed to update submission" });
  }
}

/**
 * DELETE /api/overtime/:id
 * Only DRAFT submissions can be deleted
 */
async function handleDelete(req, res, submission) {
  try {
    // Can only delete DRAFT submissions
    if (submission.status !== "DRAFT") {
      return res.status(400).json({
        error: "Cannot delete submission",
        reason: `Submission is ${submission.status} and cannot be deleted`,
      });
    }

    await OvertimeSubmission.deleteOne({ _id: submission._id });

    return res.status(200).json({ message: "Submission deleted successfully" });
  } catch (error) {
    console.error("Error deleting overtime submission:", error);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
}

/**
 * Validate and sanitize day entries
 */
function validateEntries(entries) {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const seenDays = new Set();

  return entries
    .filter((entry) => {
      if (!entry.day || !validDays.includes(entry.day)) {
        return false;
      }
      if (seenDays.has(entry.day)) {
        return false;
      }
      seenDays.add(entry.day);
      return true;
    })
    .map((entry) => ({
      day: entry.day,
      startTime: entry.startTime || null,
      endTime: entry.endTime || null,
      startFinishText: entry.startFinishText?.trim() || null,
      location: entry.location?.trim() || null,
      overtimeHours: Math.min(Math.max(parseFloat(entry.overtimeHours) || 0, 0), 24),
      breakMinutes: Math.min(Math.max(parseInt(entry.breakMinutes, 10) || 0, 0), 480),
    }));
}

export default withDealerContext(handler);
