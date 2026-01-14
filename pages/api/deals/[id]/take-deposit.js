import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import Dealer from "@/models/Dealer";
import SalesDocument from "@/models/SalesDocument";
import Contact from "@/models/Contact";
import User from "@/models/User";
import DocumentCounter from "@/models/DocumentCounter";
import crypto from "crypto";
import { withDealerContext } from "@/libs/authContext";
import { getSignedGetUrl } from "@/libs/r2Client";

/**
 * Take Deposit API
 * POST /api/deals/[id]/take-deposit
 *
 * Records a deposit payment on a deal and generates a deposit receipt.
 * Transitions deal status to DEPOSIT_TAKEN.
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

  const {
    amount,
    method,
    reference,
    buyerSignature, // Base64 data URL
    dealerSignature,
    notes,
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Deposit amount is required" });
  }

  if (!method) {
    return res.status(400).json({ error: "Payment method is required" });
  }

  // Get the deal
  const deal = await Deal.findOne({ _id: id, dealerId })
    .populate("vehicleId")
    .populate("soldToContactId");

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Validate deal can receive deposit
  if (deal.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot take deposit on cancelled deal" });
  }
  if (deal.status === "COMPLETED") {
    return res.status(400).json({ error: "Deal is already completed" });
  }

  // Customer is required for deposit
  if (!deal.soldToContactId) {
    return res.status(400).json({ error: "Customer is required before taking deposit" });
  }

  // Get dealer for settings
  const dealer = await Dealer.findById(dealerId);

  // Allocate document number atomically
  const defaultPrefix = dealer?.salesSettings?.depositReceiptPrefix || "DEP";
  const { documentNumber } = await DocumentCounter.allocateNumber(
    dealerId,
    "DEPOSIT_RECEIPT",
    defaultPrefix
  );

  // Add payment to deal
  const payment = {
    type: "DEPOSIT",
    amount,
    method,
    paidAt: new Date(),
    reference: reference || documentNumber,
    notes,
    isRefunded: false,
  };

  deal.payments.push(payment);
  deal.depositTakenAt = deal.depositTakenAt || new Date();

  // Transition status if this is the first deposit
  if (deal.status === "DRAFT") {
    deal.status = "DEPOSIT_TAKEN";
  }

  deal.updatedByUserId = userId;
  await deal.save();

  // Update vehicle status
  await Vehicle.findByIdAndUpdate(deal.vehicleId._id, {
    salesStatus: "IN_DEAL",
  });

  // Create snapshot data for the document
  const customer = deal.soldToContactId;
  const vehicle = deal.vehicleId;

  // Get the user who took the deposit
  let takenByUser = null;
  if (userId) {
    takenByUser = await User.findById(userId).select("name email").lean();
  }

  // Get fresh signed URL for logo (90 days expiry to match document share links)
  let logoUrl = dealer.logoUrl;
  if (dealer.logoKey) {
    try {
      logoUrl = await getSignedGetUrl(dealer.logoKey, 90 * 24 * 60 * 60); // 90 days
    } catch (logoError) {
      console.warn("[take-deposit] Failed to generate logo URL:", logoError.message);
      // Fall back to stored logoUrl
    }
  }

  // Add-ons calculations (include if any add-ons exist on the deal)
  const addOnsNetTotal = (deal.addOns || []).reduce((sum, a) => sum + (a.unitPriceNet * (a.qty || 1)), 0);
  const addOnsVatTotal = (deal.addOns || []).reduce((sum, a) => {
    if (a.vatTreatment === "STANDARD") {
      return sum + (a.unitPriceNet * (a.qty || 1) * (a.vatRate || 0.2));
    }
    return sum;
  }, 0);

  // Calculate delivery amount
  const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amount || 0);

  // Calculate grand total including add-ons and delivery
  const vehicleTotal = deal.vehiclePriceGross || 0;
  const addOnsTotal = addOnsNetTotal + addOnsVatTotal;
  const grandTotal = vehicleTotal + addOnsTotal + deliveryAmount;

  // Get finance company name if using finance
  let financeCompanyName = null;
  if (deal.financeSelection?.isFinanced && deal.financeSelection?.financeCompanyContactId) {
    const financeCompany = await Contact.findById(deal.financeSelection.financeCompanyContactId).select("displayName name").lean();
    financeCompanyName = financeCompany?.displayName || financeCompany?.name;
  }

  // Check if dealer is VAT registered
  const isVatRegistered = dealer?.salesSettings?.vatRegistered !== false;

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
    vatScheme: deal.vatScheme,
    vehiclePriceGross: deal.vehiclePriceGross,
    // Include add-ons in deposit receipt
    addOns: (deal.addOns || []).map(a => ({
      name: a.name,
      qty: a.qty || 1,
      unitPriceNet: a.unitPriceNet,
      vatTreatment: a.vatTreatment,
      vatRate: a.vatRate,
    })),
    addOnsNetTotal,
    addOnsVatTotal,
    // Delivery
    delivery: {
      amount: deliveryAmount,
      isFree: deal.delivery?.isFree || false,
      notes: deal.delivery?.notes,
    },
    // Finance selection
    financeSelection: deal.financeSelection?.isFinanced ? {
      isFinanced: true,
      financeCompanyName: financeCompanyName,
      toBeConfirmed: deal.financeSelection?.toBeConfirmed || false,
    } : null,
    // Sale classification
    saleType: deal.saleType,
    buyerUse: deal.buyerUse,
    saleChannel: deal.saleChannel,
    // VAT registration status
    isVatRegistered,
    payments: [{
      type: "DEPOSIT",
      amount,
      method,
      paidAt: new Date(),
      reference: reference || documentNumber,
    }],
    grandTotal,
    totalPaid: amount,
    balanceDue: grandTotal - amount,
    termsText: deal.termsSnapshotText || dealer?.salesSettings?.terms?.depositTerms || "",
    // Include agreed work items (requests)
    requests: (deal.requests || []).map(req => ({
      title: req.title,
      details: req.details,
      type: req.type,
      status: req.status,
    })),
    // User who took the deposit
    takenBy: takenByUser ? {
      name: takenByUser.name,
      email: takenByUser.email,
    } : null,
    dealer: {
      name: dealer.name,
      companyName: dealer.companyName,
      address: dealer.companyAddress,
      phone: dealer.companyPhone,
      email: dealer.companyEmail,
      vatNumber: isVatRegistered ? dealer.salesSettings?.vatNumber : null,
      companyNumber: dealer.salesSettings?.companyNumber,
      logoUrl: logoUrl,
    },
  };

  // Generate share token
  const shareToken = crypto.randomBytes(32).toString("base64url");
  const shareTokenHash = crypto.createHash("sha256").update(shareToken).digest("hex");

  // Create sales document
  const salesDoc = await SalesDocument.create({
    dealerId,
    dealId: deal._id,
    type: "DEPOSIT_RECEIPT",
    documentNumber,
    status: "ISSUED",
    issuedAt: new Date(),
    snapshotData,
    signature: {
      required: deal.saleChannel === "IN_PERSON",
      buyerSignatureImageKey: buyerSignature ? `signatures/${dealerId}/${deal._id}/buyer-${Date.now()}.png` : undefined,
      dealerSignatureImageKey: dealerSignature ? `signatures/${dealerId}/${deal._id}/dealer-${Date.now()}.png` : undefined,
      signedAt: (buyerSignature || dealerSignature) ? new Date() : undefined,
    },
    shareToken,
    shareTokenHash,
    shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdByUserId: userId,
  });

  // TODO: If signatures provided, upload to R2 storage

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    dealStatus: deal.status,
    depositReceiptId: salesDoc._id.toString(),
    documentNumber,
    shareToken,
    shareUrl: `${process.env.NEXTAUTH_URL || ""}/public/deposit-receipt/${shareToken}`,
    totalDepositPaid: deal.payments
      .filter(p => p.type === "DEPOSIT" && !p.isRefunded)
      .reduce((sum, p) => sum + p.amount, 0),
  });
}

export default withDealerContext(handler);
