import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleDocumentSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["v5", "service_history", "fault_codes", "other"],
      required: true
    },
    url: { type: String, required: true },
    uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

vehicleDocumentSchema.plugin(toJSON);
export default mongoose.models.VehicleDocument || mongoose.model("VehicleDocument", vehicleDocumentSchema);
