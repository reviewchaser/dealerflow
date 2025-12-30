import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleTaskTemplateGroupSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true },
    name: { type: String, required: true }, // e.g. "Default Prep", "Full Service Prep"
    note: { type: String }, // e.g. "PDI includes brake check, tyre check, fluids check"
  },
  { timestamps: true }
);

vehicleTaskTemplateGroupSchema.plugin(toJSON);
export default mongoose.models?.VehicleTaskTemplateGroup || mongoose.model("VehicleTaskTemplateGroup", vehicleTaskTemplateGroupSchema);
