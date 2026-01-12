/**
 * Create User API - Direct user creation without email invite
 *
 * POST - Create a new user with password and add to current dealer
 */

import connectMongo from "@/libs/mongoose";
import {
  withDealerContext,
  requireTeamManagement,
  canAssignRole,
} from "@/libs/authContext";
import DealerMembership, { MEMBERSHIP_ROLES } from "@/models/DealerMembership";
import User, { USER_STATUS } from "@/models/User";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId, membership } = ctx;

  // Only admins and owners can create users
  requireTeamManagement(membership);

  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name?.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!email?.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate role
  const memberRole = role || "STAFF";
  if (!MEMBERSHIP_ROLES.includes(memberRole)) {
    return res.status(400).json({
      error: `Invalid role. Must be: ${MEMBERSHIP_ROLES.join(", ")}`,
    });
  }

  // Check if current user can assign this role
  canAssignRole(membership, memberRole);

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Check if user is already a member of this dealer
      const existingMembership = await DealerMembership.findOne({
        userId: existingUser._id,
        dealerId,
        removedAt: null,
      });

      if (existingMembership) {
        return res.status(400).json({ error: "This user is already a member of your team" });
      }

      // User exists but not a member - add them to the team
      const newMembership = await DealerMembership.create({
        userId: existingUser._id,
        dealerId,
        role: memberRole,
        invitedByUserId: userId,
      });

      return res.status(200).json({
        success: true,
        message: "Existing user added to team",
        userId: existingUser._id,
        membershipId: newMembership._id,
      });
    }

    // Create new user
    const passwordHash = await User.hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      status: USER_STATUS.ACTIVE,
      dealerId, // Deprecated but kept for backwards compatibility
    });

    // Create membership for the new user
    const newMembership = await DealerMembership.create({
      userId: newUser._id,
      dealerId,
      role: memberRole,
      invitedByUserId: userId,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: newUser._id,
      membershipId: newMembership._id,
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }
    return res.status(500).json({ error: "Failed to create user" });
  }
}

export default withDealerContext(handler);
