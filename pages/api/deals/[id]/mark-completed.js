import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import PartExchange from "@/models/PartExchange";
import VehicleTask from "@/models/VehicleTask";
import Contact from "@/models/Contact";
import { withDealerContext } from "@/libs/authContext";

const DEFAULT_TASKS = ["PDI", "Valet", "Oil Service Check", "Photos", "Advert"];

/**
 * Mark Completed API
 * POST /api/deals/[id]/mark-completed
 *
 * Marks deal as fully completed (all payments received, delivered, admin done).
 * This is the final status in the deal lifecycle.
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
    completionNotes,
    sendReviewRequest, // Whether to trigger review request email
  } = req.body;

  // Get the deal with related data
  const deal = await Deal.findOne({ _id: id, dealerId })
    .populate("vehicleId")
    .populate("soldToContactId")
    .populate("partExchangeId");

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Validate deal can be completed
  if (deal.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot complete a cancelled deal" });
  }
  if (deal.status === "COMPLETED") {
    return res.status(400).json({ error: "Deal is already completed" });
  }
  if (deal.status === "DRAFT") {
    return res.status(400).json({
      error: "Deal must progress through deposit/invoice/delivery before completion"
    });
  }

  // If there's a part exchange with finance, check settlement requirements
  const px = deal.partExchangeId;
  if (px && px.hasFinance) {
    // Finance company is required
    if (!px.financeCompanyContactId) {
      return res.status(400).json({
        error: "Finance company is required for part exchange with finance",
        field: "partExchange.financeCompanyContactId"
      });
    }
    // Settlement in writing is required
    if (!px.hasSettlementInWriting) {
      return res.status(400).json({
        error: "Settlement figure must be confirmed in writing before completion",
        field: "partExchange.hasSettlementInWriting"
      });
    }
    // Finance must be settled
    if (!px.financeSettled) {
      return res.status(400).json({
        error: "Part exchange finance must be settled before completing the deal",
        field: "partExchange.financeSettled",
        hint: "Mark the PX finance as settled once payment has been made to the finance company"
      });
    }
  }

  // Calculate totals to check if fully paid
  const addOnsNetTotal = (deal.addOns || []).reduce((sum, a) => sum + (a.unitPriceNet * (a.qty || 1)), 0);
  const addOnsVatTotal = (deal.addOns || []).reduce((sum, a) => {
    if (a.vatTreatment === "STANDARD") {
      return sum + (a.unitPriceNet * (a.qty || 1) * (a.vatRate || 0.2));
    }
    return sum;
  }, 0);

  // Calculate delivery amount
  const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amount || 0);

  let grandTotal;
  if (deal.vatScheme === "VAT_QUALIFYING") {
    const subtotal = (deal.vehiclePriceNet || 0) + addOnsNetTotal;
    const totalVat = (deal.vehicleVatAmount || 0) + addOnsVatTotal;
    grandTotal = subtotal + totalVat + deliveryAmount;
  } else {
    grandTotal = (deal.vehiclePriceGross || 0) + addOnsNetTotal + addOnsVatTotal + deliveryAmount;
  }

  const totalPaid = (deal.payments || [])
    .filter(p => !p.isRefunded)
    .reduce((sum, p) => sum + p.amount, 0);

  // Part exchange value
  const pxNetValue = deal.partExchangeId
    ? (deal.partExchangeAllowance || 0) - (deal.partExchangeSettlement || 0)
    : 0;

  const balanceDue = grandTotal - totalPaid - pxNetValue;

  // Warn if not fully paid (but still allow completion)
  const isFullyPaid = balanceDue <= 0.01; // Allow for rounding

  // Update deal
  deal.status = "COMPLETED";
  deal.completedAt = new Date();
  deal.completionNotes = completionNotes || deal.completionNotes;
  deal.updatedByUserId = userId;
  await deal.save();

  // Update vehicle status
  await Vehicle.findByIdAndUpdate(deal.vehicleId._id, {
    salesStatus: "COMPLETED",
    status: "SOLD", // Update main vehicle status too
  });

  // Auto-create vehicle from part exchange if applicable
  let pxVehicleCreated = null;
  if (px && !px.convertedToVehicleId) {
    // Only create vehicle if not trade sale or auction (those are sold elsewhere)
    const shouldCreateVehicle = !["TRADE_SALE", "AUCTION"].includes(px.disposition);

    if (shouldCreateVehicle) {
      try {
        // Check for duplicate VRM
        const normalizedReg = px.vrm?.toUpperCase().replace(/\s/g, "");
        const existingVehicle = await Vehicle.findOne({
          dealerId,
          regCurrent: normalizedReg,
        }).lean();

        if (!existingVehicle) {
          // Create vehicle from PX details
          const pxVehicle = await Vehicle.create({
            dealerId,
            regCurrent: normalizedReg,
            vin: px.vin || undefined,
            make: px.make || "Unknown",
            model: px.model || "Unknown",
            derivative: px.derivative || undefined,
            year: px.year,
            mileageCurrent: px.mileage,
            colour: px.colour,
            fuelType: px.fuelType,
            transmission: px.transmission,
            motExpiryDate: px.motExpiry || undefined,
            type: "STOCK",
            saleType: "RETAIL",
            status: "in_stock",
            vatScheme: px.vatQualifying ? "VAT_QUALIFYING" : "MARGIN",
            notes: px.conditionSummary || px.notes,
            // Purchase info - the PX allowance is what we "paid" for it
            purchase: {
              purchasedFromContactId: deal.soldToContactId?._id, // Buyer of main vehicle is seller of PX
              purchaseDate: new Date(),
              purchasePriceNet: px.allowance || 0,
              purchaseNotes: `Part exchange from deal ${deal._id}`,
            },
          });

          // If disposition is RETAIL_STOCK, create prep tasks
          if (px.disposition === "RETAIL_STOCK") {
            for (const taskName of DEFAULT_TASKS) {
              await VehicleTask.create({
                vehicleId: pxVehicle._id,
                name: taskName,
                status: "pending",
                source: "system_default",
              });
            }
          }

          // Link PX to the new vehicle
          await PartExchange.findByIdAndUpdate(px._id, {
            convertedToVehicleId: pxVehicle._id,
          });

          pxVehicleCreated = {
            id: pxVehicle._id.toString(),
            vrm: pxVehicle.regCurrent,
            addedToPrep: px.disposition === "RETAIL_STOCK",
          };
        }
      } catch (pxErr) {
        console.error("[mark-completed] Failed to create PX vehicle:", pxErr.message);
        // Don't fail the whole operation, just log the error
      }
    }
  }

  // TODO: If sendReviewRequest is true and customer has email, queue review request email
  // This would integrate with an email service like SendGrid or Resend

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    dealStatus: deal.status,
    completedAt: deal.completedAt,
    isFullyPaid,
    balanceDue: isFullyPaid ? 0 : balanceDue,
    pxVehicleCreated,
    message: isFullyPaid
      ? "Deal completed successfully"
      : `Deal completed with outstanding balance of £${balanceDue.toFixed(2)}`,
  });
}

export default withDealerContext(handler);
