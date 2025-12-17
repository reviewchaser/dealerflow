/**
 * Team Members API
 *
 * GET    - List all members of the current dealer
 * PATCH  - Change a member's role
 * DELETE - Remove a member (soft delete)
 */

import connectMongo from "@/libs/mongoose";
import {
  withDealerContext,
  requireTeamManagement,
  canAssignRole,
  AuthError,
} from "@/libs/authContext";
import DealerMembership, { MEMBERSHIP_ROLES } from "@/models/DealerMembership";
import User from "@/models/User";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId, membership } = ctx;

  // GET - List members
  if (req.method === "GET") {
    const members = await DealerMembership.findActive({ dealerId })
      .populate("userId", "name email image")
      .sort({ role: 1, createdAt: 1 })
      .lean();

    // Transform for response
    const result = members.map((m) => ({
      id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name || "Unknown",
      email: m.userId?.email || "",
      image: m.userId?.image || null,
      role: m.role,
      joinedAt: m.createdAt,
      lastActiveAt: m.lastActiveAt,
      isCurrentUser: m.userId?._id?.toString() === userId,
    }));

    return res.status(200).json(result);
  }

  // PATCH - Change role
  if (req.method === "PATCH") {
    requireTeamManagement(membership);

    const { membershipId, newRole } = req.body;

    if (!membershipId || !newRole) {
      return res.status(400).json({ error: "membershipId and newRole required" });
    }

    if (!MEMBERSHIP_ROLES.includes(newRole)) {
      return res.status(400).json({ error: `Invalid role. Must be: ${MEMBERSHIP_ROLES.join(", ")}` });
    }

    // Check if current user can assign this role
    canAssignRole(membership, newRole);

    // Find the target membership
    const targetMembership = await DealerMembership.findOne({
      _id: membershipId,
      dealerId,
      removedAt: null,
    });

    if (!targetMembership) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Prevent demoting the last owner
    if (targetMembership.role === "OWNER" && newRole !== "OWNER") {
      const isLast = await targetMembership.isLastOwner();
      if (isLast) {
        return res.status(400).json({
          error: "Cannot demote the last owner. Promote another user to OWNER first.",
        });
      }
    }

    // Prevent non-owners from demoting owners
    if (targetMembership.role === "OWNER" && membership.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can change another owner's role" });
    }

    targetMembership.role = newRole;
    await targetMembership.save();

    return res.status(200).json({
      success: true,
      message: `Role changed to ${newRole}`,
    });
  }

  // DELETE - Remove member (soft delete)
  if (req.method === "DELETE") {
    requireTeamManagement(membership);

    const { membershipId } = req.body;

    if (!membershipId) {
      return res.status(400).json({ error: "membershipId required" });
    }

    // Find the target membership
    const targetMembership = await DealerMembership.findOne({
      _id: membershipId,
      dealerId,
      removedAt: null,
    });

    if (!targetMembership) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Cannot remove yourself
    if (targetMembership.userId.toString() === userId) {
      return res.status(400).json({ error: "Cannot remove yourself from the team" });
    }

    // Cannot remove an owner unless you're also an owner
    if (targetMembership.role === "OWNER" && membership.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can remove other owners" });
    }

    // Prevent removing the last owner
    if (targetMembership.role === "OWNER") {
      const isLast = await targetMembership.isLastOwner();
      if (isLast) {
        return res.status(400).json({
          error: "Cannot remove the last owner. Transfer ownership first.",
        });
      }
    }

    // Soft delete
    targetMembership.removedAt = new Date();
    targetMembership.removedByUserId = userId;
    await targetMembership.save();

    return res.status(200).json({
      success: true,
      message: "Member removed from team",
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
