import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const prepSummaryShareLinkSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

prepSummaryShareLinkSchema.plugin(toJSON);

export default mongoose.models.PrepSummaryShareLink ||
  mongoose.model("PrepSummaryShareLink", prepSummaryShareLinkSchema);
