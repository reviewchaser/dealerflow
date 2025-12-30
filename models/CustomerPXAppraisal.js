import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const customerPXAppraisalSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" }, // customer
    // Customer info (for public submissions without contact)
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    // Vehicle info
    vehicleReg: { type: String, required: true, uppercase: true },
    vehicleMake: { type: String },
    vehicleModel: { type: String },
    vehicleYear: { type: Number },
    mileage: { type: Number },
    colour: { type: String },
    fuelType: { type: String },
    motExpiryDate: { type: Date }, // MOT expiry - transferred to vehicle on conversion
    conditionNotes: { type: String },
    // Match dealer appraisal fields
    proposedPurchasePrice: { type: Number },
    outstandingFinanceAmount: { type: Number },
    // Document URLs
    v5Url: { type: String },
    serviceHistoryUrl: { type: String },
    otherDocuments: [{
      name: { type: String },
      url: { type: String }
    }],
    // Vehicle photos
    photos: {
      exterior: [{ type: String }],  // Multiple exterior photos
      interior: [{ type: String }],  // Multiple interior photos
      dashboard: { type: String },   // Single dashboard photo
      odometer: { type: String },    // Single odometer photo
    },
    // Legacy fields
    conditionRating: {
      type: String,
      enum: ["excellent", "good", "fair", "poor"]
    },
    // Prep checklist template to use when converting to stock
    prepTemplateId: { type: String },
    // Decision workflow (same as dealer appraisal)
    decision: {
      type: String,
      enum: ["pending", "reviewed", "converted", "declined"],
      default: "pending"
    },
    decidedAt: { type: Date },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }, // if converted
    formSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    aiHintText: { type: String }, // cached AI common faults
    interestedInVehicle: { type: String }, // which vehicle customer is interested in
  },
  { timestamps: true }
);

customerPXAppraisalSchema.plugin(toJSON);

// Indexes for dashboard and PX queries
customerPXAppraisalSchema.index({ dealerId: 1, decision: 1 });
customerPXAppraisalSchema.index({ dealerId: 1, createdAt: -1 });

// Use existing model or create new one (prevents OverwriteModelError in dev)
export default mongoose.models?.CustomerPXAppraisal || mongoose.model("CustomerPXAppraisal", customerPXAppraisalSchema);
