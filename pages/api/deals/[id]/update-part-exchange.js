import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import { withDealerContext } from "@/libs/authContext";

/**
 * PUT /api/deals/[id]/update-part-exchange
 * Update a part exchange at a specific index
 *
 * Body:
 * - index: number (0-based index in partExchanges array)
 * - (all PX fields to update)
 */
async function handler(req, res, ctx) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;
  const { index, ...updates } = req.body;

  if (typeof index !== "number" || index < 0) {
    return res.status(400).json({ error: "Invalid index" });
  }

  // Find deal
  const deal = await Deal.findOne({ _id: id, dealerId });

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Only allow full updates in DRAFT or DEPOSIT_TAKEN status
  // But allow updating hasSettlementInWriting in later statuses too
  const isOnlySettlementUpdate = Object.keys(updates).length === 1 && updates.hasSettlementInWriting !== undefined;
  if (!["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && !isOnlySettlementUpdate) {
    return res.status(400).json({ error: "Cannot modify part exchanges after invoice generated (except settlement confirmation)" });
  }

  // Cannot update anything on COMPLETED or CANCELLED deals
  if (["COMPLETED", "CANCELLED"].includes(deal.status)) {
    return res.status(400).json({ error: "Cannot modify part exchanges on completed or cancelled deals" });
  }

  // Validate index
  if (!deal.partExchanges || index >= deal.partExchanges.length) {
    return res.status(400).json({ error: "Invalid part exchange index" });
  }

  // Check for duplicate VRM if VRM is being changed
  if (updates.vrm) {
    const normalizedVrm = updates.vrm.toUpperCase().replace(/\s/g, "");
    const existingPxWithSameVrm = deal.partExchanges.find(
      (px, i) => i !== index && px.vrm?.toUpperCase().replace(/\s/g, "") === normalizedVrm
    );
    if (existingPxWithSameVrm) {
      return res.status(400).json({
        error: "This vehicle is already added as a part exchange on this deal",
        field: "vrm",
      });
    }
  }

  // Update the part exchange at the specified index
  const existingPx = deal.partExchanges[index];
  deal.partExchanges[index] = {
    ...existingPx,
    vrm: updates.vrm !== undefined ? updates.vrm.toUpperCase().replace(/\s/g, "") : existingPx.vrm,
    vin: updates.vin !== undefined ? updates.vin : existingPx.vin,
    make: updates.make !== undefined ? updates.make : existingPx.make,
    model: updates.model !== undefined ? updates.model : existingPx.model,
    year: updates.year !== undefined ? updates.year : existingPx.year,
    mileage: updates.mileage !== undefined ? updates.mileage : existingPx.mileage,
    colour: updates.colour !== undefined ? updates.colour : existingPx.colour,
    fuelType: updates.fuelType !== undefined ? updates.fuelType : existingPx.fuelType,
    allowance: updates.allowance !== undefined ? parseFloat(updates.allowance) : existingPx.allowance,
    settlement: updates.settlement !== undefined ? parseFloat(updates.settlement) || 0 : existingPx.settlement,
    conditionNotes: updates.conditionNotes !== undefined ? updates.conditionNotes : existingPx.conditionNotes,
    vatQualifying: updates.vatQualifying !== undefined ? updates.vatQualifying : existingPx.vatQualifying,
    hasFinance: updates.hasFinance !== undefined ? updates.hasFinance : existingPx.hasFinance,
    financeCompanyContactId: updates.financeCompanyContactId !== undefined ? updates.financeCompanyContactId : existingPx.financeCompanyContactId,
    financeCompanyName: updates.financeCompanyName !== undefined ? updates.financeCompanyName : existingPx.financeCompanyName,
    hasSettlementInWriting: updates.hasSettlementInWriting !== undefined ? updates.hasSettlementInWriting : existingPx.hasSettlementInWriting,
  };

  deal.updatedByUserId = userId;
  await deal.save();

  return res.status(200).json({
    success: true,
    partExchange: deal.partExchanges[index],
    partExchanges: deal.partExchanges,
  });
}

export default withDealerContext(handler);
