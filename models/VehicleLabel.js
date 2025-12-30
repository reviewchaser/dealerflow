import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleLabelSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    name: { type: String, required: true }, // e.g. "MOT Expired", "High priority fault", "Off-site"
    colour: { type: String, default: "#6366f1" }, // hex colour
  },
  { timestamps: true }
);

vehicleLabelSchema.plugin(toJSON);
export default mongoose.models?.VehicleLabel || mongoose.model("VehicleLabel", vehicleLabelSchema);
