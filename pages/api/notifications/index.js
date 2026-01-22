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

      // Enrich with vehicle and issue details
      const enrichedNotifications = await Promise.all(
        notifications.map(async (notification) => {
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
            const vehicle = await Vehicle.findById(notification.relatedVehicleId)
              .select("regCurrent make model")
              .lean();
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
            const issue = await VehicleIssue.findById(notification.relatedIssueId)
              .select("category subcategory description status createdByUserId")
              .lean();
            if (issue) {
              result.issue = {
                id: issue._id.toString(),
                category: issue.category,
                subcategory: issue.subcategory,
                description: issue.description,
                status: issue.status,
              };

              // Get creator name
              if (issue.createdByUserId) {
                const creator = await User.findById(issue.createdByUserId)
                  .select("name email")
                  .lean();
                if (creator) {
                  result.assignedBy = creator.name || creator.email;
                }
              }
            }
          }

          return result;
        })
      );

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
