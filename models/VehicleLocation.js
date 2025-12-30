import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleLocationSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    name: { type: String, required: true }, // e.g. "Forecourt", "Workshop", "Off-site @ ABC Garage"
    type: { 
      type: String, 
      enum: ["onsite", "offsite"],
      default: "onsite"
    },
    address: { type: String },
  },
  { timestamps: true }
);

vehicleLocationSchema.plugin(toJSON);
export default mongoose.models?.VehicleLocation || mongoose.model("VehicleLocation", vehicleLocationSchema);
