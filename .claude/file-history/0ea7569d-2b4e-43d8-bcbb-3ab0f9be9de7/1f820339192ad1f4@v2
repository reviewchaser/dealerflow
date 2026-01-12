import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * PartExchange Model
 *
 * Links an appraisal or dealer assessment to a deal as part exchange.
 * Stores the PX vehicle details, valuation, and settlement info.
 */

const partExchangeSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },

    // Source reference
    sourceType: {
      type: String,
      enum: ["CUSTOMER_FORM", "DEALER_APPRAISAL", "MANUAL"],
      default: "MANUAL",
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId }, // appraisalId or submissionId

    // === VEHICLE DETAILS ===
    vrm: { type: String, required: true, uppercase: true },
    vin: { type: String },
    make: { type: String },
    model: { type: String },
    derivative: { type: String },
    year: { type: Number },
    mileage: { type: Number },
    colour: { type: String },
    fuelType: { type: String },
    transmission: { type: String },

    // === VALUATION ===
    allowance: { type: Number, required: true }, // Agreed PX value
    settlement: { type: Number, default: 0 }, // Outstanding finance settlement
    vatQualifying: { type: Boolean, default: false }, // Is PX VAT qualifying (affects VAT treatment on sale)

    // === FINANCE ===
    hasFinance: { type: Boolean, default: false }, // Does the PX have outstanding finance?
    financeCompanyContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" }, // Finance company (required if hasFinance)
    hasSettlementInWriting: { type: Boolean, default: false }, // Is the settlement figure confirmed in writing?
    financeSettled: { type: Boolean, default: false }, // Has the finance been settled/paid off?
    financeSettledAt: { type: Date }, // When was the finance settled?

    // === CONDITION NOTES ===
    conditionSummary: { type: String },
    keys: { type: Number }, // Number of keys
    serviceHistory: {
      type: String,
      enum: ["FULL", "PARTIAL", "NONE", "UNKNOWN"],
      default: "UNKNOWN",
    },
    v5Present: { type: Boolean },
    motExpiry: { type: Date },
    notes: { type: String },

    // === DISPOSITION ===
    disposition: {
      type: String,
      enum: ["UNDECIDED", "RETAIL_STOCK", "TRADE_SALE", "AUCTION"],
      default: "UNDECIDED",
    },
    convertedToVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    soldToContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" }, // If trade sold
    soldAmount: { type: Number },
    soldAt: { type: Date },

    // === AUDIT ===
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

partExchangeSchema.plugin(toJSON);

// Indexes
partExchangeSchema.index({ dealerId: 1, sourceType: 1, sourceId: 1 });
partExchangeSchema.index({ dealerId: 1, vrm: 1 });
partExchangeSchema.index({ dealerId: 1, createdAt: -1 });

// Virtual: Net value to customer (allowance minus settlement)
partExchangeSchema.virtual("netValue").get(function () {
  return (this.allowance || 0) - (this.settlement || 0);
});

// Ensure virtuals are included
partExchangeSchema.set("toJSON", { virtuals: true });
partExchangeSchema.set("toObject", { virtuals: true });

export default mongoose.models?.PartExchange || mongoose.model("PartExchange", partExchangeSchema);
