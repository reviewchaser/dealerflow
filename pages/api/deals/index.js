import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import Contact from "@/models/Contact";
import Dealer from "@/models/Dealer";
import PartExchange from "@/models/PartExchange";
import { withDealerContext } from "@/libs/authContext";

/**
 * Deals API
 * GET /api/deals - List deals with filtering
 * POST /api/deals - Create new deal
 *
 * Query params:
 * - status: Filter by status (or comma-separated list)
 * - vehicleId: Filter by vehicle
 * - vehicleVrm: Filter by vehicle registration (searches regCurrent field)
 * - customerId: Filter by customer (soldToContactId)
 * - salesPersonId: Filter by salesperson
 * - buyerType: CONSUMER|BUSINESS
 * - saleType: RETAIL|TRADE
 * - vatScheme: MARGIN|VAT_QUALIFYING|NO_VAT
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;

  if (req.method === "GET") {
    const {
      status,
      vehicleId,
      vehicleVrm,
      customerId,
      salesPersonId,
      buyerType,
      saleType,
      vatScheme,
    } = req.query;

    let query = { dealerId };

    // Filter by status (supports comma-separated list)
    if (status && status !== "all") {
      const statuses = status.split(",");
      if (statuses.length === 1) {
        query.status = status;
      } else {
        query.status = { $in: statuses };
      }
    }

    if (vehicleId) query.vehicleId = vehicleId;
    if (customerId) query.soldToContactId = customerId;
    if (salesPersonId) query.salesPersonId = salesPersonId;
    if (buyerType) query.buyerType = buyerType;
    if (saleType) query.saleType = saleType;
    if (vatScheme) query.vatScheme = vatScheme;

    // Filter by vehicle VRM - find matching vehicles first, then filter deals
    if (vehicleVrm) {
      const cleanVrm = vehicleVrm.replace(/\s/g, "").toUpperCase();
      const matchingVehicles = await Vehicle.find({
        dealerId,
        regCurrent: { $regex: cleanVrm, $options: "i" }
      }).select("_id").lean();

      if (matchingVehicles.length > 0) {
        query.vehicleId = { $in: matchingVehicles.map(v => v._id) };
      } else {
        // No matching vehicles, return empty results
        return res.status(200).json({ deals: [] });
      }
    }

    const deals = await Deal.find(query)
      .populate("vehicleId", "regCurrent make model year primaryImageUrl status salesStatus stockNumber purchase")
      .populate("soldToContactId", "displayName email phone companyName")
      .populate("invoiceToContactId", "displayName companyName")
      .populate("salesPersonId", "name email")
      .populate("partExchangeId")
      .sort({ createdAt: -1 })
      .lean();

    // Transform and add computed fields
    const transformed = deals.map(d => ({
      ...d,
      id: d._id.toString(),
      vehicle: d.vehicleId ? {
        id: d.vehicleId._id?.toString(),
        regCurrent: d.vehicleId.regCurrent,
        make: d.vehicleId.make,
        model: d.vehicleId.model,
        year: d.vehicleId.year,
        primaryImageUrl: d.vehicleId.primaryImageUrl,
        status: d.vehicleId.status,
        salesStatus: d.vehicleId.salesStatus,
        stockNumber: d.vehicleId.stockNumber,
        purchase: d.vehicleId.purchase,
      } : null,
      customer: d.soldToContactId ? {
        id: d.soldToContactId._id?.toString(),
        displayName: d.soldToContactId.displayName,
        email: d.soldToContactId.email,
        phone: d.soldToContactId.phone,
        companyName: d.soldToContactId.companyName,
      } : null,
      invoiceTo: d.invoiceToContactId ? {
        id: d.invoiceToContactId._id?.toString(),
        displayName: d.invoiceToContactId.displayName,
        companyName: d.invoiceToContactId.companyName,
      } : null,
      salesPerson: d.salesPersonId ? {
        id: d.salesPersonId._id?.toString(),
        name: d.salesPersonId.name,
        email: d.salesPersonId.email,
      } : null,
      partExchange: d.partExchangeId || null,
      // Computed: true if PX has unsettled finance (needs action)
      pxFinanceUnsettled: d.partExchangeId?.hasFinance && !d.partExchangeId?.financeSettled,
      // Clean up populated refs
      vehicleId: d.vehicleId?._id?.toString(),
      soldToContactId: d.soldToContactId?._id?.toString(),
      invoiceToContactId: d.invoiceToContactId?._id?.toString(),
      salesPersonId: d.salesPersonId?._id?.toString(),
      partExchangeId: d.partExchangeId?._id?.toString(),
      _id: undefined,
      __v: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === "POST") {
    const {
      vehicleId,
      soldToContactId,
      invoiceToContactId,
      buyerType,
      buyerUse,
      saleChannel,
      saleType,
      vatScheme,
      vehiclePriceNet,
      vehicleVatAmount,
      vehiclePriceGross,
      notes,
      internalNotes,
      warrantyMonths,
      deliveryAddress,
      // Fields from SaleWizard that were previously missing
      addOns,
      warranty,
      financeSelection,
      requests,
      paymentType,
      delivery,
      partExchanges,
    } = req.body;

    // Validate required fields
    if (!vehicleId) {
      return res.status(400).json({ error: "Vehicle is required" });
    }

    // Verify vehicle exists and belongs to dealer
    const vehicle = await Vehicle.findOne({ _id: vehicleId, dealerId });
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Validate vehicle has complete purchase info before allowing sale
    if (!vehicle.purchase?.purchasePriceNet && vehicle.purchase?.purchasePriceNet !== 0) {
      return res.status(400).json({
        error: "Vehicle purchase price (SIV) is required before creating a sale",
        code: "MISSING_SIV",
      });
    }
    if (!vehicle.vatScheme) {
      return res.status(400).json({
        error: "Vehicle VAT scheme is required before creating a sale",
        code: "MISSING_VAT_SCHEME",
      });
    }
    if (!vehicle.purchase?.purchasedFromContactId) {
      return res.status(400).json({
        error: "Vehicle supplier/seller is required before creating a sale",
        code: "MISSING_SELLER",
      });
    }

    // Check vehicle isn't already in a deal
    if (vehicle.salesStatus === "IN_DEAL" || vehicle.salesStatus === "SOLD_IN_PROGRESS") {
      const existingDeal = await Deal.findOne({
        vehicleId,
        dealerId,
        status: { $nin: ["COMPLETED", "CANCELLED"] },
      });
      if (existingDeal) {
        return res.status(400).json({
          error: "Vehicle is already in an active deal",
          existingDealId: existingDeal._id.toString(),
        });
      }
    }

    // Get next deal number atomically
    const dealer = await Dealer.findByIdAndUpdate(
      dealerId,
      { $inc: { "salesSettings.nextDealNumber": 1 } },
      { new: false }
    );

    const prefix = dealer?.salesSettings?.dealNumberPrefix || "D";
    const dealNumber = dealer?.salesSettings?.nextDealNumber || 1;

    // Determine VAT scheme (use vehicle's if not specified)
    const scheme = vatScheme || vehicle.vatScheme || "MARGIN";

    // Calculate pricing if not fully provided
    let priceNet = vehiclePriceNet;
    let priceVat = vehicleVatAmount;
    let priceGross = vehiclePriceGross;

    if (scheme === "VAT_QUALIFYING" && priceGross && !priceNet) {
      // Calculate net from gross
      const vatRate = dealer?.salesSettings?.vatRate || 0.2;
      priceNet = priceGross / (1 + vatRate);
      priceVat = priceGross - priceNet;
    } else if (scheme === "VAT_QUALIFYING" && priceNet && !priceGross) {
      // Calculate gross from net
      const vatRate = dealer?.salesSettings?.vatRate || 0.2;
      priceVat = priceNet * vatRate;
      priceGross = priceNet + priceVat;
    }

    // Use warranty from request body if provided, otherwise apply default
    let dealAddOns = addOns || [];
    let dealWarranty = warranty || null;  // Use warranty from request
    const dw = dealer?.salesSettings?.defaultWarranty;
    // Only apply default warranty if NO warranty was explicitly provided and no addOns
    if (!warranty && dw?.enabled && (!addOns || addOns.length === 0)) {
      const priceForWarranty = dw.type === "PAID" ? (dw.priceGross || dw.priceNet || 0) : 0;
      const warrantyAddOn = {
        // No addOnProductId - this is a dealer default warranty, not a product
        name: dw.name || "Standard Warranty",
        qty: 1,
        unitPriceNet: priceForWarranty, // Warranties are VAT exempt, so net = gross
        vatTreatment: "NO_VAT", // Warranties are typically VAT exempt
        vatRate: 0,
        category: "WARRANTY",
        isCustom: true,
        isDefaultWarranty: true,
        durationMonths: dw.durationMonths || 3,
      };
      dealAddOns = [warrantyAddOn];
      dealWarranty = {
        included: true,
        name: dw.name || "Standard Warranty",
        durationMonths: dw.durationMonths || 3,
        claimLimit: dw.claimLimit || null,
        priceGross: priceForWarranty,
        isDefault: true,
      };
    }

    // Create the deal
    const deal = await Deal.create({
      dealerId,
      vehicleId,
      dealNumber,
      status: "DRAFT",
      soldToContactId,
      invoiceToContactId,
      buyerType: buyerType || "CONSUMER",
      buyerUse: buyerUse || "PERSONAL",
      saleChannel: saleChannel || "IN_PERSON",
      saleType: saleType || "RETAIL",
      vatScheme: scheme,
      vatRate: dealer?.salesSettings?.vatRate || 0.2,
      vehiclePriceNet: priceNet,
      vehicleVatAmount: priceVat,
      vehiclePriceGross: priceGross,
      notes,
      internalNotes,
      warrantyMonths: warrantyMonths ?? dealer?.salesSettings?.defaultWarrantyMonths ?? 3,
      deliveryAddress,
      salesPersonId: userId,
      createdByUserId: userId,
      // Fields from SaleWizard
      addOns: dealAddOns,
      warranty: dealWarranty,
      financeSelection: financeSelection || {},
      requests: requests || [],
      paymentType: paymentType || "CASH",
      delivery: delivery || {},
      partExchanges: partExchanges || [],
    });

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(vehicleId, {
      salesStatus: "IN_DEAL",
    });

    // Re-fetch with populated fields
    const populatedDeal = await Deal.findById(deal._id)
      .populate("vehicleId", "regCurrent make model year primaryImageUrl")
      .populate("soldToContactId", "displayName email phone")
      .lean();

    return res.status(201).json({
      ...populatedDeal,
      id: populatedDeal._id.toString(),
      dealRef: `${prefix}${String(dealNumber).padStart(5, "0")}`,
      _id: undefined,
      __v: undefined,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
