import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Dealer from "@/models/Dealer";
import SalesDocument from "@/models/SalesDocument";
import Contact from "@/models/Contact";
import DocumentCounter from "@/models/DocumentCounter";
import crypto from "crypto";
import { withDealerContext } from "@/libs/authContext";
import { getSignedGetUrl } from "@/libs/r2Client";

/**
 * Record Balance Payment API
 * POST /api/deals/[id]/record-balance-payment
 *
 * Records a balance payment on a deal and optionally generates a payment receipt.
 * Updates invoice status to PAID if balance is cleared.
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
    notes,
    generateReceipt = true, // Whether to generate a payment receipt document
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Payment amount is required" });
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

  // Validate deal can receive payment
  if (deal.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot record payment on cancelled deal" });
  }

  // Customer is required
  if (!deal.soldToContactId) {
    return res.status(400).json({ error: "Customer is required" });
  }

  // Get dealer for settings
  const dealer = await Dealer.findById(dealerId);

  // Calculate current balance before payment
  const addOnsNetTotal = (deal.addOns || []).reduce((sum, a) => sum + (a.unitPriceNet * (a.qty || 1)), 0);
  const addOnsVatTotal = (deal.addOns || []).reduce((sum, a) => {
    if (a.vatTreatment === "STANDARD") {
      return sum + (a.unitPriceNet * (a.qty || 1) * (a.vatRate || 0.2));
    }
    return sum;
  }, 0);

  const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amount || 0);

  let grandTotal;
  if (deal.vatScheme === "VAT_QUALIFYING") {
    const subtotal = (deal.vehiclePriceNet || 0) + addOnsNetTotal;
    const totalVat = (deal.vehicleVatAmount || 0) + addOnsVatTotal;
    grandTotal = subtotal + totalVat + deliveryAmount;
  } else {
    grandTotal = (deal.vehiclePriceGross || 0) + addOnsNetTotal + addOnsVatTotal + deliveryAmount;
  }

  const totalPaidBefore = (deal.payments || [])
    .filter(p => !p.isRefunded)
    .reduce((sum, p) => sum + p.amount, 0);

  // Part exchange value
  const pxNetValue = deal.partExchangeId
    ? (deal.partExchangeAllowance || 0) - (deal.partExchangeSettlement || 0)
    : 0;

  const balanceBefore = grandTotal - totalPaidBefore - pxNetValue;
  const balanceAfter = balanceBefore - amount;
  const isFullPayment = balanceAfter <= 0.01; // Allow for rounding

  // Add payment to deal
  const payment = {
    type: "BALANCE",
    amount,
    method,
    paidAt: new Date(),
    reference: reference || "",
    notes,
    isRefunded: false,
  };

  deal.payments.push(payment);
  deal.updatedByUserId = userId;
  await deal.save();

  let paymentReceiptDoc = null;
  let paymentReceiptUrl = null;

  // Generate payment receipt if requested
  if (generateReceipt) {
    // Allocate document number atomically
    const defaultPrefix = dealer?.salesSettings?.paymentReceiptPrefix || "PAY";
    const { documentNumber } = await DocumentCounter.allocateNumber(
      dealerId,
      "PAYMENT_RECEIPT",
      defaultPrefix
    );

    // Get the latest invoice for this deal
    const invoice = await SalesDocument.findOne({
      dealId: deal._id,
      type: "INVOICE",
      status: "ISSUED",
    }).sort({ createdAt: -1 });

    const customer = deal.soldToContactId;
    const vehicle = deal.vehicleId;

    // Get fresh signed URL for logo
    let logoUrl = dealer.logoUrl;
    if (dealer.logoKey) {
      try {
        logoUrl = await getSignedGetUrl(dealer.logoKey, 7 * 24 * 60 * 60); // 7 days max for S3 signature v4
      } catch (logoError) {
        console.warn("[record-balance-payment] Failed to generate logo URL:", logoError.message);
      }
    }

    const isVatRegistered = dealer?.salesSettings?.vatRegistered !== false;

    const snapshotData = {
      vehicle: {
        regCurrent: vehicle.regCurrent,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
      },
      customer: {
        name: customer.displayName,
        companyName: customer.companyName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
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
      paymentReceipt: {
        paymentAmount: amount,
        paymentMethod: method,
        paymentReference: reference || documentNumber,
        invoiceNumber: invoice?.documentNumber || "N/A",
        invoiceBalanceBefore: balanceBefore,
        invoiceBalanceAfter: Math.max(0, balanceAfter),
        isFullPayment,
      },
      grandTotal,
      totalPaid: totalPaidBefore + amount,
      balanceDue: Math.max(0, balanceAfter),
    };

    // Generate share token
    const shareToken = crypto.randomBytes(32).toString("base64url");
    const shareTokenHash = crypto.createHash("sha256").update(shareToken).digest("hex");

    // Create payment receipt document
    paymentReceiptDoc = await SalesDocument.create({
      dealerId,
      dealId: deal._id,
      type: "PAYMENT_RECEIPT",
      documentNumber,
      status: "ISSUED",
      issuedAt: new Date(),
      snapshotData,
      shareToken,
      shareTokenHash,
      shareExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      createdByUserId: userId,
    });

    paymentReceiptUrl = `${process.env.NEXTAUTH_URL || ""}/public/payment-receipt/${shareToken}`;

    // If full payment, mark the invoice as paid
    if (isFullPayment && invoice) {
      invoice.paidAt = new Date();
      await invoice.save();
    }
  }

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    payment: {
      amount,
      method,
      reference: payment.reference,
      paidAt: payment.paidAt,
    },
    balanceBefore,
    balanceAfter: Math.max(0, balanceAfter),
    isFullPayment,
    totalPaid: totalPaidBefore + amount,
    grandTotal,
    paymentReceipt: paymentReceiptDoc ? {
      id: paymentReceiptDoc._id.toString(),
      documentNumber: paymentReceiptDoc.documentNumber,
      shareUrl: paymentReceiptUrl,
    } : null,
    message: isFullPayment
      ? "Payment recorded - balance paid in full"
      : `Payment recorded - remaining balance: £${balanceAfter.toFixed(2)}`,
  });
}

export default withDealerContext(handler);
