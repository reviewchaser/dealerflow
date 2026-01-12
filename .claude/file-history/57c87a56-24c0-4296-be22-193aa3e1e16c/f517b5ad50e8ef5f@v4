// Step 1: Save dealership profile
// This endpoint handles BOTH new users (create dealer) and existing users (update dealer)
import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import DealerMembership from "@/models/DealerMembership";
import User from "@/models/User";
import { withAuth } from "@/libs/authContext";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();
    const { userId } = ctx;
    console.log("[onboarding/profile] userId:", userId);

    const { name, logoUrl, timezone, primaryContactEmail, primaryContactPhone } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ error: "Dealership name is required" });
    }

    // Check if user already has a dealer (via membership)
    let membership = await DealerMembership.findOneActive({ userId }).populate("dealerId");
    let dealer;

    console.log("[onboarding/profile] existing membership:", membership?._id);

    if (membership && membership.dealerId) {
      // Existing dealer - update it
      dealer = await Dealer.findById(membership.dealerId._id);
      console.log("[onboarding/profile] updating existing dealer:", dealer?._id);
    } else {
      // New user - create dealer and OWNER membership
      console.log("[onboarding/profile] creating new dealer for user:", userId);
      dealer = await Dealer.create({
        name: name.trim(),
        timezone: timezone || "Europe/London",
      });

      // Create OWNER membership
      membership = await DealerMembership.create({
        dealerId: dealer._id,
        userId,
        role: "OWNER",
        lastActiveAt: new Date(),
      });

      // Set as user's default dealer
      await User.findByIdAndUpdate(userId, { defaultDealerId: dealer._id });
      console.log("[onboarding/profile] created dealer:", dealer._id, "membership:", membership._id);
    }

    // Update dealer fields
    dealer.name = name.trim();
    if (logoUrl !== undefined) dealer.logoUrl = logoUrl;
    if (timezone) dealer.timezone = timezone;
    if (primaryContactEmail !== undefined) dealer.primaryContactEmail = primaryContactEmail;
    if (primaryContactPhone !== undefined) dealer.primaryContactPhone = primaryContactPhone;

    // Also update company fields for forms
    dealer.companyName = name.trim();
    if (primaryContactEmail) dealer.companyEmail = primaryContactEmail;
    if (primaryContactPhone) dealer.companyPhone = primaryContactPhone;

    await dealer.save();

    return res.status(200).json({
      success: true,
      dealer: {
        id: dealer._id,
        name: dealer.name,
        logoUrl: dealer.logoUrl,
        timezone: dealer.timezone,
      },
    });
  } catch (error) {
    console.error("[onboarding/profile] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to save profile" });
  }
}

export default withAuth(handler);
