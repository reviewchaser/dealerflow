import connectMongo from "@/libs/mongoose";
import VehicleTask from "@/models/VehicleTask";
import Vehicle from "@/models/Vehicle";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();
    const { dealerId } = ctx;
    const { id } = req.query; // vehicleId
    const { taskIds } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "taskIds array is required" });
    }

    // Verify vehicle belongs to this dealer
    const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Update order field for each task
    const updates = taskIds.map((taskId, index) => ({
      updateOne: {
        filter: { _id: taskId, vehicleId: id },
        update: { $set: { order: index } },
      },
    }));

    await VehicleTask.bulkWrite(updates);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export default withDealerContext(handler);
