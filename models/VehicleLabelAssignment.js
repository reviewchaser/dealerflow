import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleLabelAssignmentSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    vehicleLabelId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleLabel", required: true },
  },
  { timestamps: true }
);

vehicleLabelAssignmentSchema.plugin(toJSON);
export default mongoose.models?.VehicleLabelAssignment || mongoose.model("VehicleLabelAssignment", vehicleLabelAssignmentSchema);
