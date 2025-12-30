import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// JobSheetShareLink - Secure tokenized links for sharing job sheets with third-party mechanics
// Security: Raw token is NEVER stored. Only SHA256 hash is kept in DB.

const jobSheetShareLinkSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true }, // SHA256 hash of raw token
    type: {
      type: String,
      enum: ["STOCK", "WARRANTY"],
      required: true
    }, // Which board the job sheet is from
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }, // For STOCK type
    aftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" }, // For WARRANTY type
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },
    expiresAt: { type: Date }, // Default 60 days from creation
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
  },
  { timestamps: true }
);

jobSheetShareLinkSchema.plugin(toJSON);
export default mongoose.models?.JobSheetShareLink || mongoose.model("JobSheetShareLink", jobSheetShareLinkSchema);
