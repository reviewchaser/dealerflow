import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const holidayRequestSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String }, // cached for display (full name)
    userEmail: { type: String }, // cached for fallback display
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDaysRequested: { type: Number }, // user-entered days
    totalDaysComputed: { type: Number }, // server-computed days (inclusive)
    totalDays: { type: Number }, // legacy field - kept for backwards compat
    type: {
      type: String,
      enum: ["Holiday", "Sick", "Unpaid", "Other"], // Unpaid kept for legacy, removed from UI
      default: "Holiday"
    },
    notes: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedByName: { type: String },
    reviewedAt: { type: Date },
    adminNote: { type: String },
    linkedCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" },
  },
  { timestamps: true }
);

// Index for efficient queries
holidayRequestSchema.index({ dealerId: 1, status: 1 });
holidayRequestSchema.index({ dealerId: 1, userId: 1 });

holidayRequestSchema.plugin(toJSON);
export default mongoose.models.HolidayRequest || mongoose.model("HolidayRequest", holidayRequestSchema);
