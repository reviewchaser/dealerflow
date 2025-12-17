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
    const { taskId } = req.query;

    const task = await VehicleTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    // Verify vehicle belongs to this dealer
    const vehicle = await Vehicle.findOne({ _id: task.vehicleId, dealerId }).lean();
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (req.method === "PUT") {
      const { status, notes, completedAt, name } = req.body;
      const previousStatus = task.status;

      if (name !== undefined) task.name = name;
      if (status) {
        task.status = status;
      }
      if (completedAt !== undefined) {
        task.completedAt = completedAt;
      }
      if (notes !== undefined) task.notes = notes;

      await task.save();

      // Log activity if task was completed
      if (status === "complete" && previousStatus !== "complete") {
        const actor = await User.findById(userId).lean();
        const actorName = actor?.name || user?.name || user?.email || "System";
        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_COMPLETED",
          message: `Completed task: ${task.name}`,
          meta: { taskId: task._id, taskName: task.name },
        });
      }

      return res.status(200).json(task.toJSON());
    }

    if (req.method === "DELETE") {
      await VehicleTask.findByIdAndDelete(taskId);
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export default withDealerContext(handler);
