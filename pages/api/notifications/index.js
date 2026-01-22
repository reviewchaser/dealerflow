import connectMongo from "@/libs/mongoose";
import Notification from "@/models/Notification";
import Vehicle from "@/models/Vehicle";
import VehicleIssue from "@/models/VehicleIssue";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;

  if (req.method === "GET") {
    try {
      const { unreadOnly } = req.query;

      // Build query for user's notifications
      const query = {
        dealerId,
        userId, // Personal notifications for this user
      };

      // Filter unread only if requested
      if (unreadOnly === "true") {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Batch fetch related data (avoids N+1 queries)
      const vehicleIds = notifications.filter(n => n.relatedVehicleId).map(n => n.relatedVehicleId);
      const issueIds = notifications.filter(n => n.relatedIssueId).map(n => n.relatedIssueId);

      const [vehicles, issues] = await Promise.all([
        vehicleIds.length > 0
          ? Vehicle.find({ _id: { $in: vehicleIds } }).select("regCurrent make model").lean()
          : [],
        issueIds.length > 0
          ? VehicleIssue.find({ _id: { $in: issueIds } }).select("category subcategory description status createdByUserId").lean()
          : [],
      ]);

      // Get unique user IDs from issues for creator names
      const userIds = [...new Set(issues.filter(i => i.createdByUserId).map(i => i.createdByUserId.toString()))];
      const users = userIds.length > 0
        ? await User.find({ _id: { $in: userIds } }).select("name email").lean()
        : [];

      // Create lookup maps for O(1) access
      const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v]));
      const issueMap = Object.fromEntries(issues.map(i => [i._id.toString(), i]));
      const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

      // Enrich notifications using the maps (no DB calls in loop)
      const enrichedNotifications = notifications.map((notification) => {
        const result = {
          id: notification._id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        };

        // Add vehicle info if available
        if (notification.relatedVehicleId) {
          const vehicle = vehicleMap[notification.relatedVehicleId.toString()];
          if (vehicle) {
            result.vehicle = {
              id: vehicle._id.toString(),
              regCurrent: vehicle.regCurrent,
              make: vehicle.make,
              model: vehicle.model,
            };
          }
        }

        // Add issue info if available
        if (notification.relatedIssueId) {
          const issue = issueMap[notification.relatedIssueId.toString()];
          if (issue) {
            result.issue = {
              id: issue._id.toString(),
              category: issue.category,
              subcategory: issue.subcategory,
              description: issue.description,
              status: issue.status,
            };

            // Get creator name from user map
            if (issue.createdByUserId) {
              const creator = userMap[issue.createdByUserId.toString()];
              if (creator) {
                result.assignedBy = creator.name || creator.email;
              }
            }
          }
        }

        return result;
      });

      // Get unread count
      const unreadCount = await Notification.countDocuments({
        dealerId,
        userId,
        isRead: false,
      });

      return res.status(200).json({
        notifications: enrichedNotifications,
        unreadCount,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
