import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import Dealer from "@/models/Dealer";
import Contact from "@/models/Contact";
import SalesDocument from "@/models/SalesDocument";
import PartExchange from "@/models/PartExchange";
import DocumentCounter from "@/models/DocumentCounter";
import FormSubmission from "@/models/FormSubmission";
import Form from "@/models/Form";
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

  // Extract confirmed values from request body
  const {
    paymentMethod,
    financeCompanyContactId: confirmedFinanceCompanyContactId,
    financeCompanyName: confirmedFinanceCompanyName,
    financeAdvance: confirmedFinanceAdvance,
    cancelFinance,
  } = req.body || {};

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

  // Note: Settlement in writing is now only required for mark-completed, not invoice generation
  // This allows invoices to be generated while finance settlement is still being processed

  // Check if deposit receipt exists and requires signature (in-person sales)
  const depositReceipt = await SalesDocument.findOne({
    dealId: deal._id,
    type: "DEPOSIT_RECEIPT",
    status: { $ne: "VOID" },
  });

  if (depositReceipt && deal.saleChannel !== "DISTANCE") {
    // In-person sales require both signatures on deposit receipt before invoice
    if (!deal.depositSignature?.customerSignedAt || !deal.depositSignature?.dealerSignedAt) {
      const missing = [];
      if (!deal.depositSignature?.customerSignedAt) missing.push("customer");
      if (!deal.depositSignature?.dealerSignedAt) missing.push("dealer");
      return res.status(400).json({
        error: `Deposit receipt must be signed by ${missing.join(" and ")} before generating invoice`,
        field: "depositSignature",
        hint: `Please have the ${missing.join(" and ")} sign the deposit receipt first`,
      });
    }
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
  let invoiceTo = deal.invoiceToContactId;
  const px = deal.partExchangeId;

  // Handle cancel finance - customer changed their mind about finance
  if (cancelFinance && deal.financeSelection?.isFinanced) {
    deal.financeSelection = {
      ...(deal.financeSelection || {}),
      isFinanced: false,
      financeCompanyContactId: null,
      financeCompanyName: null,
      advanceAmount: null,
      toBeConfirmed: false,
    };
  }

  // If a finance company contact was confirmed, update the deal
  if (confirmedFinanceCompanyContactId && deal.financeSelection?.isFinanced && !cancelFinance) {
    deal.financeSelection = {
      ...(deal.financeSelection || {}),
      financeCompanyContactId: confirmedFinanceCompanyContactId,
      financeCompanyName: confirmedFinanceCompanyName || deal.financeSelection?.financeCompanyName,
      toBeConfirmed: false,
    };
  }

  // If financing through a company, fetch finance company contact to use as invoiceTo
  let financeCompanyContact = null;
  const financeContactId = confirmedFinanceCompanyContactId || deal.financeSelection?.financeCompanyContactId;
  if (deal.financeSelection?.isFinanced && financeContactId && !cancelFinance) {
    financeCompanyContact = await Contact.findById(financeContactId).lean();
    if (financeCompanyContact && !invoiceTo) {
      // Use finance company as invoiceTo if not explicitly set otherwise
      invoiceTo = financeCompanyContact;
    }
  }

  // Get finance company name if PX has finance
  let pxFinanceCompanyName = null;
  if (px?.hasFinance && px?.financeCompanyContactId) {
    const financeCompany = await Contact.findById(px.financeCompanyContactId).select("displayName companyName").lean();
    pxFinanceCompanyName = financeCompany?.displayName || financeCompany?.companyName || null;
  }

  // If finance advance was confirmed, add it as a payment
  if (confirmedFinanceAdvance && confirmedFinanceAdvance > 0) {
    deal.payments.push({
      type: "FINANCE_ADVANCE",
      amount: confirmedFinanceAdvance,
      method: "FINANCE",
      paidAt: new Date(),
      reference: confirmedFinanceCompanyName || "Finance Advance",
      notes: confirmedFinanceCompanyName ? `Finance from ${confirmedFinanceCompanyName}` : null,
      isRefunded: false,
    });
    // Also update financeSelection on deal
    deal.financeSelection = {
      ...(deal.financeSelection || {}),
      isFinanced: true,
      financeCompanyName: confirmedFinanceCompanyName || deal.financeSelection?.financeCompanyName,
      advanceAmount: confirmedFinanceAdvance,
      toBeConfirmed: false, // No longer TBC
    };
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
    .filter(p => p.type !== "DEPOSIT" && p.type !== "FINANCE_ADVANCE")
    .reduce((sum, p) => sum + p.amount, 0);

  // Finance advance (if customer is financing through a company)
  const financeAdvance = validPayments
    .filter(p => p.type === "FINANCE_ADVANCE")
    .reduce((sum, p) => sum + p.amount, 0);

  // Part exchange net value - support both legacy single PX and new partExchanges[] array
  let pxNetValue = 0;

  // Legacy single PX (from deal.partExchangeId)
  if (px) {
    pxNetValue += (px.allowance || 0) - (px.settlement || 0);
  }

  // New partExchanges[] array
  if (deal.partExchanges && deal.partExchanges.length > 0) {
    for (const pxItem of deal.partExchanges) {
      pxNetValue += (pxItem.allowance || 0) - (pxItem.settlement || 0);
    }
  }

  // Delivery amount (use gross if available, otherwise amount)
  const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amountGross || deal.delivery?.amount || 0);

  // Calculate delivery credit if delivery was on deposit but removed/reduced before invoicing
  let deliveryCredit = 0;
  if (deal.delivery?.originalAmountOnDeposit > 0 && deliveryAmount === 0 && !deal.delivery?.isFree) {
    // Delivery was charged on deposit but removed before invoicing - issue credit
    deliveryCredit = deal.delivery.originalAmountOnDeposit;
  }

  // Calculate warranty amount if warranty has a cost
  const warrantyAmount = deal.warranty?.included && deal.warranty?.priceGross > 0 ? deal.warranty.priceGross : 0;

  // Calculate grand total based on VAT scheme
  let subtotal, totalVat, grandTotal;

  if (deal.vatScheme === "VAT_QUALIFYING") {
    subtotal = (deal.vehiclePriceNet || 0) + addOnsNetTotal;
    totalVat = (deal.vehicleVatAmount || 0) + addOnsVatTotal;
    grandTotal = subtotal + totalVat + deliveryAmount + warrantyAmount - deliveryCredit;
  } else {
    // Margin scheme - no VAT breakdown
    subtotal = (deal.vehiclePriceGross || 0) + addOnsNetTotal + addOnsVatTotal;
    totalVat = 0;
    grandTotal = subtotal + deliveryAmount + warrantyAmount - deliveryCredit;
  }

  const balanceDue = grandTotal - totalPaid - pxNetValue;

  // Get fresh signed URL for logo (7 days max for S3 signature v4)
  let logoUrl = dealer.logoUrl;
  if (dealer.logoKey) {
    try {
      logoUrl = await getSignedGetUrl(dealer.logoKey, 7 * 24 * 60 * 60); // 7 days max for S3 signature v4
    } catch (logoError) {
      console.warn("[generate-invoice] Failed to generate logo URL:", logoError.message);
      // Fall back to stored logoUrl
    }
  }

  // Check if vehicle has a service receipt
  let serviceReceiptInfo = null;
  if (vehicle.serviceReceiptSubmissionId) {
    const serviceReceipt = await FormSubmission.findById(vehicle.serviceReceiptSubmissionId)
      .populate("formId", "name")
      .lean();
    if (serviceReceipt) {
      serviceReceiptInfo = {
        present: true,
        completedAt: vehicle.serviceReceiptCompletedAt || serviceReceipt.createdAt,
      };
    }
  }
  // Also check by VRM match if no direct link
  if (!serviceReceiptInfo && vehicle.regCurrent) {
    const normalizedVrm = vehicle.regCurrent.toUpperCase().replace(/\s/g, "");
    const serviceReceiptForm = await Form.findOne({ dealerId, type: "SERVICE_RECEIPT" }).lean();
    if (serviceReceiptForm) {
      const serviceReceipt = await FormSubmission.findOne({
        formId: serviceReceiptForm._id,
        dealerId,
        $or: [
          { "rawAnswers.vrm": { $regex: new RegExp(`^${normalizedVrm}$`, "i") } },
          { "rawAnswers.vrm": { $regex: new RegExp(`^${normalizedVrm.replace(/(.{2,4})$/, " $1")}$`, "i") } },
        ],
        status: { $ne: "DELETED" },
      }).sort({ createdAt: -1 }).lean();
      if (serviceReceipt) {
        serviceReceiptInfo = {
          present: true,
          completedAt: serviceReceipt.createdAt,
        };
      }
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
      firstRegisteredDate: vehicle.firstRegisteredDate || null,
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
    // Warranty details with VAT breakdown
    warranty: deal.warranty?.included ? (() => {
      const priceGross = deal.warranty.priceGross || 0;
      const vatTreatment = deal.warranty.vatTreatment || "NO_VAT";
      const vatRate = dealer?.salesSettings?.vatRate || 0.2;
      // Calculate priceNet and vatAmount based on vatTreatment
      const priceNet = vatTreatment === "STANDARD" ? priceGross / (1 + vatRate) : priceGross;
      const vatAmount = vatTreatment === "STANDARD" ? priceGross - priceNet : 0;
      return {
        included: true,
        type: deal.warranty.type || "DEFAULT",
        warrantyProductId: deal.warranty.warrantyProductId || null,
        name: deal.warranty.name,
        description: deal.warranty.description || "",
        durationMonths: deal.warranty.durationMonths,
        claimLimit: deal.warranty.claimLimit,
        priceGross,
        priceNet: Math.round(priceNet * 100) / 100,
        vatTreatment,
        vatAmount: Math.round(vatAmount * 100) / 100,
        tradeTermsText: deal.warranty.tradeTermsText || "",
        isDefault: deal.warranty.isDefault,
      };
    })() : deal.warranty?.type === "TRADE" ? {
      included: false,
      type: "TRADE",
      tradeTermsText: deal.warranty.tradeTermsText || dealer?.salesSettings?.noWarrantyMessage || "Trade Terms - No warranty given or implied",
    } : null,
    // Message to show when no warranty included
    noWarrantyMessage: dealer?.salesSettings?.noWarrantyMessage || "Trade Terms - No warranty given or implied",
    addOns: (deal.addOns || []).map(a => ({
      name: a.name,
      description: a.description || null,
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
    // Multiple part exchanges array (new format)
    partExchanges: (deal.partExchanges && deal.partExchanges.length > 0)
      ? deal.partExchanges.map(px => ({
          vrm: px.vrm || null,
          make: px.make || null,
          model: px.model || null,
          year: px.year || null,
          colour: px.colour || null,
          fuelType: px.fuelType || null,
          mileage: px.mileage || null,
          motExpiry: px.motExpiry || null,
          dateOfRegistration: px.dateOfRegistration || null,
          allowance: px.allowance || 0,
          settlement: px.settlement || 0,
          vatQualifying: px.vatQualifying || false,
          hasFinance: px.hasFinance || false,
          financeCompanyName: px.financeCompanyName || null,
        }))
      : [],
    payments: (deal.payments || []).map(p => ({
      type: p.type,
      amount: p.amount,
      method: p.method,
      paidAt: p.paidAt,
      reference: p.reference,
    })),
    // Delivery - only include if meaningful data exists (free or chargeable)
    delivery: (deal.delivery && (
      deal.delivery.isFree === true ||
      parseFloat(deal.delivery.amountGross) > 0 ||
      parseFloat(deal.delivery.amount) > 0
    )) ? {
      amountNet: deal.delivery.amountNet || deal.delivery.amount || 0,
      vatAmount: deal.delivery.vatAmount || 0,
      amountGross: deal.delivery.amountGross || deal.delivery.amount || 0,
      isFree: deal.delivery.isFree || false,
      notes: deal.delivery.notes,
    } : null,
    // Delivery credit (if delivery was on deposit but removed before invoicing)
    deliveryCredit: deliveryCredit || null,
    // Totals
    subtotal,
    totalVat,
    grandTotal,
    // Payment breakdown for invoice display
    totalPaid,
    depositPaid,
    otherPayments,
    financeAdvance,
    financeCompanyName: confirmedFinanceCompanyName || financeCompanyContact?.displayName || financeCompanyContact?.companyName || deal.financeSelection?.financeCompanyName || null,
    partExchangeNet: pxNetValue,
    balanceDue,
    paymentMethod: paymentMethod || null,
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
    // Service receipt status
    serviceReceipt: serviceReceiptInfo,
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
  if (paymentMethod) {
    deal.paymentMethod = paymentMethod;
  }
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
