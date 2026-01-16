import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import SalesDocument from "@/models/SalesDocument";
import { uploadToR2 } from "@/libs/r2Client";
import crypto from "crypto";

/**
 * GET /api/delivery-signing/[token]
 * Get deal info for driver signing page
 *
 * POST /api/delivery-signing/[token]
 * Submit customer signature and delivery confirmation
 */
export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  await connectMongo();

  // Hash the token to find the deal
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find deal by token hash
  const deal = await Deal.findOne({
    "signature.driverLinkTokenHash": tokenHash,
  }).populate("soldToContactId", "name phone email");

  if (!deal) {
    return res.status(404).json({ error: "Invalid or expired link" });
  }

  // Check token hasn't expired
  if (deal.signature?.driverLinkExpiresAt && new Date() > new Date(deal.signature.driverLinkExpiresAt)) {
    return res.status(410).json({ error: "This link has expired" });
  }

  if (req.method === "GET") {
    // Get invoice document for snapshot
    const invoice = await SalesDocument.findOne({
      dealId: deal._id,
      type: "INVOICE",
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Return deal info for display
    return res.status(200).json({
      dealNumber: deal.dealNumber,
      vehicle: {
        vrm: invoice.snapshotData?.vehicle?.regCurrent || "—",
        make: invoice.snapshotData?.vehicle?.make || "—",
        model: invoice.snapshotData?.vehicle?.model || "—",
        colour: invoice.snapshotData?.vehicle?.colour,
      },
      customer: {
        name: deal.soldToContactId?.name || invoice.snapshotData?.customer?.name || "—",
        phone: deal.soldToContactId?.phone,
      },
      total: invoice.snapshotData?.grandTotal || deal.grandTotal,
      balanceDue: invoice.snapshotData?.balanceDue ?? deal.balanceDue,
      deliveryAddress: deal.deliveryAddress?.isDifferent ? {
        line1: deal.deliveryAddress.line1,
        line2: deal.deliveryAddress.line2,
        town: deal.deliveryAddress.town,
        county: deal.deliveryAddress.county,
        postcode: deal.deliveryAddress.postcode,
      } : null,
      status: deal.status,
      alreadySigned: !!deal.signature?.customerSignedAt,
      dealerPreSigned: !!deal.signature?.dealerSignedAt,
      requiresPin: !!deal.signature?.driverLinkPinHash,
    });
  }

  if (req.method === "POST") {
    const { customerSignature, customerName, deliveryMileage, deliveryNotes, pin } = req.body;

    // Validate PIN if required
    if (deal.signature?.driverLinkPinHash) {
      if (!pin) {
        return res.status(400).json({ error: "PIN is required" });
      }
      const submittedPinHash = crypto.createHash("sha256").update(pin).digest("hex");
      if (submittedPinHash !== deal.signature.driverLinkPinHash) {
        return res.status(401).json({ error: "Incorrect PIN" });
      }
    }

    // Validate required fields
    if (!customerSignature || !customerName) {
      return res.status(400).json({ error: "Customer signature and name are required" });
    }

    const now = new Date();
    const updates = {
      status: "DELIVERED",
      deliveredAt: now,
      "signature.customerSignedAt": now,
      "signature.customerSignerName": customerName,
    };

    if (deliveryMileage) {
      updates.deliveryMileage = parseInt(deliveryMileage, 10);
    }

    if (deliveryNotes) {
      updates.deliveryNotes = deliveryNotes;
    }

    // Upload customer signature to R2
    try {
      const customerKey = `signatures/${deal.dealerId}/${deal._id}/customer-delivery-${Date.now()}.png`;
      const customerBuffer = Buffer.from(customerSignature.split(",")[1], "base64");
      await uploadToR2(customerKey, customerBuffer, "image/png");
      updates["signature.customerSignatureImageKey"] = customerKey;
    } catch (uploadError) {
      console.error("[delivery-signing] Signature upload error:", uploadError);
      // Continue even if upload fails - we still have the signed timestamp
    }

    // Clear the driver link token (one-time use)
    updates["signature.driverLinkToken"] = null;
    updates["signature.driverLinkTokenHash"] = null;
    updates["signature.driverLinkExpiresAt"] = null;

    // Check if dealer pre-signed - if so, deal is fully signed
    const dealerPreSigned = !!deal.signature?.dealerSignedAt;
    const fullySigned = dealerPreSigned;

    // Check if balance is paid (or owed to customer)
    const invoice = await SalesDocument.findOne({
      dealId: deal._id,
      type: "INVOICE",
    });
    const balanceDue = invoice?.snapshotData?.balanceDue ?? 0;
    const balancePaid = balanceDue <= 0;

    // If fully signed and balance paid, mark as COMPLETED
    if (fullySigned && balancePaid) {
      updates.status = "COMPLETED";
      updates.completedAt = now;
    }

    // Update deal
    await Deal.findByIdAndUpdate(deal._id, { $set: updates });

    // Update invoice snapshot with signature info
    await SalesDocument.updateOne(
      {
        dealId: deal._id,
        type: "INVOICE",
      },
      {
        $set: {
          "snapshotData.signature.customerSignedAt": now,
          "snapshotData.signature.customerSignerName": customerName,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: fullySigned && balancePaid
        ? "Delivery confirmed - deal completed"
        : "Delivery confirmed and signature captured",
      dealStatus: fullySigned && balancePaid ? "COMPLETED" : "DELIVERED",
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
