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
    // Deal tracking - links issue to originating deal (for cancelled deal indicators)
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
    dealNumber: { type: String }, // e.g., "D00043" - formatted deal reference for display
    // Parts tracking
    partsRequired: { type: Boolean, default: false },
    partsDetails: { type: String }, // supplier, part no, ordered by, ETA (legacy)
    // New structured parts tracking
    partsOrdered: { type: Boolean, default: false },
    partsOrderedAt: { type: Date },
    partsOrderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    partsSupplier: { type: String }, // e.g. "Euro Car Parts", "TPS"
    partsNotes: { type: String }, // Order ref, ETA, any notes
    partsReceived: { type: Boolean, default: false },
    partsReceivedAt: { type: Date },
    partsReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

vehicleIssueSchema.plugin(toJSON);

// Indexes for issue queries - vehicleId is queried frequently
vehicleIssueSchema.index({ vehicleId: 1 });
vehicleIssueSchema.index({ vehicleId: 1, status: 1 });
vehicleIssueSchema.index({ sourceSubmissionId: 1 });

export default mongoose.models?.VehicleIssue || mongoose.model("VehicleIssue", vehicleIssueSchema);
