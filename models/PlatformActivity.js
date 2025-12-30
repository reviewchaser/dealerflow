import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * Platform Activity Model
 * Tracks high-signal events across the platform for admin visibility.
 * This is NOT for dealer-level activity - use audit logs for that.
 */

// Event types that matter for platform health
export const ACTIVITY_TYPES = {
  DEALER_CREATED: "DEALER_CREATED",
  DEALER_ONBOARDING_COMPLETED: "DEALER_ONBOARDING_COMPLETED",
  DEALER_DISABLED: "DEALER_DISABLED",
  DEALER_ENABLED: "DEALER_ENABLED",
  USER_INVITED: "USER_INVITED",
  USER_SIGNED_UP: "USER_SIGNED_UP",
  USER_DISABLED: "USER_DISABLED",
  USER_ENABLED: "USER_ENABLED",
  FIRST_VEHICLE_ADDED: "FIRST_VEHICLE_ADDED",
  FIRST_WARRANTY_CASE: "FIRST_WARRANTY_CASE",
  FIRST_APPRAISAL: "FIRST_APPRAISAL",
};

const platformActivitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: true,
      index: true,
    },
    // Who performed the action (optional - system events have no actor)
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Which dealer this relates to (optional)
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      default: null,
    },
    // Which user this relates to (for user events)
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Additional context (e.g., dealer name, user email)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for efficient queries
platformActivitySchema.index({ createdAt: -1 });
platformActivitySchema.index({ dealerId: 1, createdAt: -1 });

platformActivitySchema.plugin(toJSON);

/**
 * Log a platform activity event
 * @param {string} type - Event type from ACTIVITY_TYPES
 * @param {object} data - { actorUserId, dealerId, targetUserId, metadata }
 */
platformActivitySchema.statics.log = async function (type, data = {}) {
  try {
    await this.create({
      type,
      actorUserId: data.actorUserId || null,
      dealerId: data.dealerId || null,
      targetUserId: data.targetUserId || null,
      metadata: data.metadata || {},
    });
  } catch (error) {
    // Don't let activity logging break the main flow
    console.error("[PlatformActivity] Failed to log event:", error.message);
  }
};

export default mongoose.models?.PlatformActivity ||
  mongoose.model("PlatformActivity", platformActivitySchema);
