/**
 * Debug Context API
 *
 * Returns current session context for debugging purposes.
 * Only available in development mode.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import DealerMembership from "@/models/DealerMembership";
import Dealer from "@/models/Dealer";

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(200).json({
        authenticated: false,
        userId: null,
        userEmail: null,
        userRole: null,
        dealerId: null,
        dealerName: null,
        membershipRole: null,
      });
    }

    await connectMongo();

    // Get user info
    const user = await User.findById(session.user.id).lean();

    // Get active membership
    const membership = await DealerMembership.findOneActive({
      userId: session.user.id,
    })
      .populate("dealerId")
      .lean();

    const dealer = membership?.dealerId;

    return res.status(200).json({
      authenticated: true,
      userId: session.user.id,
      userEmail: user?.email || session.user.email,
      userRole: user?.role || "USER",
      userStatus: user?.status || "ACTIVE",
      dealerId: dealer?._id?.toString() || null,
      dealerName: dealer?.name || null,
      dealerSlug: dealer?.slug || null,
      dealerStatus: dealer?.status || null,
      membershipRole: membership?.role || null,
      defaultDealerId: user?.defaultDealerId?.toString() || null,
    });
  } catch (error) {
    console.error("[Debug Context] Error:", error);
    return res.status(500).json({ error: "Failed to get context" });
  }
}
