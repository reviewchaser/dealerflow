import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import PartExchange from "@/models/PartExchange";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import AppraisalIssue from "@/models/AppraisalIssue";
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
    confirmWithoutSettlement, // Skip settlement in writing confirmation prompt
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

  // All deals require both dealer and customer signatures before completion
  if (!deal.signature?.dealerSignedAt) {
    return res.status(400).json({
      error: "Dealer must sign the invoice before completing this deal"
    });
  }
  if (!deal.signature?.customerSignedAt) {
    return res.status(400).json({
      error: "Customer must sign the invoice before completing (via showroom signing or delivery confirmation)"
    });
  }

  // Check settlement requirements for all part exchanges (both legacy and new array)
  const pxsNeedingSettlementConfirmation = [];

  // Check legacy partExchangeId
  const legacyPx = deal.partExchangeId;
  if (legacyPx && legacyPx.hasFinance) {
    if (!legacyPx.financeCompanyContactId) {
      return res.status(400).json({
        error: "Finance company is required for part exchange with finance",
        field: "partExchange.financeCompanyContactId"
      });
    }
    if (!legacyPx.financeSettled) {
      return res.status(400).json({
        error: "Part exchange finance must be settled before completing the deal",
        field: "partExchange.financeSettled",
        hint: "Mark the PX finance as settled once payment has been made to the finance company"
      });
    }
    // Settlement in writing - soft prompt instead of hard error
    if (!legacyPx.hasSettlementInWriting) {
      pxsNeedingSettlementConfirmation.push({
        vrm: legacyPx.vrm,
        index: -1, // legacy
        type: "legacy"
      });
    }
  }

  // Check partExchanges[] array
  if (deal.partExchanges && deal.partExchanges.length > 0) {
    deal.partExchanges.forEach((px, index) => {
      if (px.hasFinance) {
        if (!px.financeCompanyContactId) {
          return res.status(400).json({
            error: `Finance company is required for part exchange ${px.vrm}`,
            field: `partExchanges[${index}].financeCompanyContactId`
          });
        }
        // Settlement in writing - soft prompt instead of hard error
        if (!px.hasSettlementInWriting) {
          pxsNeedingSettlementConfirmation.push({
            vrm: px.vrm,
            index,
            type: "array"
          });
        }
      }
    });
  }

  // If there are PXs needing settlement confirmation and user hasn't confirmed
  if (pxsNeedingSettlementConfirmation.length > 0 && !confirmWithoutSettlement) {
    return res.status(400).json({
      error: "SETTLEMENT_CONFIRMATION_REQUIRED",
      needsConfirmation: true,
      message: "Some part exchanges have finance but settlement has not been received in writing. Please confirm to proceed.",
      pxDetails: pxsNeedingSettlementConfirmation
    });
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

  // Update vehicle status and link to deal
  await Vehicle.findByIdAndUpdate(deal.vehicleId._id, {
    salesStatus: "COMPLETED",
    status: "SOLD", // Update main vehicle status too
    soldDealId: deal._id, // Link vehicle to this deal for ex-stock viewing
  });

  // Helper function to create vehicle from part exchange
  const createVehicleFromPx = async (px, isLegacy = false) => {
    // Only create vehicle if not trade sale or auction (those are sold elsewhere)
    const shouldCreateVehicle = !["TRADE_SALE", "AUCTION"].includes(px.disposition);
    if (!shouldCreateVehicle) return null;

    // Check for duplicate VRM
    const normalizedReg = px.vrm?.toUpperCase().replace(/\s/g, "");
    const existingVehicle = await Vehicle.findOne({
      dealerId,
      regCurrent: normalizedReg,
    }).lean();

    if (existingVehicle) return null;

    // Determine if this PX came from a dealer appraisal
    const hasSourceAppraisal = px.sourceType === "DEALER_APPRAISAL" && px.sourceId;

    // Get sold vehicle VRM for reference
    const soldVehicleVrm = deal.vehicleId?.regCurrent || "";

    // Calculate purchase price based on VAT status
    // For VAT qualifying PX, allowance is entered as GROSS (inc VAT)
    let purchasePriceNet = px.allowance || 0;
    let purchaseVat = 0;
    const purchasePriceGross = px.allowance || 0;

    if (px.vatQualifying && purchasePriceGross > 0) {
      const vatRate = 0.2; // UK standard rate
      purchasePriceNet = purchasePriceGross / (1 + vatRate);
      purchaseVat = purchasePriceGross - purchasePriceNet;
    }

    // Get buyer contact ID (handles both populated and unpopulated cases)
    // Debug: Log the deal's soldToContactId
    console.log("[mark-completed] deal.soldToContactId:", deal.soldToContactId);

    const buyerContactId = deal.soldToContactId?._id || deal.soldToContactId;

    // Debug: Log the resolved buyerContactId
    console.log("[mark-completed] buyerContactId:", buyerContactId);

    if (!buyerContactId) {
      console.warn("[mark-completed] WARNING: No buyerContactId found for PX vehicle", px.vrm);
    }

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
      // Link to original appraisal if this was a dealer appraisal PX
      sourceAppraisalId: hasSourceAppraisal ? px.sourceId : undefined,
      // Link to the deal this was part exchanged against
      sourceDealId: deal._id,
      sourcePxVrm: soldVehicleVrm,
      // Purchase info - the PX allowance is what we "paid" for it
      purchase: {
        purchasedFromContactId: buyerContactId, // Buyer of main vehicle is seller of PX
        purchaseDate: new Date(),
        purchasePriceNet: purchasePriceNet,
        purchaseVat: purchaseVat,
        purchasePriceGross: purchasePriceGross,
        purchaseNotes: `Part exchange against ${soldVehicleVrm}`,
      },
    });

    // Create prep tasks if RETAIL_STOCK or UNDECIDED (default to retail)
    const createPrepTasks = px.disposition === "RETAIL_STOCK" || !px.disposition || px.disposition === "UNDECIDED";
    if (createPrepTasks) {
      for (const taskName of DEFAULT_TASKS) {
        await VehicleTask.create({
          vehicleId: pxVehicle._id,
          name: taskName,
          status: "pending",
          source: "system_default",
        });
      }
    }

    // Transfer appraisal issues to the new vehicle if from a dealer appraisal
    let issuesTransferred = 0;
    if (hasSourceAppraisal) {
      try {
        const appraisalIssues = await AppraisalIssue.find({
          appraisalId: px.sourceId,
        }).lean();

        const categoryMap = {
          mechanical: "Mechanical",
          electrical: "Electrical",
          bodywork: "Cosmetic",
          interior: "Cosmetic",
          tyres: "Mechanical",
          mot: "Mechanical",
          service: "Mechanical",
          fault_codes: "Electrical",
          other: "Other",
        };

        const statusMap = {
          outstanding: "Outstanding",
          ordered: "Ordered",
          in_progress: "In Progress",
          resolved: "Complete",
        };

        for (const issue of appraisalIssues) {
          await VehicleIssue.create({
            vehicleId: pxVehicle._id,
            category: categoryMap[issue.category] || "Other",
            subcategory: issue.subcategory || issue.category || "General",
            description: issue.description,
            photos: issue.photos || [],
            actionNeeded: issue.actionNeeded,
            status: statusMap[issue.status] || "Outstanding",
            notes: issue.notes
              ? `Transferred from appraisal: ${issue.notes}`
              : "Transferred from appraisal",
            createdByUserId: userId,
          });
          issuesTransferred++;
        }
      } catch (issueErr) {
        console.error("[mark-completed] Failed to transfer appraisal issues:", issueErr.message);
      }
    }

    // Link PX to the new vehicle (for legacy PartExchange model)
    if (isLegacy && px._id) {
      await PartExchange.findByIdAndUpdate(px._id, {
        convertedToVehicleId: pxVehicle._id,
      });
    }

    return {
      id: pxVehicle._id.toString(),
      vrm: pxVehicle.regCurrent,
      addedToPrep: createPrepTasks,
      issuesTransferred,
    };
  };

  // Auto-create vehicles from part exchanges
  const pxVehiclesCreated = [];

  // Handle legacy partExchangeId
  if (legacyPx && !legacyPx.convertedToVehicleId) {
    try {
      const result = await createVehicleFromPx(legacyPx, true);
      if (result) pxVehiclesCreated.push(result);
    } catch (pxErr) {
      console.error("[mark-completed] Failed to create PX vehicle (legacy):", pxErr.message);
    }
  }

  // Handle partExchanges[] array
  if (deal.partExchanges && deal.partExchanges.length > 0) {
    for (let i = 0; i < deal.partExchanges.length; i++) {
      const px = deal.partExchanges[i];
      // Skip if this PX has already been converted to a vehicle
      if (px.convertedToVehicleId) continue;

      try {
        const result = await createVehicleFromPx(px, false);
        if (result) {
          pxVehiclesCreated.push(result);
          // Update the deal's partExchanges array with the converted vehicle ID
          deal.partExchanges[i].convertedToVehicleId = result.id;
        }
      } catch (pxErr) {
        console.error(`[mark-completed] Failed to create PX vehicle (index ${i}):`, pxErr.message);
      }
    }
    // Save the updated partExchanges array
    if (pxVehiclesCreated.length > 0) {
      await deal.save();
    }
  }

  // For backward compatibility, set pxVehicleCreated to first item
  const pxVehicleCreated = pxVehiclesCreated.length > 0 ? pxVehiclesCreated[0] : null;

  // TODO: If sendReviewRequest is true and customer has email, queue review request email
  // This would integrate with an email service like SendGrid or Resend

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    dealStatus: deal.status,
    completedAt: deal.completedAt,
    isFullyPaid,
    balanceDue: isFullyPaid ? 0 : balanceDue,
    pxVehicleCreated, // Backward compat - first PX vehicle
    pxVehiclesCreated, // All PX vehicles created
    message: isFullyPaid
      ? "Deal completed successfully"
      : `Deal completed with outstanding balance of £${balanceDue.toFixed(2)}`,
  });
}

export default withDealerContext(handler);
