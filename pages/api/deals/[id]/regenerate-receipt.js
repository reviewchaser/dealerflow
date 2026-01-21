import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Dealer from "@/models/Dealer";
import SalesDocument from "@/models/SalesDocument";
import Contact from "@/models/Contact";
import User from "@/models/User";
import Vehicle from "@/models/Vehicle";
import { withDealerContext } from "@/libs/authContext";
import { getSignedGetUrl } from "@/libs/r2Client";

/**
 * Regenerate Deposit Receipt API
 * POST /api/deals/[id]/regenerate-receipt
 *
 * Refreshes the deposit receipt snapshot with current deal data.
 * Preserves document number, share token, and payment info.
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
  const deal = await Deal.findOne({ _id: id, dealerId })
    .populate("vehicleId")
    .populate("soldToContactId");

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Find the existing deposit receipt
  const existingDoc = await SalesDocument.findOne({
    dealId: id,
    dealerId,
    type: "DEPOSIT_RECEIPT",
    status: { $ne: "VOID" },
  });

  if (!existingDoc) {
    return res.status(404).json({ error: "No deposit receipt found for this deal" });
  }

  // Get dealer for settings
  const dealer = await Dealer.findById(dealerId);

  // Debug: log deal data to understand what's being captured
  console.log("[regenerate-receipt] Deal ID:", id);
  console.log("[regenerate-receipt] Deal notes:", deal.notes);
  console.log("[regenerate-receipt] Deal delivery:", JSON.stringify(deal.delivery, null, 2));
  console.log("[regenerate-receipt] Deal warranty:", JSON.stringify(deal.warranty, null, 2));

  const customer = deal.soldToContactId;
  const vehicle = deal.vehicleId;

  // Get the user who is regenerating
  let regeneratedByUser = null;
  if (userId) {
    regeneratedByUser = await User.findById(userId).select("name email").lean();
  }

  // Get fresh signed URL for logo
  let logoUrl = dealer.logoUrl;
  if (dealer.logoKey) {
    try {
      logoUrl = await getSignedGetUrl(dealer.logoKey, 7 * 24 * 60 * 60);
    } catch (logoError) {
      console.warn("[regenerate-receipt] Failed to generate logo URL:", logoError.message);
    }
  }

  // Add-ons calculations
  const addOnsNetTotal = (deal.addOns || []).reduce((sum, a) => sum + (a.unitPriceNet * (a.qty || 1)), 0);
  const addOnsVatTotal = (deal.addOns || []).reduce((sum, a) => {
    if (a.vatTreatment === "STANDARD") {
      return sum + (a.unitPriceNet * (a.qty || 1) * (a.vatRate || 0.2));
    }
    return sum;
  }, 0);

  // Calculate delivery amount
  const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amountGross || deal.delivery?.amount || 0);

  // Calculate warranty amount
  const warrantyAmount = deal.warranty?.included && deal.warranty?.priceGross > 0 ? deal.warranty.priceGross : 0;

  // Calculate grand total
  const vehicleTotal = deal.vehiclePriceGross || 0;
  const addOnsTotal = addOnsNetTotal + addOnsVatTotal;
  const grandTotal = vehicleTotal + addOnsTotal + deliveryAmount + warrantyAmount;

  // Get finance company name if using finance
  let financeCompanyName = null;
  if (deal.financeSelection?.isFinanced && deal.financeSelection?.financeCompanyContactId) {
    const financeCompany = await Contact.findById(deal.financeSelection.financeCompanyContactId).select("displayName name").lean();
    financeCompanyName = financeCompany?.displayName || financeCompany?.name;
  }

  // Check if dealer is VAT registered
  const isVatRegistered = dealer?.salesSettings?.vatRegistered !== false;

  // Get total deposits paid from deal payments
  const totalDepositPaid = deal.payments
    .filter(p => p.type === "DEPOSIT" && !p.isRefunded)
    .reduce((sum, p) => sum + p.amount, 0);

  // Build updated snapshot - preserve original payment info from existing snapshot
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
    vatScheme: deal.vatScheme,
    vehiclePriceNet: deal.vehiclePriceNet || deal.vehiclePriceGross,
    vehicleVatAmount: deal.vehicleVatAmount || 0,
    vehiclePriceGross: deal.vehiclePriceGross,
    // Warranty details with VAT breakdown
    warranty: deal.warranty?.included ? (() => {
      const priceGross = deal.warranty.priceGross || 0;
      const vatTreatment = deal.warranty.vatTreatment || "NO_VAT";
      const vatRate = dealer?.salesSettings?.vatRate || 0.2;
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
    noWarrantyMessage: dealer?.salesSettings?.noWarrantyMessage || "Trade Terms - No warranty given or implied",
    // Add-ons
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
    // Delivery - only include if meaningful data exists
    // DEBUG: Log delivery data
    ...((() => {
      console.log("[regenerate-receipt] Deal ID:", deal._id);
      console.log("[regenerate-receipt] Deal delivery:", JSON.stringify(deal.delivery, null, 2));
      return {};
    })()),
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
    // Finance selection
    financeSelection: deal.financeSelection?.isFinanced ? {
      isFinanced: true,
      financeCompanyName: financeCompanyName,
      toBeConfirmed: deal.financeSelection?.toBeConfirmed || false,
    } : null,
    // Part Exchange(s)
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
        }))
      : (deal.partExchangeAllowance > 0 ? [{
          vrm: null,
          allowance: deal.partExchangeAllowance || 0,
          settlement: deal.partExchangeSettlement || 0,
        }] : []),
    // Sale classification
    saleType: deal.saleType,
    buyerUse: deal.buyerUse,
    saleChannel: deal.saleChannel,
    isVatRegistered,
    // Preserve original payment info from existing snapshot
    payments: existingDoc.snapshotData?.payments || [],
    grandTotal,
    totalPaid: totalDepositPaid,
    balanceDue: grandTotal - totalDepositPaid,
    termsText: deal.termsSnapshotText || getTermsText(deal, dealer),
    // Agreed work items
    requests: (deal.requests || []).map(req => ({
      title: req.title,
      details: req.details,
      type: req.type,
      status: req.status,
    })),
    // Preserve original takenBy from existing snapshot
    takenBy: existingDoc.snapshotData?.takenBy ? {
      name: existingDoc.snapshotData.takenBy.name,
      email: existingDoc.snapshotData.takenBy.email,
    } : { name: null, email: null },
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
    bankDetails: dealer.salesSettings?.bankDetails || {},
    // Include signature data if deal has signatures
    signature: deal.signature?.customerSignedAt ? {
      customerSignedAt: deal.signature.customerSignedAt,
      customerSignerName: deal.signature.customerSignerName,
      dealerSignedAt: deal.signature.dealerSignedAt,
      dealerSignerName: deal.signature.dealerSignerName,
    } : null,
    // Deal notes (e.g., finance advance info)
    notes: deal.notes || null,
  };

  // Update the existing document with new snapshot
  existingDoc.snapshotData = snapshotData;
  existingDoc.updatedAt = new Date();
  await existingDoc.save();

  return res.status(200).json({
    success: true,
    message: "Deposit receipt regenerated successfully",
    documentNumber: existingDoc.documentNumber,
    shareUrl: `${process.env.NEXTAUTH_URL || ""}/public/deposit-receipt/${existingDoc.shareToken}`,
  });
}

/**
 * Get appropriate terms text based on buyer type and sale channel
 */
function getTermsText(deal, dealer) {
  const terms = dealer?.salesSettings?.terms || {};
  const isBusiness = deal.buyerType === "BUSINESS" || deal.buyerUse === "BUSINESS";
  const buyerType = isBusiness ? "business" : "consumer";
  const channel = deal.saleChannel === "DISTANCE" ? "Distance" : "InPerson";
  const key = `${buyerType}${channel}`;
  return terms[key] || terms.consumerInPerson || "";
}

export default withDealerContext(handler);
