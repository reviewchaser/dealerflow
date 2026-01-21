import connectMongo from "@/libs/mongoose";
import VehicleTask from "@/models/VehicleTask";
import Vehicle from "@/models/Vehicle";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  try {
    await connectMongo();
    const { dealerId, userId, user } = ctx;
    const { id } = req.query; // vehicleId

    if (!id) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    // Verify vehicle belongs to this dealer
    const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (req.method === "GET") {
      const tasks = await VehicleTask.find({ vehicleId: id }).sort({ order: 1, createdAt: 1 }).lean();
      return res.status(200).json(tasks);
    }

    if (req.method === "POST") {
      const { name, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Task name required" });

      // Get max order value for this vehicle's tasks
      const maxOrderTask = await VehicleTask.findOne({ vehicleId: id }).sort({ order: -1 }).lean();
      const nextOrder = (maxOrderTask?.order ?? -1) + 1;

      const task = await VehicleTask.create({
        vehicleId: id,
        name,
        notes,
        status: "pending",
        source: "manual",
        order: nextOrder,
      });

      // Log activity
      const actor = await User.findById(userId).lean();
      const actorName = actor?.name || user?.name || user?.email || "System";
      await VehicleActivity.log({
        dealerId,
        vehicleId: id,
        actorId: userId,
        actorName,
        type: "TASK_ADDED",
        message: `Added task: ${name}`,
        meta: { taskId: task._id, taskName: name },
      });

      return res.status(201).json(task.toJSON());
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export default withDealerContext(handler);
