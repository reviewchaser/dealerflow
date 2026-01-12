import mongoose from "mongoose";
import crypto from "crypto";
import toJSON from "./plugins/toJSON";

export const INVITE_ROLES = ["OWNER", "ADMIN", "STAFF", "WORKSHOP"];

// Token expiry: 7 days
export const INVITE_EXPIRY_DAYS = 7;

const dealerInviteSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: INVITE_ROLES,
      default: "STAFF",
      required: true,
    },
    // Security: store ONLY the hash, never the raw token
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    invitedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    // Lifecycle tracking
    acceptedAt: { type: Date, default: null },
    acceptedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokedAt: { type: Date, default: null },
    revokedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index for finding active invites
dealerInviteSchema.index({ dealerId: 1, email: 1 });
dealerInviteSchema.index({ tokenHash: 1 });

dealerInviteSchema.plugin(toJSON);

// =====================
// Token Utility Methods
// =====================

/**
 * Generate a secure random token (returns raw token for email, hash for storage)
 * @returns {{ rawToken: string, tokenHash: string }}
 */
dealerInviteSchema.statics.generateToken = function () {
  // Generate 32 random bytes, encode as base64url
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
};

/**
 * Hash a raw token for comparison
 * @param {string} rawToken
 * @returns {string}
 */
dealerInviteSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Find a valid (not expired, not revoked, not accepted) invite by token
 * @param {string} rawToken
 * @returns {Promise<Document|null>}
 */
dealerInviteSchema.statics.findByToken = async function (rawToken) {
  const tokenHash = this.hashToken(rawToken);
  return this.findOne({
    tokenHash,
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Find active (pending) invite for email at dealer
 * @param {string} dealerId
 * @param {string} email
 * @returns {Promise<Document|null>}
 */
dealerInviteSchema.statics.findActiveInvite = function (dealerId, email) {
  return this.findOne({
    dealerId,
    email: email.toLowerCase(),
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Find all pending invites for a dealer
 * @param {string} dealerId
 * @returns {Promise<Document[]>}
 */
dealerInviteSchema.statics.findPendingByDealer = function (dealerId) {
  return this.find({
    dealerId,
    acceptedAt: null,
    revokedAt: null,
  })
    .populate("invitedByUserId", "name email")
    .sort({ createdAt: -1 });
};

// Instance methods

/**
 * Check if invite is still valid
 */
dealerInviteSchema.methods.isValid = function () {
  return (
    !this.acceptedAt &&
    !this.revokedAt &&
    this.expiresAt > new Date()
  );
};

/**
 * Check if invite is expired
 */
dealerInviteSchema.methods.isExpired = function () {
  return this.expiresAt <= new Date();
};

/**
 * Mark invite as accepted
 * @param {string} userId - The user who accepted
 */
dealerInviteSchema.methods.markAccepted = async function (userId) {
  this.acceptedAt = new Date();
  this.acceptedByUserId = userId;
  await this.save();
};

/**
 * Mark invite as revoked
 * @param {string} userId - The user who revoked
 */
dealerInviteSchema.methods.markRevoked = async function (userId) {
  this.revokedAt = new Date();
  this.revokedByUserId = userId;
  await this.save();
};

/**
 * Regenerate token (for resend)
 * @returns {string} - The new raw token (for email)
 */
dealerInviteSchema.methods.regenerateToken = async function () {
  const { rawToken, tokenHash } = this.constructor.generateToken();
  this.tokenHash = tokenHash;
  this.expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await this.save();
  return rawToken;
};

export default mongoose.models.DealerInvite ||
  mongoose.model("DealerInvite", dealerInviteSchema);
