import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleSaleSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    buyerContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
    saleDate: { type: Date, required: true },
    warrantyType: { 
      type: String, 
      enum: ["in_house", "third_party", "none"],
      default: "in_house"
    },
    warrantyProvider: { type: String },
    warrantyExpiryDate: { type: Date },
    invoiceNumber: { type: String },
  },
  { timestamps: true }
);

vehicleSaleSchema.plugin(toJSON);
export default mongoose.models?.VehicleSale || mongoose.model("VehicleSale", vehicleSaleSchema);
