import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import VehicleLabel from "@/models/VehicleLabel";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";
import { logLabelsUpdated } from "@/libs/activityLogger";

async function handler(req, res, ctx) {
  try {
    await connectMongo();
    const { dealerId, userId, user } = ctx;
    const { id, labelId } = req.query;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Verify vehicle belongs to this dealer
    const vehicle = await Vehicle.findOne({ _id: id, dealerId });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    // Verify label exists
    const label = await VehicleLabel.findById(labelId);
    if (!label) return res.status(404).json({ error: "Label not found" });

    // Initialize labels array if it doesn't exist
    if (!vehicle.labels) vehicle.labels = [];

    // Toggle label - remove if exists, add if not
    const labelIndex = vehicle.labels.findIndex(
      (l) => l.toString() === labelId
    );

    let action;
    if (labelIndex > -1) {
      // Remove label
      vehicle.labels.splice(labelIndex, 1);
      action = "removed";
    } else {
      // Add label
      vehicle.labels.push(labelId);
      action = "added";
    }

    await vehicle.save();

    // Get actor name for activity logging
    const actor = await User.findById(userId).lean();
    const actorName = actor?.name || user?.name || user?.email || "System";

    // Log to ActivityLog for dashboard feed
    await logLabelsUpdated({
      dealerId,
      vehicleId: id,
      vehicleReg: vehicle.regCurrent,
      vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
      action,
      labelName: label.name,
      userId,
      userName: actorName,
    });

    // Return updated vehicle with populated labels
    const updatedVehicle = await Vehicle.findById(id).populate("labels").lean();

    // Transform labels to have id instead of _id
    const transformedLabels = (updatedVehicle.labels || []).map(l => ({
      id: l._id.toString(),
      name: l.name,
      colour: l.colour,
    }));

    return res.status(200).json({
      labels: transformedLabels,
    });
  } catch (error) {
    console.error("Error toggling vehicle label:", error);
    return res.status(500).json({ error: error.message });
  }
}

export default withDealerContext(handler);
