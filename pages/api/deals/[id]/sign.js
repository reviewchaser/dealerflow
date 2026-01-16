import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import SalesDocument from "@/models/SalesDocument";
import { uploadToR2, getSignedGetUrl } from "@/libs/r2Client";

/**
 * POST /api/deals/[id]/sign
 * Capture e-signatures for a deal
 *
 * Body:
 * - customerSignature: base64 data URL (optional if already signed)
 * - customerName: string
 * - dealerSignature: base64 data URL
 * - dealerName: string
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
    const { customerSignature, customerName, dealerSignature, dealerName } = req.body;

    // Validate required fields
    if (!dealerSignature || !dealerName) {
      return res.status(400).json({ error: "Dealer signature and name are required" });
    }

    await connectMongo();

    // Find deal
    const deal = await Deal.findOne({
      _id: id,
      dealerId: session.user.dealerId,
    });

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    // Check deal has invoice (required for signing)
    if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) {
      return res.status(400).json({ error: "Deal must have an invoice before signing" });
    }

    const now = new Date();
    const updates = {
      "signature.dealerSignedAt": now,
      "signature.dealerSignerName": dealerName,
    };

    // Upload dealer signature to R2
    const dealerKey = `signatures/${deal.dealerId}/${deal._id}/dealer-${Date.now()}.png`;
    const dealerBuffer = Buffer.from(dealerSignature.split(",")[1], "base64");
    await uploadToR2(dealerKey, dealerBuffer, "image/png");
    updates["signature.dealerSignatureImageKey"] = dealerKey;

    // Upload customer signature if provided
    if (customerSignature && customerName) {
      const customerKey = `signatures/${deal.dealerId}/${deal._id}/customer-${Date.now()}.png`;
      const customerBuffer = Buffer.from(customerSignature.split(",")[1], "base64");
      await uploadToR2(customerKey, customerBuffer, "image/png");
      updates["signature.customerSignedAt"] = now;
      updates["signature.customerSignerName"] = customerName;
      updates["signature.customerSignatureImageKey"] = customerKey;
    }

    // Update deal
    const updatedDeal = await Deal.findByIdAndUpdate(
      deal._id,
      { $set: updates },
      { new: true }
    );

    // Generate signed URLs for signature images (90 days expiry)
    const dealerSignatureUrl = await getSignedGetUrl(dealerKey, 7 * 24 * 60 * 60);
    let customerSignatureUrl = null;
    if (customerSignature && customerName) {
      const customerKey = updates["signature.customerSignatureImageKey"];
      customerSignatureUrl = await getSignedGetUrl(customerKey, 7 * 24 * 60 * 60);
    }

    // Also update the invoice snapshot with signature info (NOTE: path is snapshotData, not snapshot)
    await SalesDocument.updateOne(
      {
        dealId: deal._id,
        type: "INVOICE",
      },
      {
        $set: {
          "snapshotData.signature": {
            customerSignedAt: customerSignature ? now : deal.signature?.customerSignedAt,
            customerSignerName: customerName || deal.signature?.customerSignerName,
            customerSignatureImageUrl: customerSignatureUrl || deal.signature?.customerSignatureImageUrl,
            dealerSignedAt: now,
            dealerSignerName: dealerName,
            dealerSignatureImageUrl: dealerSignatureUrl,
          },
        },
      }
    );

    res.status(200).json({
      success: true,
      signature: updatedDeal.signature,
    });
  } catch (error) {
    console.error("[sign] Error:", error);
    res.status(500).json({ error: error.message || "Failed to save signatures" });
  }
}
