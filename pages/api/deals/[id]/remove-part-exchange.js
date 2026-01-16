import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import { withDealerContext } from "@/libs/authContext";

/**
 * POST /api/deals/[id]/remove-part-exchange
 * Remove a part exchange from a deal by index
 *
 * Body:
 * - index: number (0-based index in partExchanges array)
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;
  const { index } = req.body;

  if (typeof index !== "number" || index < 0) {
    return res.status(400).json({ error: "Invalid index" });
  }

  // Find deal
  const deal = await Deal.findOne({ _id: id, dealerId });

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Only allow removal in DRAFT or DEPOSIT_TAKEN status
  if (!["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status)) {
    return res.status(400).json({ error: "Cannot modify part exchanges after invoice generated" });
  }

  // Validate index
  if (!deal.partExchanges || index >= deal.partExchanges.length) {
    return res.status(400).json({ error: "Invalid part exchange index" });
  }

  // Remove the part exchange at the specified index
  deal.partExchanges.splice(index, 1);
  deal.updatedByUserId = userId;
  await deal.save();

  return res.status(200).json({
    success: true,
    partExchanges: deal.partExchanges,
  });
}

export default withDealerContext(handler);
