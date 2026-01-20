import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import { withDealerContext } from "@/libs/authContext";

/**
 * POST /api/deals/[id]/update-warranty
 * Update warranty details on a deal
 *
 * Body:
 * - name: string
 * - description: string
 * - durationMonths: number
 * - claimLimit: number (null for unlimited)
 * - priceGross: number
 * - priceNet: number
 * - vatTreatment: string
 * - vatAmount: number
 * - type: string (DEFAULT, TRADE, THIRD_PARTY)
 * - tradeTermsText: string (for TRADE type)
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;
  const {
    name,
    description,
    durationMonths,
    claimLimit,
    priceGross,
    priceNet,
    vatTreatment,
    vatAmount,
    type,
    tradeTermsText,
  } = req.body;

  // Find deal
  const deal = await Deal.findOne({ _id: id, dealerId });

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Only allow updates in DRAFT or DEPOSIT_TAKEN status
  if (!["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status)) {
    return res.status(400).json({ error: "Cannot modify warranty after invoice generated" });
  }

  // Build warranty update
  const warranty = deal.warranty || {};

  if (name !== undefined) warranty.name = name;
  if (description !== undefined) warranty.description = description;
  if (durationMonths !== undefined) warranty.durationMonths = durationMonths;
  if (claimLimit !== undefined) warranty.claimLimit = claimLimit;
  if (priceGross !== undefined) {
    warranty.priceGross = priceGross;
    // Default priceNet to priceGross if not specified (for VAT exempt warranties)
    if (priceNet === undefined) {
      warranty.priceNet = priceGross;
    }
  }
  if (priceNet !== undefined) warranty.priceNet = priceNet;
  if (vatTreatment !== undefined) warranty.vatTreatment = vatTreatment;
  if (vatAmount !== undefined) warranty.vatAmount = vatAmount;
  if (type !== undefined) warranty.type = type;
  if (tradeTermsText !== undefined) warranty.tradeTermsText = tradeTermsText;

  // Keep included flag consistent with type
  if (type === "TRADE") {
    warranty.included = false;
  } else if (name || durationMonths) {
    warranty.included = true;
  }

  deal.warranty = warranty;
  deal.updatedByUserId = userId;
  await deal.save();

  return res.status(200).json({
    success: true,
    warranty: deal.warranty,
  });
}

export default withDealerContext(handler);
