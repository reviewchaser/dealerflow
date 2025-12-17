import connectMongo from "@/libs/mongoose";
import VehicleIssue from "@/models/VehicleIssue";

export default async function handler(req, res) {
  await connectMongo();

  const { issueId } = req.query;

  if (req.method === "PUT") {
    try {
      const updates = { ...req.body };

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

      // If status is being set to Complete, add completedAt timestamp
      if (updates.status === "Complete" && !updates.completedAt) {
        updates.completedAt = new Date();
      }

      const issue = await VehicleIssue.findByIdAndUpdate(
        issueId,
        updates,
        { new: true, runValidators: true }
      ).lean();

      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }

      // Transform _id to id
      issue.id = issue._id.toString();
      delete issue._id;

      return res.status(200).json(issue);
    } catch (error) {
      console.error("Error updating issue:", error);
      return res.status(500).json({ error: error.message || "Failed to update issue" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const issue = await VehicleIssue.findByIdAndDelete(issueId);

      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }

      return res.status(200).json({ message: "Issue deleted" });
    } catch (error) {
      console.error("Error deleting issue:", error);
      return res.status(500).json({ error: "Failed to delete issue" });
    }
  }

  if (req.method === "POST") {
    // Add update/comment to issue
    try {
      const { content, userName } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Update content is required" });
      }

      const issue = await VehicleIssue.findById(issueId);
      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }

      // Initialize updates array if it doesn't exist
      if (!issue.updates) {
        issue.updates = [];
      }

      // Add new update
      issue.updates.push({
        content: content.trim(),
        userName: userName || "Unknown User",
        createdAt: new Date(),
      });

      await issue.save();

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
