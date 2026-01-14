/**
 * Public Dealer Info API
 *
 * GET /api/public/dealer/[dealerSlug]
 *
 * Returns basic dealer info for public forms (no auth required)
 */

import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import { getSignedGetUrl } from "@/libs/r2Client";

// Check if R2 is configured
function isR2Configured() {
  return ["S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET", "S3_ENDPOINT"].every(
    (key) => !!process.env[key]
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  const { dealerSlug } = req.query;

  if (!dealerSlug) {
    return res.status(400).json({ error: "Dealer slug is required" });
  }

  try {
    // Find dealer by slug or ID
    let dealer = await Dealer.findOne({ slug: dealerSlug }).lean();

    if (!dealer) {
      // Try finding by ID as fallback
      dealer = await Dealer.findById(dealerSlug).lean();
    }

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Generate fresh signed URL for logo if available
    let logoUrl = dealer.logoUrl;
    if (dealer.logoKey && isR2Configured()) {
      try {
        logoUrl = await getSignedGetUrl(dealer.logoKey, 3600);
      } catch (error) {
        console.warn("[Public Dealer API] Failed to generate signed logo URL:", error.message);
      }
    }

    // Return only public-safe dealer info
    return res.status(200).json({
      id: dealer._id.toString(),
      name: dealer.name,
      companyName: dealer.companyName,
      logoUrl,
      phone: dealer.phone,
      email: dealer.email,
      address: dealer.address,
      websiteUrl: dealer.websiteUrl,
    });
  } catch (error) {
    console.error("[Public Dealer API] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
