import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import Dealer from "@/models/Dealer";
import Contact from "@/models/Contact";
import SalesDocument from "@/models/SalesDocument";
import DocumentCounter from "@/models/DocumentCounter";
import crypto from "crypto";
import { withDealerContext } from "@/libs/authContext";
import { getSignedGetUrl } from "@/libs/r2Client";

/**
 * Generate Invoice API
 * POST /api/deals/[id]/generate-invoice
 *
 * Generates an invoice for a deal and transitions status to INVOICED.
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

  // Get the deal with all related data
  const deal = await Deal.findOne({ _id: id, dealerId })
    .populate("vehicleId")
    .populate("soldToContactId")
    .populate("invoiceToContactId")
    .populate("partExchangeId");

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Validate deal can be invoiced
  if (deal.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot invoice a cancelled deal" });
  }
  if (deal.status === "COMPLETED") {
    return res.status(400).json({ error: "Deal is already completed" });
  }
  if (deal.status === "INVOICED" || deal.status === "DELIVERED") {
    // Check if invoice already exists
    const existingInvoice = await SalesDocument.findOne({
      dealId: deal._id,
      type: "INVOICE",
      status: { $ne: "VOID" },
    });
    if (existingInvoice) {
      return res.status(400).json({
        error: "Invoice already exists",
        invoiceId: existingInvoice._id.toString(),
        documentNumber: existingInvoice.documentNumber,
      });
    }
  }

  // Customer is required
  if (!deal.soldToContactId) {
    return res.status(400).json({ error: "Customer is required before generating invoice" });
  }

  // Vehicle price is required
  if (!deal.vehiclePriceGross && deal.vehiclePriceGross !== 0) {
    return res.status(400).json({ error: "Vehicle price is required before generating invoice" });
  }

  // Vehicle purchase details are required for HMRC stock book compliance
  const vehicle = deal.vehicleId;
  if (!vehicle.purchase?.purchasePriceNet && vehicle.purchase?.purchasePriceNet !== 0) {
    return res.status(400).json({
      error: "Stock Invoice Value (SIV) is required before generating invoice",
      field: "purchase.purchasePriceNet",
      hint: "Set the vehicle purchase price in the vehicle details"
    });
  }
  if (!vehicle.purchase?.purchaseDate) {
    return res.status(400).json({
      error: "Purchase date is required before generating invoice",
      field: "purchase.purchaseDate",
      hint: "Set the vehicle purchase date in the vehicle details"
    });
  }
  if (!vehicle.purchase?.purchasedFromContactId) {
    return res.status(400).json({
      error: "Supplier is required before generating invoice",
      field: "purchase.purchasedFromContactId",
      hint: "Set the supplier contact in the vehicle details"
    });
  }

  // Get dealer for settings
  const dealer = await Dealer.findById(dealerId);

  // Allocate document number atomically
  const defaultPrefix = dealer?.salesSettings?.invoiceNumberPrefix || "INV";
  const { documentNumber } = await DocumentCounter.allocateNumber(
    dealerId,
    "INVOICE",
    defaultPrefix
  );

  // Calculate totals (vehicle already declared above for validation)
  const customer = deal.soldToContactId;
  const invoiceTo = deal.invoiceToContactId;
  const px = deal.partExchangeId;

  // Get finance company name if PX has finance
  let pxFinanceCompanyName = null;
  if (px?.hasFinance && px?.financeCompanyContactId) {
    const financeCompany = await Contact.findById(px.financeCompanyContactId).select("displayName companyName").lean();
    pxFinanceCompanyName = financeCompany?.displayName || financeCompany?.companyName || null;
  }

  // Add-ons calculations
  const addOnsNetTotal = (deal.addOns || []).reduce((sum, a) => sum + (a.unitPriceNet * (a.qty || 1)), 0);
  const addOnsVatTotal = (deal.addOns || []).reduce((sum, a) => {
    if (a.vatTreatment === "STANDARD") {
      return sum + (a.unitPriceNet * (a.qty || 1) * (a.vatRate || 0.2));
    }
    return sum;
  }, 0);

  // Total payments - broken down by type
  const validPayments = (deal.payments || []).filter(p => !p.isRefunded);
  const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const depositPaid = validPayments
    .filter(p => p.type === "DEPOSIT")
    .reduce((sum, p) => sum + p.amount, 0);
  const otherPayments = validPayments
    .filter(p => p.type !== "DEPOSIT")
    .reduce((sum, p) => sum + p.amount, 0);

  // Finance advance (if customer is financing through a company)
  const financeAdvance = validPayments
    .filter(p => p.type === "FINANCE_ADVANCE")
    .reduce((sum, p) => sum + p.amount, 0);

  // Part exchange net value
  const pxNetValue = px ? (px.allowance || 0) - (px.settlement || 0) : 0;

  // Delivery amount
  const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amount || 0);

  // Calculate grand total based on VAT scheme
  let subtotal, totalVat, grandTotal;

  if (deal.vatScheme === "VAT_QUALIFYING") {
    subtotal = (deal.vehiclePriceNet || 0) + addOnsNetTotal;
    totalVat = (deal.vehicleVatAmount || 0) + addOnsVatTotal;
    grandTotal = subtotal + totalVat + deliveryAmount;
  } else {
    // Margin scheme - no VAT breakdown
    subtotal = (deal.vehiclePriceGross || 0) + addOnsNetTotal + addOnsVatTotal;
    totalVat = 0;
    grandTotal = subtotal + deliveryAmount;
  }

  const balanceDue = grandTotal - totalPaid - pxNetValue;

  // Get fresh signed URL for logo (90 days expiry to match document share links)
  let logoUrl = dealer.logoUrl;
  if (dealer.logoKey) {
    try {
      logoUrl = await getSignedGetUrl(dealer.logoKey, 90 * 24 * 60 * 60); // 90 days
    } catch (logoError) {
      console.warn("[generate-invoice] Failed to generate logo URL:", logoError.message);
      // Fall back to stored logoUrl
    }
  }

  // Build snapshot data
  const snapshotData = {
    vehicle: {
      regCurrent: vehicle.regCurrent,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      derivative: vehicle.derivative,
      year: vehicle.year,
      mileage: vehicle.mileageCurrent,
      colour: vehicle.colour,
    },
    customer: {
      name: customer.displayName,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
    invoiceTo: invoiceTo ? {
      name: invoiceTo.displayName,
      companyName: invoiceTo.companyName,
      email: invoiceTo.email,
      address: invoiceTo.address,
    } : null,
    // Deliver To: customer if invoiced to finance company, or delivery address if specified
    deliverTo: invoiceTo ? {
      name: customer.displayName,
      companyName: customer.companyName,
      phone: customer.phone,
      address: deal.deliveryAddress?.isDifferent ? deal.deliveryAddress : customer.address,
    } : (deal.deliveryAddress?.isDifferent ? {
      name: customer.displayName,
      companyName: customer.companyName,
      phone: customer.phone,
      address: deal.deliveryAddress,
    } : null),
    vatScheme: deal.vatScheme,
    saleType: deal.saleType, // RETAIL, TRADE, or EXPORT
    isVatRegistered: dealer?.salesSettings?.vatRegistered !== false,
    vehiclePriceNet: deal.vehiclePriceNet,
    vehicleVatAmount: deal.vehicleVatAmount,
    vehiclePriceGross: deal.vehiclePriceGross,
    addOns: (deal.addOns || []).map(a => ({
      name: a.name,
      qty: a.qty || 1,
      unitPriceNet: a.unitPriceNet,
      vatTreatment: a.vatTreatment,
      vatRate: a.vatRate,
    })),
    addOnsNetTotal,
    addOnsVatTotal,
    partExchange: px ? {
      vrm: px.vrm,
      make: px.make,
      model: px.model,
      allowance: px.allowance,
      settlement: px.settlement,
      // Finance & VAT fields
      vatQualifying: px.vatQualifying,
      hasFinance: px.hasFinance,
      financeCompanyName: pxFinanceCompanyName,
      hasSettlementInWriting: px.hasSettlementInWriting,
      financeSettled: px.financeSettled,
    } : null,
    payments: (deal.payments || []).map(p => ({
      type: p.type,
      amount: p.amount,
      method: p.method,
      paidAt: p.paidAt,
      reference: p.reference,
    })),
    // Delivery
    delivery: deal.delivery ? {
      amount: deal.delivery.amount,
      isFree: deal.delivery.isFree,
      notes: deal.delivery.notes,
    } : null,
    // Totals
    subtotal,
    totalVat,
    grandTotal,
    // Payment breakdown for invoice display
    totalPaid,
    depositPaid,
    otherPayments,
    financeAdvance,
    partExchangeNet: pxNetValue,
    balanceDue,
    termsText: deal.termsSnapshotText || getTermsText(deal, dealer),
    dealer: {
      name: dealer.name,
      companyName: dealer.companyName,
      address: dealer.companyAddress,
      phone: dealer.companyPhone,
      email: dealer.companyEmail,
      vatNumber: dealer.salesSettings?.vatNumber,
      companyNumber: dealer.salesSettings?.companyNumber,
      logoUrl: logoUrl,
    },
    bankDetails: dealer.salesSettings?.bankDetails || {},
    // Include agreed work items (requests)
    requests: (deal.requests || []).map(req => ({
      title: req.title,
      details: req.details,
      type: req.type,
      status: req.status,
    })),
  };

  // Generate share token
  const shareToken = crypto.randomBytes(32).toString("base64url");
  const shareTokenHash = crypto.createHash("sha256").update(shareToken).digest("hex");

  // Create invoice document
  const invoice = await SalesDocument.create({
    dealerId,
    dealId: deal._id,
    type: "INVOICE",
    documentNumber,
    status: "ISSUED",
    issuedAt: new Date(),
    snapshotData,
    shareToken,
    shareTokenHash,
    shareExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    createdByUserId: userId,
  });

  // Update deal
  deal.status = "INVOICED";
  deal.invoicedAt = new Date();
  deal.updatedByUserId = userId;
  await deal.save();

  // Update vehicle status
  await Vehicle.findByIdAndUpdate(deal.vehicleId._id, {
    salesStatus: "SOLD_IN_PROGRESS",
  });

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    dealStatus: deal.status,
    invoiceId: invoice._id.toString(),
    documentNumber,
    shareToken,
    shareUrl: `${process.env.NEXTAUTH_URL || ""}/public/invoice/${shareToken}`,
    grandTotal,
    balanceDue,
  });
}

/**
 * Get appropriate terms text based on buyer type and sale channel
 */
function getTermsText(deal, dealer) {
  const terms = dealer?.salesSettings?.terms || {};
  const key = `${deal.buyerType?.toLowerCase() || "consumer"}${deal.saleChannel === "DISTANCE" ? "Distance" : "InPerson"}`;
  return terms[key] || terms.consumerInPerson || "";
}

export default withDealerContext(handler);
