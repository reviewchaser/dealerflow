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

// Index for document queries by vehicle
vehicleDocumentSchema.index({ vehicleId: 1 });
vehicleDocumentSchema.index({ vehicleId: 1, type: 1 });

export default mongoose.models?.VehicleDocument || mongoose.model("VehicleDocument", vehicleDocumentSchema);
