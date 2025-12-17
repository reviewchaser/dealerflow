import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleTaskSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    name: { type: String, required: true }, // e.g. "PDI", "Valet", "Oil service", "MOT", "Photos", "Delivery"
    status: {
      type: String,
      enum: ["pending", "in_progress", "done", "not_required", "PENDING", "IN_PROGRESS", "DONE", "NOT_REQUIRED"],
      default: "pending"
    },
    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    source: {
      type: String,
      enum: ["template", "manual", "from_form", "ai_hint", "system_default", "TEMPLATE", "MANUAL", "FROM_FORM", "AI_HINT", "SYSTEM_DEFAULT"],
      default: "manual"
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

vehicleTaskSchema.plugin(toJSON);
export default mongoose.models.VehicleTask || mongoose.model("VehicleTask", vehicleTaskSchema);
