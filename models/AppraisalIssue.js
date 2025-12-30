import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const appraisalIssueSchema = new mongoose.Schema(
  {
    appraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "Appraisal", required: true },
    category: {
      type: String,
      enum: ["mechanical", "electrical", "bodywork", "interior", "tyres", "mot", "service", "fault_codes", "other"],
      required: true
    },
    subcategory: { type: String },
    description: { type: String, required: true },
    photos: [{ type: String }], // URLs to photos
    actionNeeded: { type: String },
    estimatedCost: { type: Number }, // For appraisals, useful to estimate repair costs
    status: {
      type: String,
      enum: ["outstanding", "ordered", "in_progress", "resolved"],
      default: "outstanding"
    },
    notes: { type: String },
    // For fault codes specifically
    faultCodes: { type: String }, // e.g. "P0301, P0420"
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

appraisalIssueSchema.plugin(toJSON);
export default mongoose.models?.AppraisalIssue || mongoose.model("AppraisalIssue", appraisalIssueSchema);
