// Skip onboarding - seeds all defaults and marks complete
import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import { seedAllDefaultsForDealer } from "@/libs/seedDefaults";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    // Find the dealer
    // TODO: In multi-tenant setup, get dealer from session
    const dealer = await Dealer.findOne();

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Seed all defaults
    const seedResult = await seedAllDefaultsForDealer(dealer._id);

    // Mark onboarding as complete
    dealer.completedOnboarding = true;
    await dealer.save();

    console.log(`[Onboarding] Skipped for dealer ${dealer._id}, seeded defaults:`, seedResult);

    return res.status(200).json({
      success: true,
      skipped: true,
      seeded: seedResult,
    });
  } catch (error) {
    console.error("[Onboarding Skip] Error:", error);
    return res.status(500).json({ error: "Failed to skip onboarding" });
  }
}
