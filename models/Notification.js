import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const notificationSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // if null, show to all users in dealer
    type: {
      type: String,
      enum: ["VEHICLE_MOT_DUE", "VEHICLE_TAX_DUE", "VEHICLE_SERVICE_DUE", "COURTESY_DUE_BACK", "COURTESY_OVERDUE", "EVENT_STARTING_SOON", "TASK_OVERDUE", "OTHER"],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String },
    relatedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    relatedAftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" },
    relatedCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" },
    relatedCourtesyAllocationId: { type: mongoose.Schema.Types.ObjectId, ref: "CourtesyAllocation" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.plugin(toJSON);
export default mongoose.models?.Notification || mongoose.model("Notification", notificationSchema);
