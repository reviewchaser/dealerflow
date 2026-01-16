import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import SalesDocument from "@/models/SalesDocument";
import { uploadToR2, getSignedGetUrl } from "@/libs/r2Client";

/**
 * POST /api/deals/[id]/sign-deposit
 * Capture e-signatures for a deposit receipt
 *
 * Body:
 * - customerSignature: base64 data URL
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

    // Check deal has deposit receipt
    if (!["DEPOSIT_TAKEN", "INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) {
      return res.status(400).json({ error: "Deal must have a deposit receipt before signing" });
    }

    // Find the deposit receipt document
    const depositReceipt = await SalesDocument.findOne({
      dealId: deal._id,
      type: "DEPOSIT_RECEIPT",
    });

    if (!depositReceipt) {
      return res.status(404).json({ error: "Deposit receipt not found" });
    }

    const now = new Date();
    const signatureUpdate = {
      dealerSignedAt: now,
      dealerSignerName: dealerName,
    };

    // Upload dealer signature to R2
    const dealerKey = `signatures/${deal.dealerId}/${deal._id}/deposit-dealer-${Date.now()}.png`;
    const dealerBuffer = Buffer.from(dealerSignature.split(",")[1], "base64");
    await uploadToR2(dealerKey, dealerBuffer, "image/png");
    signatureUpdate.dealerSignatureImageKey = dealerKey;

    // Upload customer signature if provided
    if (customerSignature && customerName) {
      const customerKey = `signatures/${deal.dealerId}/${deal._id}/deposit-customer-${Date.now()}.png`;
      const customerBuffer = Buffer.from(customerSignature.split(",")[1], "base64");
      await uploadToR2(customerKey, customerBuffer, "image/png");
      signatureUpdate.customerSignedAt = now;
      signatureUpdate.customerSignerName = customerName;
      signatureUpdate.customerSignatureImageKey = customerKey;
    }

    // Generate signed URLs for signature images (90 days expiry)
    const dealerSignatureUrl = await getSignedGetUrl(dealerKey, 7 * 24 * 60 * 60);
    let customerSignatureUrl = null;
    if (signatureUpdate.customerSignatureImageKey) {
      customerSignatureUrl = await getSignedGetUrl(signatureUpdate.customerSignatureImageKey, 7 * 24 * 60 * 60);
    }

    // Update the deposit receipt document with signature info including URLs
    await SalesDocument.findByIdAndUpdate(depositReceipt._id, {
      $set: {
        "snapshotData.signature": {
          customerSignedAt: signatureUpdate.customerSignedAt || depositReceipt.snapshotData?.signature?.customerSignedAt,
          customerSignerName: signatureUpdate.customerSignerName || depositReceipt.snapshotData?.signature?.customerSignerName,
          customerSignatureImageUrl: customerSignatureUrl || depositReceipt.snapshotData?.signature?.customerSignatureImageUrl,
          dealerSignedAt: signatureUpdate.dealerSignedAt,
          dealerSignerName: signatureUpdate.dealerSignerName,
          dealerSignatureImageUrl: dealerSignatureUrl,
        },
      },
    });

    // Also store deposit receipt signature reference in deal for easy lookup
    await Deal.findByIdAndUpdate(deal._id, {
      $set: {
        "depositSignature.customerSignedAt": signatureUpdate.customerSignedAt || deal.depositSignature?.customerSignedAt,
        "depositSignature.customerSignerName": signatureUpdate.customerSignerName || deal.depositSignature?.customerSignerName,
        "depositSignature.dealerSignedAt": signatureUpdate.dealerSignedAt,
        "depositSignature.dealerSignerName": signatureUpdate.dealerSignerName,
        "depositSignature.customerSignatureImageKey": signatureUpdate.customerSignatureImageKey,
        "depositSignature.dealerSignatureImageKey": signatureUpdate.dealerSignatureImageKey,
      },
    });

    res.status(200).json({
      success: true,
      message: "Deposit receipt signed successfully",
    });
  } catch (error) {
    console.error("[sign-deposit] Error:", error);
    res.status(500).json({ error: error.message || "Failed to save signatures" });
  }
}
