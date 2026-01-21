import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleLabelAssignment from "@/models/VehicleLabelAssignment";
import VehicleIssue from "@/models/VehicleIssue";
import VehicleDocument from "@/models/VehicleDocument";
import VehicleLocation from "@/models/VehicleLocation";
import VehicleActivity from "@/models/VehicleActivity";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";
import { logVehicleLocationChange, logVehicleStatusChange } from "@/libs/activityLogger";

// Default prep tasks - same as in index.js
const DEFAULT_TASKS = ["PDI", "Valet", "Oil Service Check", "Photos", "Advert"];

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method === "GET") {
    // Ensure vehicle belongs to this dealer
    const vehicle = await Vehicle.findOne({ _id: id, dealerId }).populate("locationId").lean();
    if (!vehicle) return res.status(404).json({ error: "Not found" });

    // Transform _id to id for the main vehicle
    vehicle.id = vehicle._id.toString();
    delete vehicle._id;

    // Get and transform related data
    const tasks = await VehicleTask.find({ vehicleId: id }).sort({ createdAt: 1 }).lean();
    const labels = await VehicleLabelAssignment.find({ vehicleId: id })
      .populate("vehicleLabelId").lean();
    const issues = await VehicleIssue.find({ vehicleId: id }).sort({ createdAt: -1 }).lean();
    const documents = await VehicleDocument.find({ vehicleId: id }).sort({ createdAt: -1 }).lean();

    // Transform _id to id for all related items
    vehicle.tasks = tasks.map(t => ({ ...t, id: t._id.toString(), _id: undefined }));
    vehicle.labels = labels.map(l => ({ ...l, id: l._id.toString(), _id: undefined }));
    vehicle.issues = issues.map(i => ({ ...i, id: i._id.toString(), _id: undefined }));
    vehicle.documents = documents.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));

    return res.status(200).json(vehicle);
  }

  if (req.method === "PUT") {
    const { userId, user } = ctx;

    // Get existing vehicle for change detection
    const existingVehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
    if (!existingVehicle) return res.status(404).json({ error: "Not found" });

    // Build update object
    const updateData = { ...req.body };

    // Check if trying to add to prep board when already there
    // Allow re-adding delivered vehicles (for resale scenarios)
    // Check !== false to match prep board filter logic (includes undefined/null)
    const isAddingToPrepBoard = updateData.showOnPrepBoard === true && existingVehicle.showOnPrepBoard === false;
    if (updateData.showOnPrepBoard === true && existingVehicle.showOnPrepBoard !== false && existingVehicle.status !== "delivered") {
      return res.status(400).json({ error: "Vehicle is already on the Prep Board" });
    }

    // If status is changing to "sold" or "live" (Sold In Progress), set soldAt timestamp
    if (updateData.status === "live" || updateData.status === "reserved" || updateData.status === "delivered") {
      if (!["live", "reserved", "delivered"].includes(existingVehicle.status) && !existingVehicle.soldAt) {
        updateData.soldAt = new Date();
      }
    }
    // If status changes away from sold statuses, clear soldAt
    if (updateData.status && !["live", "reserved", "delivered"].includes(updateData.status)) {
      updateData.soldAt = null;
    }

    // Ensure vehicle belongs to this dealer
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: id, dealerId },
      updateData,
      { new: true }
    ).populate("locationId").lean();
    if (!vehicle) return res.status(404).json({ error: "Not found" });

    // Get actor name for activity log
    const actor = await User.findById(userId).lean();
    const actorName = actor?.name || user?.name || user?.email || "System";

    // Log activity for status changes
    if (updateData.status && updateData.status !== existingVehicle.status) {
      const statusLabels = {
        in_stock: "In Prep",
        in_prep: "Advertised",
        live: "Sold In Progress",
        reserved: "Completed",
        delivered: "Delivered",
      };
      const oldLabel = statusLabels[existingVehicle.status] || existingVehicle.status;
      const newLabel = statusLabels[updateData.status] || updateData.status;

      await VehicleActivity.log({
        dealerId,
        vehicleId: id,
        actorId: userId,
        actorName,
        type: "STATUS_CHANGED",
        message: `Status changed from ${oldLabel} to ${newLabel}`,
        meta: { from: existingVehicle.status, to: updateData.status },
      });

      // Also log to dealer-wide ActivityLog for dashboard feed
      logVehicleStatusChange({
        dealerId,
        vehicleId: id,
        vehicleReg: vehicle.regCurrent,
        vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
        previousStatus: existingVehicle.status,
        newStatus: updateData.status,
        userId,
        userName: actorName,
      });
    }

    // Log activity for location changes
    if (updateData.locationId !== undefined) {
      const oldLocationId = existingVehicle.locationId?.toString() || existingVehicle.locationId;
      const newLocationId = updateData.locationId?.toString() || updateData.locationId;

      if (oldLocationId !== newLocationId) {
        let locationName = "On Site";
        let previousLocationName = "On Site";
        if (newLocationId) {
          const location = await VehicleLocation.findById(newLocationId).lean();
          locationName = location?.name || "Unknown Location";
        }
        if (oldLocationId) {
          const oldLocation = await VehicleLocation.findById(oldLocationId).lean();
          previousLocationName = oldLocation?.name || "On Site";
        }

        await VehicleActivity.log({
          dealerId,
          vehicleId: id,
          actorId: userId,
          actorName,
          type: "LOCATION_CHANGED",
          message: `Location changed to ${locationName}`,
          meta: { from: oldLocationId, to: newLocationId },
        });

        // Also log to dealer-wide ActivityLog for dashboard feed
        logVehicleLocationChange({
          dealerId,
          vehicleId: id,
          vehicleReg: vehicle.regCurrent,
          vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
          previousLocation: previousLocationName,
          newLocation: locationName,
          userId,
          userName: actorName,
        });
      }
    }

    // Log activity for type changes (STOCK -> COURTESY, etc.)
    if (updateData.type && updateData.type !== existingVehicle.type) {
      const typeLabels = {
        STOCK: "Stock",
        COURTESY: "Courtesy",
        FLEET_OTHER: "Fleet",
      };
      const oldLabel = typeLabels[existingVehicle.type] || existingVehicle.type;
      const newLabel = typeLabels[updateData.type] || updateData.type;

      await VehicleActivity.log({
        dealerId,
        vehicleId: id,
        actorId: userId,
        actorName,
        type: "TYPE_CHANGED",
        message: `Vehicle type changed from ${oldLabel} to ${newLabel}`,
        meta: { from: existingVehicle.type, to: updateData.type },
      });
    }

    // Log activity for detail changes (VIN, make, model, etc.)
    const detailFields = ["make", "model", "year", "colour", "vin", "regCurrent"];
    const changedDetails = detailFields.filter(
      (f) => updateData[f] !== undefined && updateData[f] !== existingVehicle[f]
    );
    if (changedDetails.length > 0) {
      await VehicleActivity.log({
        dealerId,
        vehicleId: id,
        actorId: userId,
        actorName,
        type: "DETAILS_UPDATED",
        message: `Updated ${changedDetails.join(", ")}`,
        meta: { fields: changedDetails },
      });
    }

    // Create default prep tasks when adding to prep board
    if (isAddingToPrepBoard) {
      // Check if vehicle already has tasks (shouldn't create duplicates)
      const existingTasks = await VehicleTask.countDocuments({ vehicleId: id });
      if (existingTasks === 0) {
        for (const taskName of DEFAULT_TASKS) {
          await VehicleTask.create({
            vehicleId: id,
            name: taskName,
            status: "pending",
            source: "system_default",
          });
        }
      }

      // Log activity for adding to prep board
      await VehicleActivity.log({
        dealerId,
        vehicleId: id,
        actorId: userId,
        actorName,
        type: "ADDED_TO_PREP_BOARD",
        message: `Added to Vehicle Prep board`,
        meta: {},
      });
    }

    return res.status(200).json(vehicle);
  }

  if (req.method === "DELETE") {
    // Ensure vehicle belongs to this dealer
    const vehicle = await Vehicle.findOne({ _id: id, dealerId });
    if (!vehicle) return res.status(404).json({ error: "Not found" });

    await VehicleTask.deleteMany({ vehicleId: id });
    await VehicleLabelAssignment.deleteMany({ vehicleId: id });
    await VehicleIssue.deleteMany({ vehicleId: id });
    await VehicleDocument.deleteMany({ vehicleId: id });
    await Vehicle.findByIdAndDelete(id);
    return res.status(200).json({ message: "Deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
