import connectMongo from "@/libs/mongoose";
import VehicleActivity from "@/models/VehicleActivity";
import Vehicle from "@/models/Vehicle";
import { withDealerContext } from "@/libs/authContext";

export default withDealerContext(async (req, res, ctx) => {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      // Verify vehicle belongs to this dealer
      const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }

      const limit = parseInt(req.query.limit) || 25;
      const offset = parseInt(req.query.offset) || 0;

      const activities = await VehicleActivity.find({ vehicleId: id, dealerId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const total = await VehicleActivity.countDocuments({ vehicleId: id, dealerId });

      return res.status(200).json({
        activities,
        total,
        hasMore: offset + activities.length < total,
      });
    } catch (error) {
      console.error("Error fetching vehicle activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
