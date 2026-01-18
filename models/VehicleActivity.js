import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const ACTIVITY_TYPES = [
  // Vehicle lifecycle
  "VEHICLE_CREATED",
  "VEHICLE_UPDATED",     // Meaningful field changes
  "STATUS_CHANGED",      // Kanban column move (VEHICLE_STAGE_MOVED)
  "ADDED_TO_PREP_BOARD", // Vehicle added to prep board from stock book
  "LOCATION_CHANGED",
  "TYPE_CHANGED",        // STOCK -> COURTESY, FLEET_OTHER etc. (VEHICLE_TYPE_SET)
  "DETAILS_UPDATED",
  "NOTE_ADDED",
  "LABELS_UPDATED",
  // Task events
  "TASK_ADDED",
  "TASK_REMOVED",
  "TASK_STATUS_UPDATED", // Pending -> In Progress -> Complete (TASK_STATUS_CHANGED)
  "TASK_COMPLETED",      // Specifically when marked complete
  "TASK_PROGRESS_UPDATED", // Legacy progress sub-status
  "TASK_UPDATED",        // Name/notes changed
  "TASK_DELETED",
  // Parts ordering events
  "TASK_PARTS_STATUS_CHANGED", // Overall parts status changed
  "TASK_PARTS_ORDER_ADDED",    // New parts order created
  "TASK_PARTS_ORDER_UPDATED",  // Parts order updated (status, expected date, etc.)
  "TASK_PARTS_ORDER_REMOVED",  // Parts order removed
  // Issue events
  "ISSUE_ADDED",         // ISSUE_CREATED
  "ISSUE_UPDATED",
  "ISSUE_DELETED",
  "ISSUE_RESOLVED",
  "ISSUE_REOPENED",
  "ISSUE_COMMENT_ADDED",
  // Document events
  "DOC_UPLOADED",        // DOCUMENT_UPLOADED
  "DOC_DELETED",         // DOCUMENT_DELETED
  // Export/Share events
  "PDF_EXPORTED",
  "CARD_SHARED",         // WhatsApp/email share
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

export default mongoose.models?.VehicleActivity ||
  mongoose.model("VehicleActivity", vehicleActivitySchema);

export { ACTIVITY_TYPES };
