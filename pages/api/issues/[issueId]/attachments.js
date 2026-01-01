import connectMongo from "@/libs/mongoose";
import VehicleIssue from "@/models/VehicleIssue";
import Vehicle from "@/models/Vehicle";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";

/**
 * POST /api/issues/[issueId]/attachments
 * Add attachment to an issue
 *
 * Request body:
 * {
 *   "key": "vehicles/dealer123/vehicle456/123-abc.jpg",
 *   "url": "https://...",  // optional - will be derived from key if not provided
 *   "fileName": "photo.jpg",
 *   "contentType": "image/jpeg",
 *   "caption": "Front bumper damage" // optional
 * }
 *
 * DELETE /api/issues/[issueId]/attachments
 * Remove attachment from an issue
 *
 * Request body:
 * {
 *   "key": "vehicles/dealer123/vehicle456/123-abc.jpg"
 * }
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId, user } = ctx;
  const { issueId } = req.query;

  // Validate issueId
  if (!issueId || !/^[a-f\d]{24}$/i.test(issueId)) {
    return res.status(400).json({ error: "Invalid issueId format" });
  }

  // Get the issue and verify it belongs to a vehicle in this dealer
  const issue = await VehicleIssue.findById(issueId);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const vehicle = await Vehicle.findOne({ _id: issue.vehicleId, dealerId }).lean();
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found or access denied" });
  }

  // Get actor info for activity logging
  const actor = await User.findById(userId).lean();
  const actorName = actor?.name || user?.name || user?.email || "System";

  if (req.method === "POST") {
    try {
      const { key, url, fileName, contentType, caption } = req.body;

      // Validate required fields
      if (!key) {
        return res.status(400).json({ error: "Missing required field: key" });
      }

      console.log("[IssueAttachment] Adding attachment:", {
        issueId,
        vehicleId: issue.vehicleId.toString(),
        key,
        fileName,
        contentType,
      });

      // Build attachment object
      const attachment = {
        key,
        url: url || key, // Use key as URL if not provided (for signed URL resolution)
        uploadedBy: userId,
        uploadedAt: new Date(),
        caption: caption || null,
        fileName: fileName || null,
        contentType: contentType || null,
      };

      // Initialize attachments array if it doesn't exist
      if (!issue.attachments) {
        issue.attachments = [];
      }

      // Add the attachment
      issue.attachments.push(attachment);
      await issue.save();

      console.log("[IssueAttachment] DB update result:", {
        issueId,
        attachmentCount: issue.attachments.length,
      });

      // Log activity
      await VehicleActivity.log({
        dealerId,
        vehicleId: issue.vehicleId,
        actorId: userId,
        actorName,
        type: "ISSUE_UPDATED",
        message: `Added attachment to issue: ${issue.category} - ${issue.subcategory}`,
        meta: {
          issueId: issue._id,
          category: issue.category,
          subcategory: issue.subcategory,
          fileName,
        },
      });

      // Return updated issue
      const updatedIssue = issue.toJSON();
      updatedIssue.id = updatedIssue._id.toString();
      delete updatedIssue._id;

      return res.status(201).json({
        success: true,
        issue: updatedIssue,
        attachment,
      });
    } catch (error) {
      console.error("[IssueAttachment] POST error:", error);
      return res.status(500).json({ error: error.message || "Failed to add attachment" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { key } = req.body;

      if (!key) {
        return res.status(400).json({ error: "Missing required field: key" });
      }

      console.log("[IssueAttachment] Removing attachment:", { issueId, key });

      // Find and remove the attachment
      const attachmentIndex = issue.attachments?.findIndex((a) => a.key === key);
      if (attachmentIndex === -1) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      issue.attachments.splice(attachmentIndex, 1);
      await issue.save();

      console.log("[IssueAttachment] DB update result:", {
        issueId,
        attachmentCount: issue.attachments.length,
      });

      // Log activity
      await VehicleActivity.log({
        dealerId,
        vehicleId: issue.vehicleId,
        actorId: userId,
        actorName,
        type: "ISSUE_UPDATED",
        message: `Removed attachment from issue: ${issue.category} - ${issue.subcategory}`,
        meta: {
          issueId: issue._id,
          category: issue.category,
          subcategory: issue.subcategory,
        },
      });

      // Return updated issue
      const updatedIssue = issue.toJSON();
      updatedIssue.id = updatedIssue._id.toString();
      delete updatedIssue._id;

      return res.status(200).json({
        success: true,
        issue: updatedIssue,
      });
    } catch (error) {
      console.error("[IssueAttachment] DELETE error:", error);
      return res.status(500).json({ error: error.message || "Failed to remove attachment" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
