import connectMongo from "@/libs/mongoose";
import VehicleTask, { TASK_PROGRESS, PARTS_STATUS, SUPPLIER_TYPE, SUPPLIER_TYPE_LABELS } from "@/models/VehicleTask";
import Vehicle from "@/models/Vehicle";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";
import { logTaskPartsOrdered, logTaskPartsReceived, logTaskCompleted } from "@/libs/activityLogger";

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

// Human-readable labels for progress (legacy)
const PROGRESS_LABELS = {
  NONE: null,
  PARTS_ORDERED: "Parts Ordered",
  AWAITING_PARTS: "Awaiting Parts",
  BOOKED_IN: "Booked In",
  IN_WORKSHOP: "In Workshop",
};

// Human-readable labels for parts status
const PARTS_STATUS_LABELS = {
  NONE: null,
  ORDERED: "Ordered",
  AWAITING_DELIVERY: "Awaiting Delivery",
  RECEIVED: "Received",
  NOT_REQUIRED: "Not Required",
};

// Get supplier display name
function getSupplierDisplayName(supplierType, supplierName) {
  if (supplierType === "OTHER" && supplierName) {
    return supplierName;
  }
  return SUPPLIER_TYPE_LABELS[supplierType] || supplierType;
}

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

      // Handle parts status changes
      const { partsStatus, addPartsOrder, updatePartsOrder, removePartsOrderId } = req.body;
      const previousPartsStatus = task.partsStatus || "NONE";
      let partsStatusChanged = false;
      let partsOrderAdded = null;
      let partsOrderUpdated = null;
      let partsOrderRemoved = null;

      if (partsStatus !== undefined && partsStatus !== previousPartsStatus) {
        task.partsStatus = partsStatus;
        partsStatusChanged = true;
      }

      // Add a new parts order
      if (addPartsOrder) {
        const newOrder = {
          supplierType: addPartsOrder.supplierType,
          supplierName: addPartsOrder.supplierName || null,
          orderRef: addPartsOrder.orderRef || null,
          orderedAt: addPartsOrder.orderedAt || new Date(),
          expectedAt: addPartsOrder.expectedAt || null,
          notes: addPartsOrder.notes || null,
          status: addPartsOrder.status || PARTS_STATUS.ORDERED,
          createdByUserId: userId,
        };
        task.partsOrders.push(newOrder);
        partsOrderAdded = newOrder;

        // Auto-update partsStatus if it was NONE
        if (task.partsStatus === "NONE" || !task.partsStatus) {
          task.partsStatus = PARTS_STATUS.ORDERED;
          if (previousPartsStatus === "NONE" || !previousPartsStatus) {
            partsStatusChanged = true;
          }
        }
      }

      // Update an existing parts order
      if (updatePartsOrder && updatePartsOrder.orderId) {
        const orderIndex = task.partsOrders.findIndex(
          (o) => o._id.toString() === updatePartsOrder.orderId
        );
        if (orderIndex !== -1) {
          const existingOrder = task.partsOrders[orderIndex];
          partsOrderUpdated = { before: { ...existingOrder.toObject() }, after: {} };

          if (updatePartsOrder.supplierType !== undefined) {
            existingOrder.supplierType = updatePartsOrder.supplierType;
          }
          if (updatePartsOrder.supplierName !== undefined) {
            existingOrder.supplierName = updatePartsOrder.supplierName;
          }
          if (updatePartsOrder.orderRef !== undefined) {
            existingOrder.orderRef = updatePartsOrder.orderRef;
          }
          if (updatePartsOrder.expectedAt !== undefined) {
            existingOrder.expectedAt = updatePartsOrder.expectedAt;
          }
          if (updatePartsOrder.receivedAt !== undefined) {
            existingOrder.receivedAt = updatePartsOrder.receivedAt;
          }
          if (updatePartsOrder.notes !== undefined) {
            existingOrder.notes = updatePartsOrder.notes;
          }
          if (updatePartsOrder.status !== undefined) {
            existingOrder.status = updatePartsOrder.status;
          }

          partsOrderUpdated.after = existingOrder.toObject();
        }
      }

      // Remove a parts order
      if (removePartsOrderId) {
        const orderIndex = task.partsOrders.findIndex(
          (o) => o._id.toString() === removePartsOrderId
        );
        if (orderIndex !== -1) {
          partsOrderRemoved = task.partsOrders[orderIndex].toObject();
          task.partsOrders.splice(orderIndex, 1);

          // Auto-update partsStatus if no orders left
          if (task.partsOrders.length === 0 && task.partsStatus !== "NOT_REQUIRED") {
            task.partsStatus = PARTS_STATUS.NONE;
          }
        }
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

        // Also log task completion to ActivityLog for dashboard feed
        if (isCompleted) {
          await logTaskCompleted({
            dealerId,
            taskId: task._id,
            vehicleId: task.vehicleId,
            vehicleReg: vehicle.regCurrent,
            vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
            taskName: task.name,
            userId,
            userName: actorName,
          });
        }
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

      // Log activity for parts status changes
      if (partsStatusChanged) {
        const oldLabel = PARTS_STATUS_LABELS[previousPartsStatus] || previousPartsStatus;
        const newLabel = PARTS_STATUS_LABELS[task.partsStatus] || task.partsStatus;

        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_PARTS_STATUS_CHANGED",
          message: oldLabel
            ? `${task.name}: Parts status ${oldLabel} → ${newLabel}`
            : `${task.name}: Parts status set to ${newLabel}`,
          meta: {
            taskId: task._id,
            taskName: task.name,
            from: previousPartsStatus,
            to: task.partsStatus,
          },
        });
      }

      // Log activity for parts order added
      if (partsOrderAdded) {
        const supplierDisplay = getSupplierDisplayName(
          partsOrderAdded.supplierType,
          partsOrderAdded.supplierName
        );

        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_PARTS_ORDER_ADDED",
          message: `${task.name}: Parts ordered from ${supplierDisplay}${partsOrderAdded.orderRef ? ` (Ref: ${partsOrderAdded.orderRef})` : ""}`,
          meta: {
            taskId: task._id,
            taskName: task.name,
            order: partsOrderAdded,
          },
        });

        // Also log to ActivityLog for dashboard feed
        await logTaskPartsOrdered({
          dealerId,
          taskId: task._id,
          vehicleId: task.vehicleId,
          vehicleReg: vehicle.regCurrent,
          vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
          taskName: task.name,
          supplier: supplierDisplay,
          userId,
          userName: actorName,
        });
      }

      // Log activity for parts order updated
      if (partsOrderUpdated) {
        const supplierDisplay = getSupplierDisplayName(
          partsOrderUpdated.after.supplierType,
          partsOrderUpdated.after.supplierName
        );

        let message = `${task.name}: Parts order from ${supplierDisplay} updated`;
        // Add specific change details if status changed
        if (partsOrderUpdated.before.status !== partsOrderUpdated.after.status) {
          const oldStatus = PARTS_STATUS_LABELS[partsOrderUpdated.before.status] || partsOrderUpdated.before.status;
          const newStatus = PARTS_STATUS_LABELS[partsOrderUpdated.after.status] || partsOrderUpdated.after.status;
          message = `${task.name}: Parts from ${supplierDisplay} - ${oldStatus} → ${newStatus}`;
        }

        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_PARTS_ORDER_UPDATED",
          message,
          meta: {
            taskId: task._id,
            taskName: task.name,
            before: partsOrderUpdated.before,
            after: partsOrderUpdated.after,
          },
        });

        // Log to ActivityLog when parts are received (for dashboard feed)
        if (partsOrderUpdated.after.status === "RECEIVED" && partsOrderUpdated.before.status !== "RECEIVED") {
          await logTaskPartsReceived({
            dealerId,
            taskId: task._id,
            vehicleId: task.vehicleId,
            vehicleReg: vehicle.regCurrent,
            vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
            taskName: task.name,
            userId,
            userName: actorName,
          });
        }
      }

      // Log activity for parts order removed
      if (partsOrderRemoved) {
        const supplierDisplay = getSupplierDisplayName(
          partsOrderRemoved.supplierType,
          partsOrderRemoved.supplierName
        );

        await VehicleActivity.log({
          dealerId,
          vehicleId: task.vehicleId,
          actorId: userId,
          actorName,
          type: "TASK_PARTS_ORDER_REMOVED",
          message: `${task.name}: Parts order from ${supplierDisplay} removed`,
          meta: {
            taskId: task._id,
            taskName: task.name,
            order: partsOrderRemoved,
          },
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
