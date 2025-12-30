import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

export const MEMBERSHIP_ROLES = ["OWNER", "ADMIN", "STAFF", "WORKSHOP"];

const dealerMembershipSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: MEMBERSHIP_ROLES,
      default: "STAFF",
      required: true,
    },
    // For multi-dealer users: track last active dealer
    lastActiveAt: { type: Date, default: Date.now },
    // Soft delete support
    removedAt: { type: Date, default: null },
    removedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound unique index: one active membership per user per dealer
// Note: Mongoose can't do partial unique indexes easily, so we enforce in code
dealerMembershipSchema.index({ dealerId: 1, userId: 1 }, { unique: true });

// Index for finding active memberships
dealerMembershipSchema.index({ userId: 1, removedAt: 1, lastActiveAt: -1 });

dealerMembershipSchema.plugin(toJSON);

// Static method to find active memberships only
dealerMembershipSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, removedAt: null });
};

dealerMembershipSchema.statics.findOneActive = function (query = {}) {
  return this.findOne({ ...query, removedAt: null });
};

// Static method to count owners for a dealer (for last-owner protection)
dealerMembershipSchema.statics.countOwners = async function (dealerId) {
  return this.countDocuments({
    dealerId,
    role: "OWNER",
    removedAt: null,
  });
};

// Check if this is the last owner
dealerMembershipSchema.methods.isLastOwner = async function () {
  if (this.role !== "OWNER") return false;
  const ownerCount = await this.constructor.countOwners(this.dealerId);
  return ownerCount <= 1;
};

export default mongoose.models?.DealerMembership ||
  mongoose.model("DealerMembership", dealerMembershipSchema);
