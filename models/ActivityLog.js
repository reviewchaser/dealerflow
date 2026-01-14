import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * ActivityLog Model
 *
 * Tracks all significant events across the dealership for the activity feed.
 * This provides an audit trail and enables the dashboard activity feed.
 */

// Activity types and their categories
const ACTIVITY_TYPE = {
  // Vehicle activities
  VEHICLE_ADDED: "VEHICLE_ADDED",
  VEHICLE_STATUS_CHANGED: "VEHICLE_STATUS_CHANGED",
  VEHICLE_LOCATION_CHANGED: "VEHICLE_LOCATION_CHANGED",
  VEHICLE_UPDATED: "VEHICLE_UPDATED",

  // Issue activities
  ISSUE_CREATED: "ISSUE_CREATED",
  ISSUE_RESOLVED: "ISSUE_RESOLVED",
  ISSUE_UPDATED: "ISSUE_UPDATED",
  ISSUE_PARTS_ORDERED: "ISSUE_PARTS_ORDERED",
  ISSUE_PARTS_RECEIVED: "ISSUE_PARTS_RECEIVED",

  // Task activities
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_PARTS_ORDERED: "TASK_PARTS_ORDERED",
  TASK_PARTS_RECEIVED: "TASK_PARTS_RECEIVED",

  // Deal activities
  DEAL_CREATED: "DEAL_CREATED",
  DEPOSIT_TAKEN: "DEPOSIT_TAKEN",
  INVOICE_GENERATED: "INVOICE_GENERATED",
  VEHICLE_DELIVERED: "VEHICLE_DELIVERED",
  SALE_COMPLETED: "SALE_COMPLETED",

  // Appraisal activities
  APPRAISAL_CREATED: "APPRAISAL_CREATED",
  APPRAISAL_DECIDED: "APPRAISAL_DECIDED",

  // Aftercare activities
  AFTERCARE_CASE_CREATED: "AFTERCARE_CASE_CREATED",
  AFTERCARE_CASE_UPDATED: "AFTERCARE_CASE_UPDATED",
  AFTERCARE_CASE_CLOSED: "AFTERCARE_CASE_CLOSED",

  // Form activities
  FORM_SUBMITTED: "FORM_SUBMITTED",

  // Document activities
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",

  // Label activities
  LABELS_UPDATED: "LABELS_UPDATED",

  // General
  NOTE_ADDED: "NOTE_ADDED",
};

// Category mappings for filtering
const ACTIVITY_CATEGORY = {
  VEHICLE: ["VEHICLE_ADDED", "VEHICLE_STATUS_CHANGED", "VEHICLE_LOCATION_CHANGED", "VEHICLE_UPDATED"],
  ISSUE: ["ISSUE_CREATED", "ISSUE_RESOLVED", "ISSUE_UPDATED", "ISSUE_PARTS_ORDERED", "ISSUE_PARTS_RECEIVED"],
  TASK: ["TASK_COMPLETED", "TASK_CREATED", "TASK_UPDATED", "TASK_PARTS_ORDERED", "TASK_PARTS_RECEIVED"],
  DEAL: ["DEAL_CREATED", "DEPOSIT_TAKEN", "INVOICE_GENERATED", "VEHICLE_DELIVERED", "SALE_COMPLETED"],
  APPRAISAL: ["APPRAISAL_CREATED", "APPRAISAL_DECIDED"],
  AFTERCARE: ["AFTERCARE_CASE_CREATED", "AFTERCARE_CASE_UPDATED", "AFTERCARE_CASE_CLOSED"],
  FORM: ["FORM_SUBMITTED"],
  // Combined category for dashboard filters
  STOCK_PREP: [
    "VEHICLE_ADDED", "VEHICLE_STATUS_CHANGED", "VEHICLE_LOCATION_CHANGED",
    "TASK_COMPLETED", "TASK_CREATED", "TASK_PARTS_ORDERED", "TASK_PARTS_RECEIVED",
    "ISSUE_CREATED", "ISSUE_RESOLVED", "ISSUE_UPDATED", "ISSUE_PARTS_ORDERED", "ISSUE_PARTS_RECEIVED",
    "DOCUMENT_UPLOADED", "LABELS_UPDATED"
  ],
  SALES: ["DEAL_CREATED", "DEPOSIT_TAKEN", "INVOICE_GENERATED", "VEHICLE_DELIVERED", "SALE_COMPLETED"],
};

