import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import { withDealerContext } from "@/libs/authContext";

/**
 * Mark Delivered API
 * POST /api/deals/[id]/mark-delivered
 *
 * Records delivery of vehicle to customer.
 * Transitions deal status to DELIVERED.
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
    deliveryNotes,
    deliveryMileage,
    deliveredByUserId,
  } = req.body;

  // Get the deal
  const deal = await Deal.findOne({ _id: id, dealerId })
    .populate("vehicleId");

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Validate deal can be marked as delivered
  if (deal.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot deliver a cancelled deal" });
  }
  if (deal.status === "COMPLETED") {
    return res.status(400).json({ error: "Deal is already completed" });
  }
  if (deal.status === "DELIVERED") {
    return res.status(400).json({ error: "Deal is already marked as delivered" });
  }

  // Ideally should be invoiced before delivery, but allow flexibility
  if (deal.status === "DRAFT") {
    return res.status(400).json({
      error: "Deal should have a deposit taken or be invoiced before marking as delivered"
    });
  }

  // Update deal
  deal.status = "DELIVERED";
  deal.deliveredAt = new Date();
  deal.deliveryNotes = deliveryNotes || deal.deliveryNotes;
  deal.deliveryMileage = deliveryMileage;
  deal.deliveredByUserId = deliveredByUserId || userId;
  deal.updatedByUserId = userId;
  await deal.save();

  // Update vehicle status
  await Vehicle.findByIdAndUpdate(deal.vehicleId._id, {
    salesStatus: "DELIVERED",
    mileageCurrent: deliveryMileage || deal.vehicleId.mileageCurrent,
  });

  return res.status(200).json({
    success: true,
    dealId: deal._id.toString(),
    dealStatus: deal.status,
    deliveredAt: deal.deliveredAt,
    message: "Deal marked as delivered",
  });
}

export default withDealerContext(handler);
