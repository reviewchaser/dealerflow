import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";
import bcrypt from "bcryptjs";

// Platform-level roles (not dealer roles - those are in DealerMembership)
export const PLATFORM_ROLES = {
  USER: "USER", // Normal user (dealer member)
  SUPER_ADMIN: "SUPER_ADMIN", // Platform admin (no dealer access)
};

// User status for admin control
export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INVITED: "INVITED", // User invited but hasn't set password yet
  DISABLED: "DISABLED",
};

// USER SCHEMA
const userSchema = mongoose.Schema(
  {
    // Platform-level role (SUPER_ADMIN has no dealer access)
    role: {
      type: String,
      enum: Object.values(PLATFORM_ROLES),
      default: PLATFORM_ROLES.USER,
    },
    // Account status (admin can disable users)
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    // DEPRECATED: Use DealerMembership instead. Kept for backwards compatibility during migration.
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
    },
    // For users with multiple dealers: their preferred default dealer
    defaultDealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      default: null,
    },
    name: {
      type: String,
      trim: true,
    },
    // Full name for display (e.g., in holiday requests)
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      private: true,
      unique: true,
      sparse: true, // Allow multiple null values (for OAuth users without email)
    },
    // Password hash (only for credentials login)
    passwordHash: {
      type: String,
      select: false, // Don't include by default in queries
    },
    image: {
      type: String,
    },
    // Used in the Stripe webhook to identify the user in Stripe and later create Customer Portal or prefill user credit card details
    customerId: {
      type: String,
      validate(value) {
        return value.includes("cus_");
      },
    },
    // Used in the Stripe webhook. should match a plan in config.js file.
    priceId: {
      type: String,
      validate(value) {
        return value.includes("price_");
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);

// Virtual for display name (falls back to email prefix)
userSchema.virtual("displayName").get(function () {
  return this.fullName || this.name || this.email?.split("@")[0] || "Unknown User";
});

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Instance method to compare password
userSchema.methods.comparePassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

// Static method to find user by email with password (for auth)
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select("+passwordHash");
};

export default mongoose.models?.User || mongoose.model("User", userSchema);