// Icon and color mappings for the UI
const ACTIVITY_CONFIG = {
  VEHICLE_ADDED: { icon: "car-plus", color: "blue" },
  VEHICLE_STATUS_CHANGED: { icon: "arrow-path", color: "purple" },
  VEHICLE_LOCATION_CHANGED: { icon: "map-pin", color: "cyan" },
  VEHICLE_UPDATED: { icon: "pencil", color: "slate" },
  ISSUE_CREATED: { icon: "exclamation-triangle", color: "red" },
  ISSUE_RESOLVED: { icon: "check-circle", color: "green" },
  ISSUE_UPDATED: { icon: "pencil-square", color: "amber" },
  ISSUE_PARTS_ORDERED: { icon: "cube", color: "blue" },
  ISSUE_PARTS_RECEIVED: { icon: "check-badge", color: "green" },
  TASK_COMPLETED: { icon: "check", color: "green" },
  TASK_CREATED: { icon: "clipboard-list", color: "blue" },
  TASK_UPDATED: { icon: "clipboard-check", color: "amber" },
  TASK_PARTS_ORDERED: { icon: "cube", color: "blue" },
  TASK_PARTS_RECEIVED: { icon: "check-badge", color: "green" },
  DEAL_CREATED: { icon: "document-plus", color: "blue" },
  DEPOSIT_TAKEN: { icon: "currency-pound", color: "green" },
  INVOICE_GENERATED: { icon: "document-text", color: "purple" },
  VEHICLE_DELIVERED: { icon: "truck", color: "cyan" },
  SALE_COMPLETED: { icon: "sparkles", color: "green" },
  APPRAISAL_CREATED: { icon: "clipboard-document", color: "blue" },
  APPRAISAL_DECIDED: { icon: "scale", color: "amber" },
  AFTERCARE_CASE_CREATED: { icon: "shield-exclamation", color: "orange" },
  AFTERCARE_CASE_UPDATED: { icon: "shield-check", color: "amber" },
  AFTERCARE_CASE_CLOSED: { icon: "check-badge", color: "green" },
  FORM_SUBMITTED: { icon: "document-check", color: "blue" },
  DOCUMENT_UPLOADED: { icon: "folder-arrow-up", color: "cyan" },
  LABELS_UPDATED: { icon: "tag", color: "purple" },
  NOTE_ADDED: { icon: "chat-bubble", color: "slate" },
};

const activityLogSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    // Activity type and description
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPE),
      required: true,
    },
    description: { type: String, required: true }, // Human-readable description

    // Actor (who performed the action)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String }, // Cached for display (in case user is deleted)

    // Related entities (polymorphic references)
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleReg: { type: String }, // Cached for quick display
    vehicleMakeModel: { type: String }, // Cached: "BMW 3 Series"

    issueId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleIssue" },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleTask" },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
    appraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "Appraisal" },
    aftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" },
    formSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },

    // Metadata (additional context specific to the activity type)
    metadata: {
      // For status changes
      previousValue: { type: String },
      newValue: { type: String },

      // For location changes
      previousLocation: { type: String },
      newLocation: { type: String },

      // For issues
      issueCategory: { type: String },
      issuePriority: { type: String },

      // For tasks
      taskName: { type: String },

      // For deals
      amount: { type: Number },
      customerName: { type: String },

      // Generic
      notes: { type: String },
    },
  },
  {
    timestamps: true,
    // Optimize storage
    autoIndex: true,
  }
);

activityLogSchema.plugin(toJSON);

// Indexes for efficient querying
activityLogSchema.index({ dealerId: 1, createdAt: -1 });
activityLogSchema.index({ dealerId: 1, type: 1, createdAt: -1 });
activityLogSchema.index({ dealerId: 1, vehicleId: 1, createdAt: -1 });
activityLogSchema.index({ dealerId: 1, userId: 1, createdAt: -1 });

// TTL index to auto-delete old activities (keep for 90 days)
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log an activity
activityLogSchema.statics.log = async function(data) {
  try {
    console.log("[ActivityLog] Saving activity:", {
      type: data.type,
      vehicleReg: data.vehicleReg,
      vehicleMakeModel: data.vehicleMakeModel,
      description: data.description,
    });
    const result = await this.create(data);
    console.log("[ActivityLog] Saved activity id:", result?._id?.toString());
    return result;
  } catch (error) {
    console.error("[ActivityLog] Failed to log activity:", error);
    // Don't throw - activity logging should never break the main flow
    return null;
  }
};

// Static method to get recent activities for a dealer
activityLogSchema.statics.getRecent = async function(dealerId, options = {}) {
  const { limit = 20, types = null, vehicleId = null, userId = null } = options;

  const query = { dealerId };
  if (types && types.length > 0) {
    query.type = { $in: types };
  }
  if (vehicleId) {
    query.vehicleId = vehicleId;
  }
  if (userId) {
    query.userId = userId;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export default mongoose.models?.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
export { ACTIVITY_TYPE, ACTIVITY_CATEGORY, ACTIVITY_CONFIG };
