import connectMongo from "@/libs/mongoose";
import { withSuperAdmin } from "@/libs/authContext";
import User, { PLATFORM_ROLES } from "@/models/User";
import DealerMembership from "@/models/DealerMembership";
import Dealer from "@/models/Dealer";
import PlatformActivity, { ACTIVITY_TYPES } from "@/models/PlatformActivity";

// User status for admin control
export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
};

async function handler(req, res, ctx) {
  await connectMongo();

  // GET - List all users with dealer info
  if (req.method === "GET") {
    try {
      const users = await User.find()
        .sort({ createdAt: -1 })
        .lean();

      // Enrich with dealer membership info
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          // Get primary membership (most recent active)
          const membership = await DealerMembership.findOne({
            userId: user._id,
            status: "ACTIVE",
          })
            .sort({ lastActiveAt: -1 })
            .populate("dealerId", "name")
            .lean();

          // Get all active memberships count
          const membershipsCount = await DealerMembership.countDocuments({
            userId: user._id,
            status: "ACTIVE",
          });

          return {
            id: user._id.toString(),
            email: user.email,
            fullName: user.fullName || user.name || "—",
            platformRole: user.role || PLATFORM_ROLES.USER,
            dealerRole: membership?.role || "—",
            dealerName: membership?.dealerId?.name || "—",
            dealerId: membership?.dealerId?._id?.toString() || null,
            membershipsCount,
            status: user.status || USER_STATUS.ACTIVE,
            createdAt: user.createdAt,
            lastActiveAt: membership?.lastActiveAt || null,
          };
        })
      );

      return res.status(200).json(enrichedUsers);
    } catch (error) {
      console.error("[Admin Users GET]", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  // PATCH - Update user status (disable/enable)
  if (req.method === "PATCH") {
    try {
      const { userId, status } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      if (!Object.values(USER_STATUS).includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Don't allow disabling yourself
      if (userId === ctx.userId) {
        return res.status(400).json({ error: "You cannot disable your own account" });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true }
      ).lean();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the activity
      const activityType = status === USER_STATUS.DISABLED
        ? ACTIVITY_TYPES.USER_DISABLED
        : ACTIVITY_TYPES.USER_ENABLED;

      await PlatformActivity.log(activityType, {
        actorUserId: ctx.userId,
        targetUserId: user._id,
        metadata: { userEmail: user.email },
      });

      return res.status(200).json({
        id: user._id.toString(),
        email: user.email,
        status: user.status,
      });
    } catch (error) {
      console.error("[Admin Users PATCH]", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withSuperAdmin(handler);
