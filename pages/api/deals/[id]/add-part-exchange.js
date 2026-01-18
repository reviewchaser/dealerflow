import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import PartExchange from "@/models/PartExchange";
import { withDealerContext } from "@/libs/authContext";

/**
 * Add Part Exchange to Deal API
 * POST /api/deals/[id]/add-part-exchange
 *
 * Creates a PartExchange record and links it to the deal.
 * Body: { vrm, make, model, year, mileage, colour, allowance, settlement,
 *         vatQualifying, hasFinance, financeCompanyContactId, hasSettlementInWriting }
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

  // Validate deal can have PX added
  if (deal.status === "CANCELLED" || deal.status === "COMPLETED") {
    return res.status(400).json({ error: "Cannot add part exchange to a completed or cancelled deal" });
  }

  const {
    vrm,
    vin,
    make,
    model,
    derivative,
    year,
    mileage,
    colour,
    fuelType,
    transmission,
    allowance,
    settlement,
    conditionSummary,
    notes,
    sourceType,
    sourceId,
    // Finance & VAT fields
    vatQualifying,
    hasFinance,
    financeCompanyContactId,
    hasSettlementInWriting,
  } = req.body;

  // Validate required fields
  if (!vrm) {
    return res.status(400).json({ error: "VRM is required" });
  }

  // Check for duplicate VRM in existing part exchanges
  const normalizedVrm = vrm.toUpperCase().replace(/\s/g, "");
  const existingPxWithSameVrm = (deal.partExchanges || []).find(
    px => px.vrm?.toUpperCase().replace(/\s/g, "") === normalizedVrm
  );
  if (existingPxWithSameVrm) {
    return res.status(400).json({
      error: "This vehicle is already added as a part exchange on this deal",
      field: "vrm",
    });
  }

  if (allowance === undefined || allowance === null) {
    return res.status(400).json({ error: "Allowance is required" });
  }

  // If has finance, finance company is required
  if (hasFinance && !financeCompanyContactId) {
    return res.status(400).json({
      error: "Finance company is required when part exchange has outstanding finance",
      field: "financeCompanyContactId"
    });
  }

  // Create the part exchange record
  const partExchange = await PartExchange.create({
    dealerId,
    sourceType: sourceType || "MANUAL",
    sourceId: sourceId || undefined,
    vrm: vrm.toUpperCase().replace(/\s/g, ""),
    vin: vin || undefined,
    make,
    model,
    derivative,
    year,
    mileage,
    colour,
    fuelType,
    transmission,
    allowance,
    settlement: settlement || 0,
    conditionSummary,
    notes,
    // Finance & VAT fields
    vatQualifying: vatQualifying || false,
    hasFinance: hasFinance || false,
    financeCompanyContactId: hasFinance ? financeCompanyContactId : undefined,
    hasSettlementInWriting: hasSettlementInWriting || false,
    financeSettled: false, // Not settled on creation
    createdByUserId: userId,
  });

  // Update the deal with the part exchange
  deal.partExchangeId = partExchange._id;
  deal.partExchangeAllowance = allowance;
  deal.partExchangeSettlement = settlement || 0;
  deal.updatedByUserId = userId;
  await deal.save();

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    partExchange: {
      id: partExchange._id.toString(),
      vrm: partExchange.vrm,
      vin: partExchange.vin,
      make: partExchange.make,
      model: partExchange.model,
      year: partExchange.year,
      allowance: partExchange.allowance,
      settlement: partExchange.settlement,
      netValue: partExchange.allowance - (partExchange.settlement || 0),
      vatQualifying: partExchange.vatQualifying,
      hasFinance: partExchange.hasFinance,
      financeCompanyContactId: partExchange.financeCompanyContactId?.toString(),
      hasSettlementInWriting: partExchange.hasSettlementInWriting,
      financeSettled: partExchange.financeSettled,
    },
  });
}

export default withDealerContext(handler);
