import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const appraisalSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: false, default: null },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: false, default: null }, // seller (optional)
    vehicleReg: { type: String, required: true, uppercase: true },
    vehicleMake: { type: String },
    vehicleModel: { type: String },
    vehicleYear: { type: Number },
    mileage: { type: Number },
    colour: { type: String },
    fuelType: { type: String },
    conditionNotes: { type: String },
    proposedPurchasePrice: { type: Number },
    // Document URLs
    v5Url: { type: String },
    serviceHistoryUrl: { type: String },
    otherDocuments: [{
      name: { type: String },
      url: { type: String }
    }],
    // Legacy fields - kept for backwards compatibility
    damagePhotos: [{ type: String }],
    faultCodePhotos: [{ type: String }],
    // Prep checklist template to use when converting to stock
    prepTemplateId: { type: String },
    decision: {
      type: String,
      enum: ["pending", "reviewed", "converted", "declined"],
      default: "pending"
    },
    decidedAt: { type: Date },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }, // if converted
    formSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    shareLinkId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalShareLink" }, // if submitted via share link
    aiHintText: { type: String }, // cached AI common faults
    // Contact info captured during submission (if no contact exists)
    submitterName: { type: String },
    submitterEmail: { type: String },
    submitterPhone: { type: String },
    // Share link for viewing this specific appraisal
    shareTokenHash: { type: String, index: true }, // SHA256 hash of share token
    shareExpiresAt: { type: Date },
    shareCreatedAt: { type: Date },
    // Audit fields
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

appraisalSchema.plugin(toJSON);

// Delete cached model to force schema update
if (mongoose.models.Appraisal) {
  delete mongoose.models.Appraisal;
}

export default mongoose.model("Appraisal", appraisalSchema);
