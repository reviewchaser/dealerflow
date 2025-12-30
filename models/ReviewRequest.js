import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const reviewRequestSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleSale" },
    channel: { 
      type: String, 
      enum: ["email", "sms", "whatsapp"],
      default: "email"
    },
    status: { 
      type: String, 
      enum: ["sent", "opened", "responded", "expired"],
      default: "sent"
    },
    uniqueToken: { type: String, required: true, unique: true },
    sentAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

reviewRequestSchema.plugin(toJSON);
export default mongoose.models?.ReviewRequest || mongoose.model("ReviewRequest", reviewRequestSchema);
