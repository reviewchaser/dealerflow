/**
 * API Route: GET /api/dealers/by-slug/[slug]
 *
 * Resolves a dealer by URL slug and verifies the current user has access.
 * Used by DealerContext to resolve tenant from URL.
 */

import connectMongo from "@/libs/mongoose";
import Dealer, { DEALER_STATUS } from "@/models/Dealer";
import DealerMembership from "@/models/DealerMembership";
import User, { USER_STATUS, PLATFORM_ROLES } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: "Slug is required" });
  }

  // Require authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized - Please sign in" });
  }

  const userId = session.user.id;

  // Check if user is disabled
  const user = await User.findById(userId).lean();
  if (user?.status === USER_STATUS.DISABLED) {
    return res.status(403).json({ error: "Your account has been disabled" });
  }

  // SUPER_ADMIN cannot access dealer context
  if (user?.role === PLATFORM_ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      error: "Platform admins cannot access dealer workflows",
    });
  }

  // Find dealer by slug
  const dealer = await Dealer.findOne({ slug }).lean();

  if (!dealer) {
    return res.status(404).json({ error: "Dealership not found" });
  }

  // Check if dealer is disabled
  if (dealer.status === DEALER_STATUS.DISABLED) {
    return res.status(403).json({
      error: "This dealership has been disabled",
    });
  }

  // Verify user has active membership to this dealer
  const membership = await DealerMembership.findOneActive({
    userId,
    dealerId: dealer._id,
  }).lean();

  if (!membership) {
    return res.status(403).json({
      error: "You don't have access to this dealership",
    });
  }

  // Update last active timestamp (fire and forget)
  DealerMembership.updateOne(
    { _id: membership._id },
    { lastActiveAt: new Date() }
  ).exec();

  // Return dealer with user's role context
  return res.status(200).json({
    ...dealer,
    _id: dealer._id.toString(),
    currentUserRole: membership.role,
    currentUserId: userId,
  });
}
