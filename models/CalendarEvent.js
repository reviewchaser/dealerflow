import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const calendarEventSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    title: { type: String, required: true },
    description: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarCategory" },
    startDatetime: { type: Date, required: true },
    endDatetime: { type: Date, required: true },
    location: { type: String },
    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    linkedContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    linkedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    linkedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    linkedAftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" },
    linkedHolidayRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "HolidayRequest" },
  },
  { timestamps: true }
);

calendarEventSchema.plugin(toJSON);
export default mongoose.models.CalendarEvent || mongoose.model("CalendarEvent", calendarEventSchema);
