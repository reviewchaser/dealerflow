import connectMongo from "@/libs/mongoose";
import { withSuperAdmin } from "@/libs/authContext";
import PlatformActivity from "@/models/PlatformActivity";
import User from "@/models/User";
import Dealer from "@/models/Dealer";

async function handler(req, res, ctx) {
  await connectMongo();

  // GET - List platform activity
  if (req.method === "GET") {
    try {
      const { limit = 50, offset = 0, type } = req.query;

      const query = {};
      if (type) {
        query.type = type;
      }

      const [activities, total] = await Promise.all([
        PlatformActivity.find(query)
          .sort({ createdAt: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit))
          .lean(),
        PlatformActivity.countDocuments(query),
      ]);

      // Enrich with actor/dealer/target info
      const enrichedActivities = await Promise.all(
        activities.map(async (activity) => {
          let actorName = null;
          let dealerName = null;
          let targetName = null;

          if (activity.actorUserId) {
            const actor = await User.findById(activity.actorUserId)
              .select("email fullName name")
              .lean();
            actorName = actor?.fullName || actor?.name || actor?.email || "Unknown";
          }

          if (activity.dealerId) {
            const dealer = await Dealer.findById(activity.dealerId)
              .select("name")
              .lean();
            dealerName = dealer?.name || activity.metadata?.dealerName || "Unknown";
          }

          if (activity.targetUserId) {
            const target = await User.findById(activity.targetUserId)
              .select("email fullName name")
              .lean();
            targetName = target?.fullName || target?.name || target?.email || activity.metadata?.userEmail || "Unknown";
          }

          return {
            id: activity._id.toString(),
            type: activity.type,
            actorName,
            dealerName,
            targetName,
            metadata: activity.metadata,
            createdAt: activity.createdAt,
          };
        })
      );

      return res.status(200).json({
        activities: enrichedActivities,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error("[Admin Activity GET]", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withSuperAdmin(handler);
