import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const ACTIVITY_TYPES = [
  "VEHICLE_CREATED",
  "STATUS_CHANGED",
  "LOCATION_CHANGED",
  "ISSUE_ADDED",
  "ISSUE_UPDATED",
  "ISSUE_DELETED",
  "ISSUE_RESOLVED",
  "TASK_COMPLETED",
  "TASK_ADDED",
  "TASK_UPDATED",
  "DOC_UPLOADED",
  "DOC_DELETED",
  "LABELS_UPDATED",
  "DETAILS_UPDATED",
  "NOTE_ADDED",
];

const vehicleActivitySchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: {
      type: String, // Cached for display
    },
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed, // Additional context data
    },
  },
  { timestamps: true }
);

// Index for efficient queries
vehicleActivitySchema.index({ vehicleId: 1, createdAt: -1 });
vehicleActivitySchema.index({ dealerId: 1, createdAt: -1 });

vehicleActivitySchema.plugin(toJSON);

// Static helper to log activity
vehicleActivitySchema.statics.log = async function ({
  dealerId,
  vehicleId,
  actorId,
  actorName,
  type,
  message,
  meta = null,
}) {
  return this.create({
    dealerId,
    vehicleId,
    actorId,
    actorName,
    type,
    message,
    meta,
  });
};

export default mongoose.models.VehicleActivity ||
  mongoose.model("VehicleActivity", vehicleActivitySchema);

export { ACTIVITY_TYPES };
