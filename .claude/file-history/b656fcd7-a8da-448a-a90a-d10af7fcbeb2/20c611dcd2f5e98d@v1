/**
 * Set User's Default Dealer
 *
 * PUT /api/user/default-dealer
 *
 * Sets the default dealership for the current user.
 * Used when navigating between dealerships in a multi-dealer setup.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/authOptions";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import DealerMembership from "@/models/DealerMembership";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { dealerId } = req.body;
  if (!dealerId) {
    return res.status(400).json({ error: "dealerId is required" });
  }

  try {
    await connectMongo();

    // Verify user has membership at this dealer
    const membership = await DealerMembership.findOne({
      userId: session.user.id,
      dealerId: dealerId,
      status: "ACTIVE",
    });

    if (!membership) {
      return res.status(403).json({ error: "No access to this dealership" });
    }

    // Update user's default dealer
    await User.findByIdAndUpdate(session.user.id, {
      defaultDealerId: dealerId,
    });

    // Update membership's lastActiveAt
    await DealerMembership.findByIdAndUpdate(membership._id, {
      lastActiveAt: new Date(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[DefaultDealer] Error:", error);
    return res.status(500).json({ error: "Failed to set default dealer" });
  }
}
