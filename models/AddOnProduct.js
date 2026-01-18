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
      enum: ["WARRANTY", "COSMETIC", "DELIVERY", "ADMIN", "OTHER"],
      default: "OTHER",
    },

    // Pricing
    defaultPriceNet: { type: Number, required: true },
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

// Virtual: Gross price (for STANDARD VAT treatment)
addOnProductSchema.virtual("defaultPriceGross").get(function () {
  if (this.vatTreatment === "STANDARD") {
    return this.defaultPriceNet * (1 + this.vatRate);
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
