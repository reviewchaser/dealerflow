import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import { withDealerContext } from "@/libs/authContext";

export default withDealerContext(async (req, res, ctx) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId } = ctx;

  try {
    const { enabledModules } = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Initialize onboarding object if it doesn't exist
    if (!dealer.onboarding) {
      dealer.onboarding = {};
    }

    // Update enabled modules
    dealer.onboarding.enabledModules = {
      salesPrep: enabledModules?.salesPrep ?? true,
      appraisals: enabledModules?.appraisals ?? true,
      warranty: enabledModules?.warranty ?? false,
      reviews: enabledModules?.reviews ?? false,
    };

    // Mark modules step as completed
    if (!dealer.onboarding.completedSteps) {
      dealer.onboarding.completedSteps = [];
    }
    if (!dealer.onboarding.completedSteps.includes("modules")) {
      dealer.onboarding.completedSteps.push("modules");
    }

    await dealer.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving modules:", error);
    return res.status(500).json({ error: "Failed to save modules" });
  }
});
