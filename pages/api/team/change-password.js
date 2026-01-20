/**
 * Change Password API - Change a team member's password
 *
 * POST - Change password for a team member (OWNER/ADMIN only)
 */

import connectMongo from "@/libs/mongoose";
import {
  withDealerContext,
  requireTeamManagement,
} from "@/libs/authContext";
import DealerMembership from "@/models/DealerMembership";
import User from "@/models/User";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, membership } = ctx;

  // Only admins and owners can change passwords
  requireTeamManagement(membership);

  const { userId, newPassword } = req.body;

  // Validate required fields
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is a member of this dealer
    const targetMembership = await DealerMembership.findOne({
      userId: user._id,
      dealerId,
      removedAt: null,
    });

    if (!targetMembership) {
      return res.status(404).json({ error: "User is not a member of this dealership" });
    }

    // Prevent non-owners from changing owner passwords
    if (targetMembership.role === "OWNER" && membership.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can change owner passwords" });
    }

    // Hash the new password and update
    const passwordHash = await User.hashPassword(newPassword);
    await User.findByIdAndUpdate(userId, { passwordHash });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Failed to change password" });
  }
}

export default withDealerContext(handler);
