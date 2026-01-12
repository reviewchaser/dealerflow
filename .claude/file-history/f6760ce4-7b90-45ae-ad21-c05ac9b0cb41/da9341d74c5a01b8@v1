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
    // AM/PM session support for half-days
    startSession: {
      type: String,
      enum: ["AM", "PM"],
      default: "AM"
    },
    endSession: {
      type: String,
      enum: ["AM", "PM"],
      default: "PM"
    },
    totalDaysRequested: { type: Number }, // legacy: user-entered days (no longer required)
    totalDaysComputed: { type: Number }, // server-computed days based on sessions
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
    // Legacy single event ID - kept for backwards compatibility
    linkedCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" },
    // Array of daily calendar event IDs (one per day in the range)
    linkedCalendarEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" }],
  },
  { timestamps: true }
);

// Index for efficient queries
holidayRequestSchema.index({ dealerId: 1, status: 1 });
holidayRequestSchema.index({ dealerId: 1, userId: 1 });

/**
 * Compute total days based on start/end dates and AM/PM sessions
 * Rules:
 * - Same day: AM→AM = 0.5, AM→PM = 1.0, PM→PM = 0.5, PM→AM = invalid
 * - Multi-day:
 *   - Start day: PM = 0.5, AM = 1.0
 *   - End day: AM = 0.5, PM = 1.0
 *   - Middle days: 1.0 each
 */
holidayRequestSchema.statics.computeTotalDays = function(startDate, endDate, startSession, endSession) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to midnight for day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // Calculate full days between
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((end - start) / msPerDay);

  if (daysDiff < 0) return null; // Invalid: end before start

  // Same day
  if (daysDiff === 0) {
    if (startSession === "PM" && endSession === "AM") {
      return null; // Invalid: PM→AM same day
    }
    if (startSession === "AM" && endSession === "PM") {
      return 1.0; // Full day
    }
    // AM→AM or PM→PM = half day
    return 0.5;
  }

  // Multi-day
  // Start day contribution
  const startDayValue = startSession === "PM" ? 0.5 : 1.0;
  // End day contribution
  const endDayValue = endSession === "AM" ? 0.5 : 1.0;
  // Middle days (full days)
  const middleDays = daysDiff - 1;

  return startDayValue + middleDays + endDayValue;
};

holidayRequestSchema.plugin(toJSON);
export default mongoose.models?.HolidayRequest || mongoose.model("HolidayRequest", holidayRequestSchema);
