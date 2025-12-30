import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const calendarCategorySchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    name: { type: String, required: true }, // Handover, Test Drive, Warranty Inspection, etc.
    colour: { type: String, default: "#3b82f6" }, // hex colour
  },
  { timestamps: true }
);

calendarCategorySchema.plugin(toJSON);
export default mongoose.models?.CalendarCategory || mongoose.model("CalendarCategory", calendarCategorySchema);
