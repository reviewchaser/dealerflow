import connectMongo from "@/libs/mongoose";
import VehicleTask, { TASK_PROGRESS } from "@/models/VehicleTask";
import Vehicle from "@/models/Vehicle";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";

// Human-readable labels for statuses
const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Complete",
  complete: "Complete",
  not_required: "Not Required",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DONE: "Complete",
  NOT_REQUIRED: "Not Required",
};

// Human-readable labels for progress
const PROGRESS_LABELS = {
  NONE: null,
  PARTS_ORDERED: "Parts Ordered",
  AWAITING_PARTS: "Awaiting Parts",
  BOOKED_IN: "Booked In",
  IN_WORKSHOP: "In Workshop",
};

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
      const { status, notes, completedAt, name, progress, progressNote } = req.body;
      const previousStatus = task.status;
      const previousProgress = task.progress || "NONE";
      const previousProgressNote = task.progressNote;

      // Get actor name for activity logging
      const actor = await User.findById(userId).lean();
      const actorName = actor?.name || user?.name || user?.email || "System";

      // Track what changed for activity logging
      let statusChanged = false;
      let progressChanged = false;
      let nameChanged = false;

      if (name !== undefined && name !== task.name) {
        task.name = name;
        nameChanged = true;
      }

      if (status && status !== previousStatus) {
        task.status = status;
        statusChanged = true;
        // Auto-set completedAt when completed
        if ((status === "done" || status === "complete") && !task.completedAt) {
          task.completedAt = new Date();
        }
        // Clear completedAt if moving away from complete
        if (status !== "done" && status !== "complete" && task.completedAt) {
          task.completedAt = null;
        }
      }

      if (completedAt !== undefined) {
        task.completedAt = completedAt;
      }

      if (notes !== undefined) task.notes = notes;

      // Handle progress sub-status
      if (progress !== undefined && progress !== previousProgress) {
        task.progress = progress;
        progressChanged = true;
      }
      if (progressNote !== undefined) {
        task.progressNote = progressNote;
      }

      await task.save();

      // Log activity for status changes
      if (statusChanged) {
        const oldLabel = STATUS_LABELS[previousStatus] || previousStatus;
        const newLabel = STATUS_LABELS[status] || status;
        const isCompleted = status === "done" || status === "complete";

        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: isCompleted ? "TASK_COMPLETED" : "TASK_STATUS_UPDATED",
          message: isCompleted
            ? `Completed task: ${task.name}`
            : `${task.name} status changed from ${oldLabel} to ${newLabel}`,
          meta: {
            taskId: task._id,
            taskName: task.name,
            from: previousStatus,
            to: status,
          },
        });
      }

      // Log activity for progress changes
      if (progressChanged) {
        const oldLabel = PROGRESS_LABELS[previousProgress];
        const newLabel = PROGRESS_LABELS[progress];
        const noteText = task.progressNote ? ` (${task.progressNote})` : "";

        let message;
        if (progress === "NONE") {
          message = `${task.name}: progress cleared`;
        } else if (!oldLabel || previousProgress === "NONE") {
          message = `${task.name}: ${newLabel}${noteText}`;
        } else {
          message = `${task.name}: ${oldLabel} → ${newLabel}${noteText}`;
        }

        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_PROGRESS_UPDATED",
          message,
          meta: {
            taskId: task._id,
            taskName: task.name,
            from: previousProgress,
            to: progress,
            progressNote: task.progressNote,
          },
        });
      }

      // Log activity for name changes
      if (nameChanged) {
        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_UPDATED",
          message: `Task renamed to: ${task.name}`,
          meta: { taskId: task._id, taskName: task.name },
        });
      }

      return res.status(200).json(task.toJSON());
    }

    if (req.method === "DELETE") {
      // Log activity for task deletion
      const actor = await User.findById(userId).lean();
      const actorName = actor?.name || user?.name || user?.email || "System";

      await VehicleActivity.log({
        dealerId,
        vehicleId: task.vehicleId,
        actorId: userId,
        actorName,
        type: "TASK_DELETED",
        message: `Removed task: ${task.name}`,
        meta: { taskId: task._id, taskName: task.name },
      });

      await VehicleTask.findByIdAndDelete(taskId);
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export default withDealerContext(handler);
