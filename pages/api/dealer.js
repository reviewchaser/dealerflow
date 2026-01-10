import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import { withDealerContext } from "@/libs/authContext";
import { getSignedGetUrl } from "@/libs/r2Client";

// Check if R2 is configured
function isR2Configured() {
  return ["S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET", "S3_ENDPOINT"].every(
    (key) => !!process.env[key]
  );
}

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, dealer, role, userId } = ctx;

  if (req.method === "GET") {
    // Return the current dealer from context, including user's role
    const dealerData = dealer.toJSON ? dealer.toJSON() : dealer;

    // If dealer has a logo key, generate a fresh signed URL (1 hour expiry)
    if (dealerData.logoKey && isR2Configured()) {
      try {
        dealerData.logoUrl = await getSignedGetUrl(dealerData.logoKey, 3600);
      } catch (error) {
        console.warn("[Dealer API] Failed to generate signed logo URL:", error.message);
        // Keep existing logoUrl if signing fails
      }
    }

    return res.status(200).json({
      ...dealerData,
      // Include current user's context
      currentUserRole: role,
      currentUserId: userId,
    });
  }

  if (req.method === "PUT") {
    const {
      name, email, phone, address, websiteUrl, googleReviewUrl, logoUrl, settings,
      companyName, companyAddress, companyPhone, companyEmail, slug, formCustomText,
      // Onboarding fields
      completedOnboarding, timezone, primaryContactEmail, primaryContactPhone,
      boardConfig, taskAutoComplete, defaultTaskTemplateGroupId
    } = req.body;

    // Update the current dealer
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (companyName !== undefined) updateFields.companyName = companyName;
    if (companyAddress !== undefined) updateFields.companyAddress = companyAddress;
    if (companyPhone !== undefined) updateFields.companyPhone = companyPhone;
    if (companyEmail !== undefined) updateFields.companyEmail = companyEmail;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (websiteUrl !== undefined) updateFields.websiteUrl = websiteUrl;
    if (googleReviewUrl !== undefined) updateFields.googleReviewUrl = googleReviewUrl;
    if (logoUrl !== undefined) updateFields.logoUrl = logoUrl;
    if (slug !== undefined) updateFields.slug = slug;
    if (settings !== undefined) updateFields.settings = settings;
    if (formCustomText !== undefined) updateFields.formCustomText = formCustomText;
    // Onboarding fields
    if (completedOnboarding !== undefined) updateFields.completedOnboarding = completedOnboarding;
    if (timezone !== undefined) updateFields.timezone = timezone;
    if (primaryContactEmail !== undefined) updateFields.primaryContactEmail = primaryContactEmail;
    if (primaryContactPhone !== undefined) updateFields.primaryContactPhone = primaryContactPhone;
    if (boardConfig !== undefined) updateFields.boardConfig = boardConfig;
    if (taskAutoComplete !== undefined) updateFields.taskAutoComplete = taskAutoComplete;
    if (defaultTaskTemplateGroupId !== undefined) updateFields.defaultTaskTemplateGroupId = defaultTaskTemplateGroupId;

    const updatedDealer = await Dealer.findByIdAndUpdate(
      dealerId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedDealer.toJSON());
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
