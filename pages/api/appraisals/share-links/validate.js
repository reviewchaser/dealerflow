import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import AppraisalShareLink from "@/models/AppraisalShareLink";
import Dealer from "@/models/Dealer";

// Hash token with SHA256
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// This endpoint is PUBLIC - no auth required
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Hash the provided token to find the link
    const tokenHash = hashToken(token);

    const link = await AppraisalShareLink.findOne({ tokenHash }).lean();

    if (!link) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    // Check if link is active
    if (!link.isActive) {
      return res.status(403).json({ error: "This link has been deactivated" });
    }

    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(403).json({ error: "This link has expired" });
    }

    // Get dealer info
    const dealer = await Dealer.findById(link.dealerId).lean();

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Update usage stats
    await AppraisalShareLink.updateOne(
      { _id: link._id },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      }
    );

    // Return dealer info for the form to display
    return res.status(200).json({
      valid: true,
      dealerId: dealer._id,
      dealerName: dealer.name || dealer.companyName,
      dealerLogo: dealer.logoUrl,
      linkId: link._id,
      linkType: link.linkType || "customer_px",
    });
  } catch (error) {
    console.error("Error validating share link:", error);
    return res.status(500).json({ error: "Failed to validate link" });
  }
}
