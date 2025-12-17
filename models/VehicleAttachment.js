import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleAttachmentSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    type: {
      type: String,
      enum: ["V5", "SERVICE_HISTORY", "FAULT_CODES", "OTHER"],
      required: true
    },
    url: { type: String, required: true },
    filename: { type: String },
  },
  { timestamps: true }
);

vehicleAttachmentSchema.plugin(toJSON);
export default mongoose.models.VehicleAttachment || mongoose.model("VehicleAttachment", vehicleAttachmentSchema);
