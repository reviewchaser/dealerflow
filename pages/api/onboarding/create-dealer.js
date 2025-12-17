import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/authOptions";
import Dealer from "@/models/Dealer";
import DealerMembership from "@/models/DealerMembership";
import User from "@/models/User";
import PlatformActivity, { ACTIVITY_TYPES } from "@/models/PlatformActivity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get authenticated user
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { name, logoUrl } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Dealership name is required" });
  }

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Check if user already has an active dealer membership
    const existingMembership = await DealerMembership.findOneActive({
      userId: session.user.id,
    });

    if (existingMembership) {
      return res.status(400).json({ error: "You already have a dealership" });
    }

    // Generate a URL-safe slug from the name
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness and add suffix if needed
    let slug = baseSlug;
    let suffix = 1;
    while (await Dealer.findOne({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // Create the dealer
    const dealer = await Dealer.create({
      name: name.trim(),
      logoUrl: logoUrl || null,
      slug,
      completedOnboarding: false,
      onboarding: {
        enabledModules: {
          salesPrep: true,
          appraisals: true,
          warranty: false,
          reviews: false,
        },
        enabledForms: [],
        completedSteps: [],
      },
    });

    // Create membership with OWNER role
    await DealerMembership.create({
      dealerId: dealer._id,
      userId: session.user.id,
      role: "OWNER",
      lastActiveAt: new Date(),
    });

    // Set this dealer as the user's default
    await User.findByIdAndUpdate(session.user.id, {
      defaultDealerId: dealer._id,
      dealerId: dealer._id, // Legacy field
    });

    // Log platform activity
    await PlatformActivity.log(ACTIVITY_TYPES.DEALER_CREATED, {
      actorUserId: session.user.id,
      dealerId: dealer._id,
      metadata: { dealerName: dealer.name },
    });

    return res.status(201).json({
      success: true,
      dealerId: dealer._id.toString(),
      slug: dealer.slug,
    });
  } catch (error) {
    console.error("[CreateDealer] Error:", error);
    return res.status(500).json({ error: "Failed to create dealership" });
  }
}
