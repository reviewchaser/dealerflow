import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import { withDealerContext } from "@/libs/authContext";

/**
 * Update Warranty API
 * POST /api/deals/[id]/update-warranty
 *
 * Updates the warranty details for a deal.
 * Only allowed when deal status is DEPOSIT_TAKEN (not yet invoiced).
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid deal ID" });
  }

  // Get the deal
  const deal = await Deal.findOne({ _id: id, dealerId });
  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Only allow editing in DEPOSIT_TAKEN status (before invoicing)
  if (deal.status !== "DEPOSIT_TAKEN") {
    return res.status(400).json({
      error: "Warranty can only be edited before invoicing",
      currentStatus: deal.status,
    });
  }

  // Extract warranty fields from request
  const { name, durationMonths, claimLimit, priceGross } = req.body;

  // Validate that we have a warranty to edit
  if (!deal.warranty?.included) {
    return res.status(400).json({ error: "No warranty to edit on this deal" });
  }

  // Update warranty fields
  deal.warranty = {
    ...deal.warranty,
    name: name || deal.warranty.name,
    durationMonths: durationMonths !== null ? durationMonths : deal.warranty.durationMonths,
    claimLimit: claimLimit !== null ? claimLimit : deal.warranty.claimLimit,
    priceGross: priceGross !== undefined ? priceGross : deal.warranty.priceGross,
    // Keep these fields unchanged
    included: true,
    isDefault: deal.warranty.isDefault,
    addOnProductId: deal.warranty.addOnProductId,
  };

  deal.updatedByUserId = userId;
  await deal.save();

  return res.status(200).json({
    success: true,
    warranty: deal.warranty,
  });
}

export default withDealerContext(handler);
