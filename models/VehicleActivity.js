import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const ACTIVITY_TYPES = [
  // Vehicle lifecycle
  "VEHICLE_CREATED",
  "STATUS_CHANGED",      // Kanban column move
  "LOCATION_CHANGED",
  "TYPE_CHANGED",        // STOCK -> COURTESY, FLEET_OTHER etc.
  "DETAILS_UPDATED",
  "NOTE_ADDED",
  "LABELS_UPDATED",
  // Task events
  "TASK_ADDED",
  "TASK_STATUS_UPDATED", // Pending -> In Progress -> Complete
  "TASK_COMPLETED",      // Specifically when marked complete
  "TASK_PROGRESS_UPDATED", // Parts ordering sub-status
  "TASK_UPDATED",        // Name/notes changed
  "TASK_DELETED",
  // Issue events
  "ISSUE_ADDED",
  "ISSUE_UPDATED",
  "ISSUE_DELETED",
  "ISSUE_RESOLVED",
  "ISSUE_COMMENT_ADDED",
  // Document events
  "DOC_UPLOADED",
  "DOC_DELETED",
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
