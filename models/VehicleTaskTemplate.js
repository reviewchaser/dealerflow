import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleTaskTemplateSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleTaskTemplateGroup", required: true },
    name: { type: String, required: true }, // e.g. "PDI", "Valet", "Photos", "Delivery"
    order: { type: Number, default: 0 }, // for sorting
  },
  { timestamps: true }
);

vehicleTaskTemplateSchema.plugin(toJSON);
export default mongoose.models?.VehicleTaskTemplate || mongoose.model("VehicleTaskTemplate", vehicleTaskTemplateSchema);
