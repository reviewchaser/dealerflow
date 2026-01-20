import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * WarrantyProduct Model
 *
 * Dealer's catalog of third-party warranty products that can be attached to deals.
 * Separate from AddOnProduct to provide clearer warranty management.
 */

const warrantyProductSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },

    // Pricing - priceGross is the primary field
    priceGross: { type: Number, default: 0 },
    vatTreatment: {
      type: String,
      enum: ["NO_VAT", "STANDARD", "EXEMPT"],
      default: "NO_VAT", // Most warranties are VAT exempt
    },
    vatRate: { type: Number, default: 0.2 },

    // Warranty-specific fields
    termMonths: { type: Number },
    claimLimit: { type: Number }, // Max claim amount (null = unlimited)

    // Cost tracking (optional)
    costPrice: { type: Number }, // Dealer's cost

    // Display
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },

    // Audit
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

warrantyProductSchema.plugin(toJSON);

// Indexes
warrantyProductSchema.index({ dealerId: 1, isActive: 1 });
warrantyProductSchema.index({ dealerId: 1, name: 1 });

// Virtual: Calculate net price from gross
warrantyProductSchema.virtual("priceNet").get(function () {
  if (this.priceGross == null) return 0;
  if (this.vatTreatment === "STANDARD") {
    return Math.round((this.priceGross / (1 + (this.vatRate || 0.2))) * 100) / 100;
  }
  // NO_VAT or EXEMPT: net = gross
  return this.priceGross;
});

// Virtual: Calculate VAT amount
warrantyProductSchema.virtual("vatAmount").get(function () {
  if (this.vatTreatment === "STANDARD" && this.priceGross) {
    const net = this.priceGross / (1 + (this.vatRate || 0.2));
    return Math.round((this.priceGross - net) * 100) / 100;
  }
  return 0;
});

// Virtual: Profit margin
warrantyProductSchema.virtual("profitMargin").get(function () {
  if (this.costPrice != null && this.priceNet != null) {
    return this.priceNet - this.costPrice;
  }
  return null;
});

warrantyProductSchema.set("toJSON", { virtuals: true });
warrantyProductSchema.set("toObject", { virtuals: true });

export default mongoose.models?.WarrantyProduct || mongoose.model("WarrantyProduct", warrantyProductSchema);
