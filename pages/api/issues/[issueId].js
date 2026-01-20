import connectMongo from "@/libs/mongoose";
import VehicleIssue from "@/models/VehicleIssue";
import Vehicle from "@/models/Vehicle";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import Deal from "@/models/Deal";
import { withDealerContext } from "@/libs/authContext";
import { logIssuePartsOrdered, logIssuePartsReceived, logIssueResolved } from "@/libs/activityLogger";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId, user } = ctx;
  const { issueId } = req.query;

  // Get the issue and verify it belongs to a vehicle in this dealer
  const issue = await VehicleIssue.findById(issueId);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const vehicle = await Vehicle.findOne({ _id: issue.vehicleId, dealerId }).lean();
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  // Get actor info for activity logging
  const actor = await User.findById(userId).lean();
  const actorName = actor?.name || user?.name || user?.email || "System";

  if (req.method === "PUT") {
    try {
      const updates = { ...req.body };
      const previousStatus = issue.status;

      // Map status if provided (handle both lowercase and proper case)
      if (updates.status) {
        const statusMap = {
          'outstanding': 'Outstanding',
          'ordered': 'Ordered',
          'in_progress': 'In Progress',
          'in progress': 'In Progress',
          'resolved': 'Complete',
          'complete': 'Complete'
        };
        const lowerStatus = updates.status.toLowerCase();
        // If it's already in proper case and valid, keep it; otherwise map it
        if (['Outstanding', 'Ordered', 'In Progress', 'Complete'].includes(updates.status)) {
          // Already in correct format, keep as is
        } else {
          updates.status = statusMap[lowerStatus] || updates.status;
        }
      }

      // Track if issue is being resolved
      const wasComplete = issue.status === "Complete";

      // If status is being set to Complete, add completedAt timestamp
      if (updates.status === "Complete" && !updates.completedAt) {
        updates.completedAt = new Date();
      }

      // Handle parts ordered toggle
      const wasPartsOrdered = issue.partsOrdered;
      if (updates.partsOrdered === true && !wasPartsOrdered) {
        updates.partsOrderedAt = new Date();
        updates.partsOrderedBy = userId;
      }

      // Handle parts received toggle
      const wasPartsReceived = issue.partsReceived;
      if (updates.partsReceived === true && !wasPartsReceived) {
        updates.partsReceivedAt = new Date();
        updates.partsReceivedBy = userId;
      }

      updates.updatedByUserId = userId;

      const updatedIssue = await VehicleIssue.findByIdAndUpdate(
        issueId,
        updates,
        { new: true, runValidators: true }
      ).lean();

      // Log activity for status changes
      if (updates.status && updates.status !== previousStatus) {
        const isResolved = updates.status === "Complete";
        await VehicleActivity.log({
          dealerId,
          vehicleId: issue.vehicleId,
          actorId: userId,
          actorName,
          type: isResolved ? "ISSUE_RESOLVED" : "ISSUE_UPDATED",
          message: isResolved
            ? `Resolved issue: ${issue.category} - ${issue.subcategory}`
            : `Issue status changed: ${issue.category} - ${issue.subcategory} (${previousStatus} → ${updates.status})`,
          meta: {
            issueId: issue._id,
            category: issue.category,
            subcategory: issue.subcategory,
            from: previousStatus,
            to: updates.status,
          },
        });

        // Log to ActivityLog (for dashboard feed) when issue is resolved
        if (isResolved) {
          await logIssueResolved({
            dealerId,
            issueId: issue._id,
            vehicleId: issue.vehicleId,
            vehicleReg: vehicle.regCurrent,
            vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
            category: issue.category,
            subcategory: issue.subcategory,
            userId,
            userName: actorName,
          });

          // Auto-complete any linked deal requests when issue is resolved
          if (!wasComplete) {
            try {
              await Deal.updateMany(
                { "requests.linkToIssueId": issueId },
                {
                  $set: {
                    "requests.$[elem].status": "DONE",
                    "requests.$[elem].completedAt": new Date(),
                  },
                },
                { arrayFilters: [{ "elem.linkToIssueId": issueId }] }
              );
            } catch (dealErr) {
              console.error("[issues] Failed to auto-complete linked deal requests:", dealErr.message);
              // Don't fail the issue update, just log the error
            }
          }
        }
      } else if (Object.keys(updates).length > 1) {
        // Log general update if other fields changed (not just status)
        await VehicleActivity.log({
          dealerId,
          vehicleId: issue.vehicleId,
          actorId: userId,
          actorName,
          type: "ISSUE_UPDATED",
          message: `Updated issue: ${issue.category} - ${issue.subcategory}`,
          meta: {
            issueId: issue._id,
            category: issue.category,
            subcategory: issue.subcategory,
          },
        });
      }

      // Log parts ordered to ActivityLog (for dashboard feed)
      if (updates.partsOrdered === true && !wasPartsOrdered) {
        console.log("[DEBUG] Logging parts ordered - vehicle data:", {
          vehicleId: vehicle._id,
          regCurrent: vehicle.regCurrent,
          make: vehicle.make,
          model: vehicle.model,
        });
        await logIssuePartsOrdered({
          dealerId,
          issueId: issue._id,
          vehicleId: issue.vehicleId,
          vehicleReg: vehicle.regCurrent,
          vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
          category: issue.category,
          subcategory: issue.subcategory,
          supplier: updates.partsSupplier || null,
          userId,
          userName: actorName,
        });
      }

      // Log parts received to ActivityLog (for dashboard feed)
      if (updates.partsReceived === true && !wasPartsReceived) {
        await logIssuePartsReceived({
          dealerId,
          issueId: issue._id,
          vehicleId: issue.vehicleId,
          vehicleReg: vehicle.regCurrent,
          vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
          category: issue.category,
          subcategory: issue.subcategory,
          userId,
          userName: actorName,
        });
      }

      // Transform _id to id
      updatedIssue.id = updatedIssue._id.toString();
      delete updatedIssue._id;

      return res.status(200).json(updatedIssue);
    } catch (error) {
      console.error("Error updating issue:", error);
      return res.status(500).json({ error: error.message || "Failed to update issue" });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Log activity before deletion
      await VehicleActivity.log({
        dealerId,
        vehicleId: issue.vehicleId,
        actorId: userId,
        actorName,
        type: "ISSUE_DELETED",
        message: `Removed issue: ${issue.category} - ${issue.subcategory}`,
        meta: {
          issueId: issue._id,
          category: issue.category,
          subcategory: issue.subcategory,
        },
      });

      await VehicleIssue.findByIdAndDelete(issueId);
      return res.status(200).json({ message: "Issue deleted" });
    } catch (error) {
      console.error("Error deleting issue:", error);
      return res.status(500).json({ error: "Failed to delete issue" });
    }
  }

  if (req.method === "POST") {
    // Add update/comment to issue
    try {
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Update content is required" });
      }

      // Initialize updates array if it doesn't exist
      if (!issue.updates) {
        issue.updates = [];
      }

      // Add new update with proper user info
      issue.updates.push({
        userId,
        userName: actorName,
        content: content.trim(),
        createdAt: new Date(),
      });

      await issue.save();

      // Log activity for comment
      await VehicleActivity.log({
        dealerId,
        vehicleId: issue.vehicleId,
        actorId: userId,
        actorName,
        type: "ISSUE_COMMENT_ADDED",
        message: `Added comment to issue: ${issue.category} - ${issue.subcategory}`,
        meta: {
          issueId: issue._id,
          category: issue.category,
          subcategory: issue.subcategory,
          comment: content.trim().substring(0, 100), // Truncate for meta
        },
      });

      // Return updated issue in the same format as other endpoints
      const updatedIssue = issue.toJSON();
      updatedIssue.id = updatedIssue._id.toString();
      delete updatedIssue._id;

      return res.status(201).json(updatedIssue);
    } catch (error) {
      console.error("Error adding issue update:", error);
      return res.status(500).json({ error: "Failed to add update" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
