import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * AddOnProduct Model
 *
 * Dealer's catalog of add-on products that can be attached to deals.
 * Examples: warranties, paint protection, delivery charges, admin fees.
 */

const addOnProductSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },

    category: {
      type: String,
      enum: ["WARRANTY", "COSMETIC", "PROTECTION", "DELIVERY", "ADMIN", "OTHER"],
      default: "OTHER",
    },

    // Pricing - defaultPriceGross is the primary field (user enters inc VAT)
    defaultPriceGross: { type: Number }, // Price including VAT
    defaultPriceNet: { type: Number }, // Calculated or legacy field
    vatTreatment: {
      type: String,
      enum: ["STANDARD", "NO_VAT", "ZERO"],
      default: "STANDARD",
    },
    vatRate: { type: Number, default: 0.2 },

    // Cost tracking (optional)
    costPrice: { type: Number }, // Dealer's cost
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },

    // WARRANTY-specific fields
    claimLimit: { type: Number }, // Max claim amount (null = unlimited)
    termMonths: { type: Number }, // Duration in months

    // Display
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },

    // Audit
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

addOnProductSchema.plugin(toJSON);

// Indexes
addOnProductSchema.index({ dealerId: 1, isActive: 1 });
addOnProductSchema.index({ dealerId: 1, category: 1 });
addOnProductSchema.index({ dealerId: 1, name: 1 });

// Pre-save hook: Calculate net from gross if gross is provided
addOnProductSchema.pre("save", function (next) {
  if (this.defaultPriceGross != null) {
    if (this.vatTreatment === "STANDARD") {
      // Calculate net from gross: net = gross / (1 + vatRate)
      this.defaultPriceNet = Math.round((this.defaultPriceGross / (1 + (this.vatRate || 0.2))) * 100) / 100;
    } else {
      // No VAT or Zero-rated: net = gross
      this.defaultPriceNet = this.defaultPriceGross;
    }
  }
  next();
});

// Virtual: Computed gross price (for backwards compatibility if only net is stored)
addOnProductSchema.virtual("computedGross").get(function () {
  // Return stored gross if available, otherwise calculate from net
  if (this.defaultPriceGross != null) {
    return this.defaultPriceGross;
  }
  if (this.vatTreatment === "STANDARD" && this.defaultPriceNet != null) {
    return this.defaultPriceNet * (1 + (this.vatRate || 0.2));
  }
  return this.defaultPriceNet;
});

// Virtual: Profit margin
addOnProductSchema.virtual("profitMargin").get(function () {
  if (this.costPrice && this.defaultPriceNet) {
    return this.defaultPriceNet - this.costPrice;
  }
  return null;
});

addOnProductSchema.set("toJSON", { virtuals: true });
addOnProductSchema.set("toObject", { virtuals: true });

export default mongoose.models?.AddOnProduct || mongoose.model("AddOnProduct", addOnProductSchema);
