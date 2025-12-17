import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const customerPXIssueSchema = new mongoose.Schema(
  {
    customerPXAppraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerPXAppraisal", required: true },
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

customerPXIssueSchema.plugin(toJSON);

// Delete cached model to force schema update
if (mongoose.models.CustomerPXIssue) {
  delete mongoose.models.CustomerPXIssue;
}

export default mongoose.model("CustomerPXIssue", customerPXIssueSchema);
