import connectMongo from "@/libs/mongoose";
import Notification from "@/models/Notification";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Get the notification and verify it belongs to this user
  const notification = await Notification.findOne({
    _id: id,
    dealerId,
    userId,
  });

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  if (req.method === "PATCH") {
    try {
      const { isRead } = req.body;

      if (typeof isRead !== "boolean") {
        return res.status(400).json({ error: "isRead must be a boolean" });
      }

      notification.isRead = isRead;
      await notification.save();

      return res.status(200).json({
        id: notification._id.toString(),
        isRead: notification.isRead,
        message: isRead ? "Notification marked as read" : "Notification marked as unread",
      });
    } catch (error) {
      console.error("Error updating notification:", error);
      return res.status(500).json({ error: "Failed to update notification" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await Notification.findByIdAndDelete(id);
      return res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      return res.status(500).json({ error: "Failed to delete notification" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
