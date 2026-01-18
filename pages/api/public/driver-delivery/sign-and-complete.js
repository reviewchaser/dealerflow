import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import SalesDocument from "@/models/SalesDocument";
import crypto from "crypto";
import { uploadToR2 } from "@/libs/r2Client";

/**
 * POST /api/public/driver-delivery/sign-and-complete
 * Combined endpoint for driver to:
 * 1. Verify PIN (if required)
 * 2. Capture customer signature
 * 3. Mark deal as DELIVERED
 *
 * Body:
 * - dealId: The deal ID
 * - pin: 4-digit PIN (if required)
 * - customerName: Name of person signing
 * - customerSignature: Base64 data URL of signature
 * - deliveryMileage: Mileage at delivery (optional)
 * - deliveryNotes: Any notes about the delivery (optional)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      dealId,
      pin,
      customerName,
      customerSignature,
      deliveryMileage,
      deliveryNotes,
    } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: "Deal ID is required" });
    }

    if (!customerName || !customerSignature) {
      return res.status(400).json({ error: "Customer name and signature are required" });
    }

    await connectMongo();

    // Find the deal
    const deal = await Deal.findById(dealId)
      .populate("vehicleId")
      .populate("soldToContactId");

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    // Check deal status
    if (!["INVOICED", "DELIVERED"].includes(deal.status)) {
      return res.status(400).json({ error: "Deal is not in a deliverable state" });
    }

    // Check driver link is valid
    if (!deal.signature?.driverLinkToken || !deal.signature?.driverLinkExpiresAt) {
      return res.status(400).json({ error: "No active driver link for this deal" });
    }

    if (new Date(deal.signature.driverLinkExpiresAt) < new Date()) {
      return res.status(400).json({ error: "Driver link has expired" });
    }

    // Verify PIN if required
    if (deal.signature?.driverLinkPinHash) {
      if (!pin) {
        return res.status(400).json({ error: "PIN is required for this delivery", requiresPin: true });
      }
      const pinHash = crypto.createHash("sha256").update(pin).digest("hex");
      if (pinHash !== deal.signature.driverLinkPinHash) {
        return res.status(400).json({ error: "Incorrect PIN" });
      }
    }

    // Upload customer signature to R2
    let customerSignatureKey = null;
    if (customerSignature && customerSignature.startsWith("data:")) {
      try {
        const base64Data = customerSignature.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const key = `dealers/${deal.dealerId}/deals/${deal._id}/signatures/customer_delivery_${Date.now()}.png`;
        await uploadToR2(key, buffer, "image/png");
        customerSignatureKey = key;
      } catch (uploadError) {
        console.error("[sign-and-complete] Signature upload failed:", uploadError);
        // Continue without signature upload - not critical
      }
    }

    // Update deal
    const now = new Date();
    deal.status = "DELIVERED";
    deal.deliveredAt = now;

    // Update signature fields
    if (!deal.signature) deal.signature = {};
    deal.signature.customerSignedAt = now;
    deal.signature.customerSignerName = customerName;
    if (customerSignatureKey) {
      deal.signature.customerSignatureImageKey = customerSignatureKey;
    }
    deal.signature.signedViaDriverLink = true;

    // Clear driver link after use
    deal.signature.driverLinkToken = null;
    deal.signature.driverLinkTokenHash = null;
    deal.signature.driverLinkExpiresAt = null;
    deal.signature.driverLinkPinHash = null;

    // Update delivery info
    if (deliveryMileage) {
      if (!deal.delivery) deal.delivery = {};
      deal.delivery.deliveryMileage = parseInt(deliveryMileage);
    }
    if (deliveryNotes) {
      if (!deal.delivery) deal.delivery = {};
      deal.delivery.notes = deliveryNotes;
    }

    await deal.save();

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(deal.vehicleId._id, {
      status: "delivered",
      salesStatus: "DELIVERED",
    });

    // Update invoice snapshot with signature info
    const invoice = await SalesDocument.findOne({
      dealId: deal._id,
      documentType: "INVOICE",
    });

    if (invoice) {
      invoice.snapshotData.signature = {
        customerSignedAt: now.toISOString(),
        customerSignerName: customerName,
        signedViaDriverLink: true,
      };
      await invoice.save();
    }

    return res.status(200).json({
      success: true,
      message: "Delivery completed successfully",
      deliveredAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[sign-and-complete] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to complete delivery" });
  }
}
