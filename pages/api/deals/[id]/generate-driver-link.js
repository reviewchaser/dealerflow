import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import crypto from "crypto";

/**
 * POST /api/deals/[id]/generate-driver-link
 * Generate a secure link for a driver to capture customer signature on delivery
 *
 * Returns:
 * - link: The full URL for the driver signing page
 * - expiresAt: When the link expires (24 hours)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.dealerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.query;
    const { pin } = req.body || {};

    await connectMongo();

    // Find deal
    const deal = await Deal.findOne({
      _id: id,
      dealerId: session.user.dealerId,
    });

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    // Check deal has invoice
    if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) {
      return res.status(400).json({ error: "Deal must have an invoice before generating driver link" });
    }

    // Validate PIN if provided (must be 4 digits)
    let pinHash = null;
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be exactly 4 digits" });
      }
      pinHash = crypto.createHash("sha256").update(pin).digest("hex");
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update deal with token (and PIN if provided)
    const updateFields = {
      "signature.driverLinkToken": token,
      "signature.driverLinkTokenHash": tokenHash,
      "signature.driverLinkExpiresAt": expiresAt,
    };
    if (pinHash) {
      updateFields["signature.driverLinkPinHash"] = pinHash;
    } else {
      // Clear any existing PIN
      updateFields["signature.driverLinkPinHash"] = null;
    }
    await Deal.findByIdAndUpdate(deal._id, { $set: updateFields });

    // Build the link - prefer PRODUCTION_URL for consistent links
    const baseUrl = process.env.PRODUCTION_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/public/delivery-signing/${token}`;

    res.status(200).json({
      success: true,
      link,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[generate-driver-link] Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate driver link" });
  }
}
