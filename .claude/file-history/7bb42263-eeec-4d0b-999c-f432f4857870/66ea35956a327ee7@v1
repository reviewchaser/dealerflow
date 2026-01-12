import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const vehicleIssueSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    category: {
      type: String,
      enum: ["Cosmetic", "Mechanical", "Electrical", "Other"],
      required: true
    },
    subcategory: { type: String, required: true },
    description: { type: String, required: true },
    photos: [{ type: String }], // Legacy: simple URLs to photos
    attachments: [{
      key: { type: String },      // S3 key
      url: { type: String },      // Full URL
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: Date.now },
      caption: { type: String },  // Optional caption/description
    }],
    actionNeeded: { type: String },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    location: { type: String }, // e.g. "Front Left", "Rear Bumper", "Interior Dashboard"
    status: {
      type: String,
      enum: ["Outstanding", "Ordered", "In Progress", "Complete"],
      default: "Outstanding"
    },
    notes: { type: String },
    updates: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: { type: String }, // Cache user name for display
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    completedAt: { type: Date },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Source tracking for PDI automation (idempotency - prevents duplicate issues on re-save)
    sourceSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    // Field key for checklist-driven issues (e.g. "pdi:road_test:gear_change") - enables per-field deduplication
    sourceFieldKey: { type: String },
    // Parts tracking
    partsRequired: { type: Boolean, default: false },
    partsDetails: { type: String }, // supplier, part no, ordered by, ETA
  },
  { timestamps: true }
);

vehicleIssueSchema.plugin(toJSON);
export default mongoose.models.VehicleIssue || mongoose.model("VehicleIssue", vehicleIssueSchema);
