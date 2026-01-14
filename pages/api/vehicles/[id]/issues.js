import connectMongo from "@/libs/mongoose";
import VehicleIssue from "@/models/VehicleIssue";
import Vehicle from "@/models/Vehicle";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";
import { logIssueCreated } from "@/libs/activityLogger";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId, user } = ctx;
  const { id } = req.query; // vehicleId

  // Verify vehicle belongs to this dealer
  const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  if (req.method === "GET") {
    try {
      const issues = await VehicleIssue.find({ vehicleId: id }).sort({ createdAt: -1 }).lean();
      return res.status(200).json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      return res.status(500).json({ error: "Failed to fetch issues" });
    }
  }

  if (req.method === "POST") {
    try {
      const { category, subcategory, description, photos, actionNeeded, priority, location, status, notes, partsRequired, partsDetails } = req.body;

      if (!category || !subcategory || !description) {
        return res.status(400).json({ error: "Category, subcategory, and description are required" });
      }

      // Map lowercase categories to proper case for model
      const categoryMap = {
        'cosmetic': 'Cosmetic',
        'bodywork': 'Cosmetic',
        'mechanical': 'Mechanical',
        'electrical': 'Electrical',
        'interior': 'Cosmetic',
        'tyres': 'Mechanical',
        'mot': 'Mechanical',
        'service': 'Mechanical',
        'fault_codes': 'Mechanical',
        'other': 'Other'
      };

      // Map lowercase status to proper case for model
      const statusMap = {
        'outstanding': 'Outstanding',
        'ordered': 'Ordered',
        'in_progress': 'In Progress',
        'resolved': 'Complete',
        'complete': 'Complete'
      };

      const mappedCategory = categoryMap[category.toLowerCase()] || 'Other';
      const mappedStatus = statusMap[(status || 'outstanding').toLowerCase()] || 'Outstanding';

      const issue = await VehicleIssue.create({
        vehicleId: id,
        category: mappedCategory,
        subcategory,
        description,
        photos: photos || [],
        actionNeeded,
        priority: priority || "medium",
        location: location || null,
        status: mappedStatus,
        notes,
        partsRequired: partsRequired || false,
        partsDetails: partsDetails || null,
      });

      // Log activity to VehicleActivity (legacy)
      const actor = await User.findById(userId).lean();
      const actorName = actor?.name || user?.name || user?.email || "System";
      await VehicleActivity.log({
        dealerId,
        vehicleId: id,
        actorId: userId,
        actorName,
        type: "ISSUE_ADDED",
        message: `Added ${mappedCategory} issue: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
        meta: { issueId: issue._id, category: mappedCategory, subcategory },
      });

      // Log to ActivityLog (for dashboard feed)
      await logIssueCreated({
        dealerId,
        issueId: issue._id,
        vehicleId: id,
        vehicleReg: vehicle.regCurrent,
        vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
        category: mappedCategory,
        subcategory,
        priority: priority || "medium",
        userId,
        userName: actorName,
      });

      return res.status(201).json(issue.toJSON());
    } catch (error) {
      console.error("Error creating issue:", error);
      return res.status(500).json({ error: error.message || "Failed to create issue" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
