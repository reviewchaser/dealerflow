import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import Dealer from "@/models/Dealer";
import { withDealerContext } from "@/libs/authContext";

/**
 * POST /api/vehicles/[id]/assign-stock-number
 *
 * Assigns the next sequential stock number to a vehicle.
 * Uses the dealer's salesSettings.nextStockNumber and stockNumberPrefix.
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  // Get the vehicle
  const vehicle = await Vehicle.findOne({ _id: id, dealerId });
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  // Check if vehicle already has a stock number
  if (vehicle.stockNumber) {
    return res.status(400).json({ error: "Vehicle already has a stock number", stockNumber: vehicle.stockNumber });
  }

  // Get dealer settings
  const dealer = await Dealer.findById(dealerId);
  if (!dealer) {
    return res.status(404).json({ error: "Dealer not found" });
  }

  // Get next stock number and prefix
  const nextNumber = dealer.salesSettings?.nextStockNumber || 1;
  const prefix = dealer.salesSettings?.stockNumberPrefix || "";

  // Generate stock number (pad to 4 digits)
  const stockNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

  // Update vehicle with stock number
  vehicle.stockNumber = stockNumber;
  await vehicle.save();

  // Increment dealer's next stock number
  await Dealer.findByIdAndUpdate(dealerId, {
    $inc: { "salesSettings.nextStockNumber": 1 },
  });

  return res.status(200).json({
    success: true,
    stockNumber,
    vehicle: {
      id: vehicle._id.toString(),
      stockNumber: vehicle.stockNumber,
      regCurrent: vehicle.regCurrent,
    },
  });
}

export default withDealerContext(handler);
