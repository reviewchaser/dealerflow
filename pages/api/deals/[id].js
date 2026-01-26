import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import Contact from "@/models/Contact";
import VehicleIssue from "@/models/VehicleIssue";
import PartExchange from "@/models/PartExchange";
import { withDealerContext } from "@/libs/authContext";

/**
 * Individual Deal API
 * GET /api/deals/[id] - Get single deal with full details
 * PUT /api/deals/[id] - Update deal
 * DELETE /api/deals/[id] - Cancel deal (soft delete)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid deal ID" });
  }

  if (req.method === "GET") {
    const deal = await Deal.findOne({ _id: id, dealerId })
      .populate("vehicleId")
      .populate("soldToContactId")
      .populate("invoiceToContactId")
      .populate("salesPersonId", "name email")
      .populate("partExchangeId")
      .lean();

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    return res.status(200).json({
      ...deal,
      id: deal._id.toString(),
      vehicle: deal.vehicleId,
      customer: deal.soldToContactId,
      invoiceTo: deal.invoiceToContactId,
      salesPerson: deal.salesPersonId,
      partExchange: deal.partExchangeId,
      _id: undefined,
      __v: undefined,
    });
  }

  if (req.method === "PUT") {
    const deal = await Deal.findOne({ _id: id, dealerId });
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    // Don't allow editing cancelled deals
    if (deal.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot edit a cancelled deal" });
    }

    // Allow SIV amendments on completed deals, block other edits
    const isSivOnlyUpdate = Object.keys(req.body).every(k =>
      ["purchasePriceNet", "sivAmendment"].includes(k)
    );
    if (deal.status === "COMPLETED" && !isSivOnlyUpdate) {
      return res.status(400).json({ error: "Cannot edit a completed deal (except SIV amendments)" });
    }

    const {
      soldToContactId,
      invoiceToContactId,
      saleType,
      buyerUse,
      buyerType, // backward compat
      saleChannel,
      businessDetails,
      paymentType,
      finance,
      vatScheme,
      vehiclePriceNet,
      vehicleVatAmount,
      vehiclePriceGross,
      partExchangeId,
      partExchangeAllowance,
      partExchangeSettlement,
      addOns,
      requests,
      notes,
      internalNotes,
      warrantyMonths,
      warranty,
      deliveryAddress,
      delivery,
      termsKey,
      termsSnapshotText,
      financeSelection,
      purchasePriceNet,
      sivAmendment,
    } = req.body;

    // Build update object
    const updateData = { updatedByUserId: userId };

    if (soldToContactId !== undefined) updateData.soldToContactId = soldToContactId;
    if (invoiceToContactId !== undefined) updateData.invoiceToContactId = invoiceToContactId;
    if (saleType !== undefined) updateData.saleType = saleType;
    if (buyerUse !== undefined) updateData.buyerUse = buyerUse;
    if (buyerType !== undefined) updateData.buyerType = buyerType;
    if (saleChannel !== undefined) updateData.saleChannel = saleChannel;
    if (businessDetails !== undefined) updateData.businessDetails = businessDetails;

    // Handle null values to allow clearing fields
    if (buyerUse === null) updateData.buyerUse = null;
    if (saleChannel === null) updateData.saleChannel = null;
    if (paymentType !== undefined) updateData.paymentType = paymentType;
    if (finance !== undefined) updateData.finance = finance;
    if (vatScheme !== undefined) updateData.vatScheme = vatScheme;
    if (vehiclePriceNet !== undefined) updateData.vehiclePriceNet = vehiclePriceNet;
    if (vehicleVatAmount !== undefined) updateData.vehicleVatAmount = vehicleVatAmount;
    if (vehiclePriceGross !== undefined) updateData.vehiclePriceGross = vehiclePriceGross;
    if (partExchangeId !== undefined) updateData.partExchangeId = partExchangeId || null;
    if (partExchangeAllowance !== undefined) updateData.partExchangeAllowance = partExchangeAllowance;
    if (partExchangeSettlement !== undefined) updateData.partExchangeSettlement = partExchangeSettlement;
    if (addOns !== undefined) updateData.addOns = addOns;
    if (requests !== undefined) updateData.requests = requests;
    if (notes !== undefined) updateData.notes = notes;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (warrantyMonths !== undefined) updateData.warrantyMonths = warrantyMonths;
    if (warranty !== undefined) updateData.warranty = warranty;
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress;
    if (termsKey !== undefined) updateData.termsKey = termsKey;
    if (termsSnapshotText !== undefined) updateData.termsSnapshotText = termsSnapshotText;
    if (purchasePriceNet !== undefined) updateData.purchasePriceNet = purchasePriceNet;
    if (sivAmendment !== undefined) {
      updateData.sivAmendment = { ...(deal.sivAmendment?.toObject?.() || deal.sivAmendment || {}), ...sivAmendment };
    }

    // Finance selection can be edited until INVOICED status
    if (financeSelection !== undefined && deal.status !== "INVOICED" && deal.status !== "DELIVERED") {
      updateData.financeSelection = { ...(deal.financeSelection?.toObject?.() || deal.financeSelection || {}), ...financeSelection };
    }

    // Delivery can be edited until INVOICED status
    if (delivery !== undefined && deal.status !== "INVOICED" && deal.status !== "DELIVERED") {
      updateData.delivery = { ...(deal.delivery?.toObject?.() || deal.delivery || {}), ...delivery };
    }

    const updatedDeal = await Deal.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("vehicleId", "regCurrent make model year")
      .populate("soldToContactId", "displayName email phone")
      .lean();

    return res.status(200).json({
      ...updatedDeal,
      id: updatedDeal._id.toString(),
      _id: undefined,
      __v: undefined,
    });
  }

  if (req.method === "DELETE") {
    const deal = await Deal.findOne({ _id: id, dealerId });
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const { hardDelete, cancelReason } = req.body || {};

    // Hard delete - allowed for DRAFT and CANCELLED deals
    if (hardDelete) {
      if (!["DRAFT", "CANCELLED"].includes(deal.status)) {
        return res.status(400).json({ error: "Only draft or cancelled deals can be permanently deleted." });
      }

      // Release the vehicle back to available (only if not already cancelled - cancelled deals already released the vehicle)
      if (deal.status === "DRAFT") {
        await Vehicle.findByIdAndUpdate(deal.vehicleId, {
          salesStatus: "AVAILABLE",
        });
      }

      // Hard delete the deal
      await Deal.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: deal.status === "DRAFT" ? "Draft deleted" : "Cancelled deal deleted",
        dealId: id,
      });
    }

    // Already cancelled - nothing to do (soft cancel only)
    if (deal.status === "CANCELLED") {
      return res.status(400).json({ error: "Deal is already cancelled" });
    }

    // COMPLETED deals require a cancellation reason
    if (deal.status === "COMPLETED") {
      if (!cancelReason || cancelReason.trim().length === 0) {
        return res.status(400).json({
          error: "Cancellation reason is required for completed deals",
          code: "REASON_REQUIRED"
        });
      }
    }

    const wasCompleted = deal.status === "COMPLETED";

    // Cancel the deal
    deal.status = "CANCELLED";
    deal.cancelledAt = new Date();
    deal.cancelReason = cancelReason || "Cancelled by user";
    deal.updatedByUserId = userId;

    // Cancel all pending/in-progress agreed work (requests)
    if (deal.requests && deal.requests.length > 0) {
      deal.requests.forEach((request) => {
        if (request.status === "REQUESTED" || request.status === "IN_PROGRESS") {
          request.status = "CANCELLED";
        }
      });

      // Also cancel any linked vehicle issues that were created from this deal
      const linkedIssueIds = deal.requests
        .filter((r) => r.linkToIssueId)
        .map((r) => r.linkToIssueId);

      if (linkedIssueIds.length > 0) {
        await VehicleIssue.updateMany(
          {
            _id: { $in: linkedIssueIds },
            status: { $in: ["OPEN", "IN_PROGRESS"] },
          },
          {
            $set: {
              status: "WONT_FIX",
              resolution: "Deal cancelled",
              resolvedAt: new Date(),
            },
          }
        );
      }
    }

    await deal.save();

    // Track what we've done for the response
    let vehicleRestored = null;
    const pxVehiclesDeleted = [];
    const pxVehiclesKept = [];

    if (wasCompleted) {
      // COMPLETED deal cancellation - restore vehicle and handle PX vehicles

      // 1. Restore the sold vehicle back to stock
      const soldVehicle = await Vehicle.findById(deal.vehicleId).lean();
      if (soldVehicle) {
        await Vehicle.findByIdAndUpdate(deal.vehicleId, {
          salesStatus: "AVAILABLE",
          status: "in_stock",
          $unset: { soldDealId: 1, soldAt: 1 },
        });
        vehicleRestored = { id: soldVehicle._id.toString(), vrm: soldVehicle.regCurrent };
      }

      // 2. Find and handle PX vehicles created from this deal
      const pxVehicles = await Vehicle.find({ sourceDealId: id }).lean();
      for (const pxVehicle of pxVehicles) {
        // Only delete if not already sold (AVAILABLE status)
        if (pxVehicle.salesStatus === "AVAILABLE") {
          await Vehicle.findByIdAndDelete(pxVehicle._id);
          pxVehiclesDeleted.push({ id: pxVehicle._id.toString(), vrm: pxVehicle.regCurrent });
        } else {
          // Keep the vehicle but note why
          pxVehiclesKept.push({
            id: pxVehicle._id.toString(),
            vrm: pxVehicle.regCurrent,
            reason: `Already ${pxVehicle.salesStatus === "COMPLETED" ? "sold" : "in a deal"}`,
          });
        }
      }
    } else {
      // Non-completed deal - just release the vehicle
      await Vehicle.findByIdAndUpdate(deal.vehicleId, {
        salesStatus: "AVAILABLE",
        status: "in_stock",
        $unset: { soldAt: 1 },
      });
      const vehicle = await Vehicle.findById(deal.vehicleId).lean();
      if (vehicle) {
        vehicleRestored = { id: vehicle._id.toString(), vrm: vehicle.regCurrent };
      }
    }

    return res.status(200).json({
      success: true,
      message: wasCompleted ? "Completed deal cancelled" : "Deal cancelled",
      dealId: id,
      vehicleReleased: true,
      vehicleRestored,
      pxVehiclesDeleted,
      pxVehiclesKept,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
