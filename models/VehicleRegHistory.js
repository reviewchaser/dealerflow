import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleRegHistorySchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    reg: { type: String, required: true, uppercase: true },
    fromDate: { type: Date },
    toDate: { type: Date },
  },
  { timestamps: true }
);

vehicleRegHistorySchema.plugin(toJSON);
export default mongoose.models.VehicleRegHistory || mongoose.model("VehicleRegHistory", vehicleRegHistorySchema);
