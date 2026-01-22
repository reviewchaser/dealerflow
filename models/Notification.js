import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const notificationSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // if null, show to all users in dealer
    type: {
      type: String,
      enum: ["VEHICLE_MOT_DUE", "VEHICLE_TAX_DUE", "VEHICLE_SERVICE_DUE", "COURTESY_DUE_BACK", "COURTESY_OVERDUE", "EVENT_STARTING_SOON", "TASK_OVERDUE", "ISSUE_ASSIGNED", "TASK_ASSIGNED", "CALENDAR_EVENT_ASSIGNED", "NEW_APPRAISAL", "CALENDAR_EVENT_CREATED", "NEW_AFTERCARE_CASE", "OTHER"],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String },
    relatedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    relatedIssueId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleIssue" },
    relatedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleTask" },
    relatedAftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" },
    relatedCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" },
    relatedCourtesyAllocationId: { type: mongoose.Schema.Types.ObjectId, ref: "CourtesyAllocation" },
    relatedAppraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "Appraisal" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.plugin(toJSON);

// Compound index for efficient notification queries
notificationSchema.index({ dealerId: 1, userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.models?.Notification || mongoose.model("Notification", notificationSchema);
