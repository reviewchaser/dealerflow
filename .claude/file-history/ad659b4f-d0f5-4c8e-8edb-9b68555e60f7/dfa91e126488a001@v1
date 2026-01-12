import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const saleSchema = new mongoose.Schema(
  {
    vehicleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vehicle", 
      required: true 
    },
    buyerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Contact", 
      required: true 
    },
    salePrice: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    paymentMethod: { 
      type: String, 
      enum: ["cash", "finance", "bank_transfer", "card"], 
      default: "cash" 
    },
    status: { 
      type: String, 
      enum: ["pending", "deposit_paid", "completed", "cancelled"], 
      default: "pending" 
    },
    deliveryDate: { type: Date },
    deliveredAt: { type: Date },
    warrantyMonths: { type: Number, default: 3 },
    notes: { type: String },
    reviewRequested: { type: Boolean, default: false },
    reviewRequestedAt: { type: Date },
    // Audit fields
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

saleSchema.plugin(toJSON);

export default mongoose.models.Sale || mongoose.model("Sale", saleSchema);
