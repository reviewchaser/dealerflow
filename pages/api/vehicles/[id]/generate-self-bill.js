import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import Contact from "@/models/Contact";
import Dealer from "@/models/Dealer";
import SalesDocument from "@/models/SalesDocument";
import { withDealerContext } from "@/libs/authContext";
import { randomBytes, createHash } from "crypto";

/**
 * Generate Self-Billing Invoice for a Vehicle Purchase
 * POST /api/vehicles/[id]/generate-self-bill
 *
 * Creates a self-billing invoice (purchase invoice) for a vehicle.
 * This is a VAT invoice issued by the buyer (dealer) on behalf of the seller (supplier).
 *
 * Required:
 * - Vehicle must have purchase.purchasePriceNet (SIV)
 * - Vehicle must have purchase.purchasedFromContactId (Seller)
 * - Vehicle must have vatScheme
 * - For VAT_QUALIFYING: Supplier should have VAT number
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid vehicle ID" });
  }

  try {
    // Fetch vehicle with purchase info
    const vehicle = await Vehicle.findOne({ _id: id, dealerId })
      .populate("purchase.purchasedFromContactId")
      .lean();

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Validate purchase info is complete
    if (!vehicle.purchase?.purchasePriceNet && vehicle.purchase?.purchasePriceNet !== 0) {
      return res.status(400).json({
        error: "Vehicle purchase price (SIV) is required",
        code: "MISSING_SIV",
      });
    }

    if (!vehicle.vatScheme) {
      return res.status(400).json({
        error: "Vehicle VAT scheme is required",
        code: "MISSING_VAT_SCHEME",
      });
    }

    if (!vehicle.purchase?.purchasedFromContactId) {
      return res.status(400).json({
        error: "Vehicle supplier/seller is required",
        code: "MISSING_SELLER",
      });
    }

    const supplier = vehicle.purchase.purchasedFromContactId;

    // For VAT qualifying purchases, warn if supplier has no VAT number
    if (vehicle.vatScheme === "VAT_QUALIFYING" && !supplier.vatNumber) {
      // We'll still generate it but with a warning in the snapshot
      console.warn(`[Self-Bill] VAT qualifying vehicle ${vehicle.regCurrent} but supplier ${supplier.displayName || supplier.companyName} has no VAT number`);
    }

    // Delete any existing self-bill for this vehicle (allows regeneration)
    await SalesDocument.deleteMany({
      dealerId,
      vehicleId: id,
      type: "SELF_BILL_INVOICE",
    });

    // Fetch dealer for company details and numbering (increment after deletion)
    const dealer = await Dealer.findByIdAndUpdate(
      dealerId,
      { $inc: { "salesSettings.nextSelfBillNumber": 1 } },
      { new: false }
    );

    if (!dealer) {
      return res.status(500).json({ error: "Dealer not found" });
    }

    const prefix = dealer.salesSettings?.selfBillPrefix || "SB";
    const selfBillNumber = dealer.salesSettings?.nextSelfBillNumber || 1;
    const documentNumber = `${prefix}${String(selfBillNumber).padStart(5, "0")}`;

    // Calculate gross (for VAT qualifying)
    const purchasePriceNet = vehicle.purchase.purchasePriceNet;
    const purchaseVat = vehicle.vatScheme === "VAT_QUALIFYING"
      ? (vehicle.purchase.purchaseVat || purchasePriceNet * (dealer.salesSettings?.vatRate || 0.2))
      : 0;
    const purchasePriceGross = purchasePriceNet + purchaseVat;

    // Generate share token
    const shareToken = randomBytes(32).toString("hex");
    const shareTokenHash = createHash("sha256").update(shareToken).digest("hex");
    const shareExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Build snapshot data
    const snapshotData = {
      // Vehicle
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

      // VAT scheme
      vatScheme: vehicle.vatScheme,

      // Purchase details
      purchase: {
        purchaseDate: vehicle.purchase.purchaseDate,
        purchasePriceNet,
        purchaseVat,
        purchasePriceGross,
        purchaseInvoiceRef: vehicle.purchase.purchaseInvoiceRef,
      },

      // Supplier (the seller we bought from)
      supplier: {
        name: supplier.displayName || `${supplier.firstName || ""} ${supplier.lastName || ""}`.trim(),
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        vatNumber: supplier.vatNumber,
        address: supplier.address ? {
          line1: supplier.address.line1 || supplier.address.street,
          line2: supplier.address.line2,
          town: supplier.address.town || supplier.address.city,
          county: supplier.address.county,
          postcode: supplier.address.postcode,
        } : null,
      },

      // Dealer (the buyer issuing the self-bill)
      dealer: {
        name: dealer.name,
        companyName: dealer.companyName || dealer.name,
        address: dealer.companyAddress || dealer.address,
        phone: dealer.companyPhone || dealer.phone,
        email: dealer.companyEmail || dealer.email,
        vatNumber: dealer.salesSettings?.vatNumber,
        companyNumber: dealer.salesSettings?.companyNumber,
        logoUrl: dealer.logoUrl,
      },

      // Bank details
      bankDetails: dealer.salesSettings?.bankDetails || null,

      // Totals
      subtotal: purchasePriceNet,
      totalVat: purchaseVat,
      grandTotal: purchasePriceGross,
    };

    // Create the self-billing invoice document
    const doc = await SalesDocument.create({
      dealerId,
      vehicleId: id,
      type: "SELF_BILL_INVOICE",
      documentNumber,
      status: "ISSUED",
      issuedAt: new Date(),
      snapshotData,
      shareToken,
      shareTokenHash,
      shareExpiresAt,
      createdByUserId: userId,
    });

    // Build share URL
    const baseUrl = process.env.NEXTAUTH_URL || "https://app.dealerhq.co.uk";
    const shareUrl = `${baseUrl}/public/self-bill/${shareToken}`;

    return res.status(201).json({
      success: true,
      documentId: doc._id.toString(),
      documentNumber,
      shareUrl,
      shareToken,
      expiresAt: shareExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[Self-Bill API] Error:", error);
    return res.status(500).json({ error: "Failed to generate self-billing invoice" });
  }
}

export default withDealerContext(handler);
