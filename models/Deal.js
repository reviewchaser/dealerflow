import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * Deal Model - Vehicle Sales Management
 *
 * Tracks the complete sales lifecycle from lead to completion.
 * Supports both VAT Qualifying and Margin Scheme sales.
 *
 * Status workflow:
 * DRAFT -> DEPOSIT_TAKEN -> INVOICED -> DELIVERED -> COMPLETED
 *                                                  -> CANCELLED (from any state)
 */

// Payment subdocument
const paymentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["DEPOSIT", "BALANCE", "OTHER"],
    required: true,
  },
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ["CASH", "CARD", "BANK_TRANSFER", "FINANCE", "OTHER"],
    required: true,
  },
  paidAt: { type: Date, default: Date.now },
  reference: { type: String },
  isRefunded: { type: Boolean, default: false },
  refundedAt: { type: Date },
  notes: { type: String },
}, { _id: true });

// Add-on item subdocument
const dealAddOnSchema = new mongoose.Schema({
  addOnProductId: { type: mongoose.Schema.Types.ObjectId, ref: "AddOnProduct" },
  name: { type: String, required: true },
  category: { type: String },
  qty: { type: Number, default: 1 },
  unitPriceNet: { type: Number, required: true },
  vatTreatment: {
    type: String,
    enum: ["STANDARD", "NO_VAT", "ZERO"],
    default: "STANDARD",
  },
  vatRate: { type: Number, default: 0.2 },
}, { _id: true });

// Sales request subdocument
const salesRequestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  details: { type: String },
  type: {
    type: String,
    enum: ["PREP", "ACCESSORY", "COSMETIC", "ADMIN", "OTHER"],
    default: "OTHER",
  },
  status: {
    type: String,
    enum: ["REQUESTED", "IN_PROGRESS", "DONE", "CANCELLED"],
    default: "REQUESTED",
  },
  estimatedCostNet: { type: Number },
  linkToIssueId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleIssue" },
  linkToChecklistTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleTask" },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, { _id: true });

const dealSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    // Deal reference number (auto-generated per dealer)
    dealNumber: { type: Number, required: true },

    // Status workflow
    status: {
      type: String,
      enum: [
        "DRAFT",           // Initial creation
        "DEPOSIT_TAKEN",   // Deposit received
        "INVOICED",        // Invoice issued
        "DELIVERED",       // Vehicle handed over
        "COMPLETED",       // Post-delivery complete
        "CANCELLED",       // Deal fell through
      ],
      default: "DRAFT",
    },

    // === PARTIES ===
    soldToContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },
    invoiceToContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    }, // Finance company or other payer

    // Delivery address (if different from customer)
    deliveryAddress: {
      isDifferent: { type: Boolean, default: false },
      line1: { type: String },
      line2: { type: String },
      town: { type: String },
      county: { type: String },
      postcode: { type: String },
      country: { type: String, default: "United Kingdom" },
    },

    // === SALE CLASSIFICATION ===
    // Step 1: Sale Type (first decision)
    saleType: {
      type: String,
      enum: ["RETAIL", "TRADE", "EXPORT"],
      default: "RETAIL",
    },
    // Step 2: Buyer use (only for Retail)
    buyerUse: {
      type: String,
      enum: ["PERSONAL", "BUSINESS"],
      default: "PERSONAL",
    },
    // Backward compat alias
    buyerType: {
      type: String,
      enum: ["CONSUMER", "BUSINESS"],
    },
    // Step 3: Sale channel (only for Retail)
    saleChannel: {
      type: String,
      enum: ["IN_PERSON", "DISTANCE"],
      default: "IN_PERSON",
    },
    // Business details (for Trade/Business buyers)
    businessDetails: {
      companyName: { type: String },
      companyRegNumber: { type: String },
      vatNumber: { type: String },
    },

    // === PAYMENT TYPE ===
    paymentType: {
      type: String,
      enum: ["CASH", "CARD", "FINANCE", "BANK_TRANSFER", "MIXED"],
      default: "CASH",
    },

    // === FINANCE DETAILS (when paymentType involves finance) ===
    finance: {
      provider: { type: String }, // Finance company name
      financeType: {
        type: String,
        enum: ["HP", "PCP", "LEASE", "PERSONAL_LOAN", "OTHER"],
      },
      amountFinanced: { type: Number }, // Amount being financed
      customerDeposit: { type: Number }, // Cash deposit from customer
      termMonths: { type: Number }, // Loan term
      apr: { type: Number }, // Annual percentage rate
      monthlyPayment: { type: Number }, // Monthly payment amount
      status: {
        type: String,
        enum: ["QUOTED", "SUBMITTED", "APPROVED", "DECLINED", "PAID_OUT", "CANCELLED"],
        default: "QUOTED",
      },
      reference: { type: String }, // Finance agreement reference
      paidOutAt: { type: Date },
    },

    // === VEHICLE PRICING SNAPSHOT ===
    vatScheme: {
      type: String,
      enum: ["MARGIN", "VAT_QUALIFYING", "NO_VAT"],
      required: true,
    },
    vatRate: { type: Number, default: 0.2 },

    // For VAT_QUALIFYING: store net + VAT
    vehiclePriceNet: { type: Number },
    vehicleVatAmount: { type: Number },
    vehiclePriceGross: { type: Number },

    // For MARGIN scheme: only store gross (no VAT breakdown)
    // vehiclePriceGross is used for both schemes

    // === PART EXCHANGE ===
    partExchangeId: { type: mongoose.Schema.Types.ObjectId, ref: "PartExchange" },
    partExchangeAllowance: { type: Number, default: 0 },
    partExchangeSettlement: { type: Number, default: 0 },

    // === PAYMENTS ===
    payments: [paymentSchema],

    // === ADD-ONS ===
    addOns: [dealAddOnSchema],

    // === DELIVERY ===
    delivery: {
      amount: { type: Number, default: 0 },
      isFree: { type: Boolean, default: false },
      notes: { type: String },
    },

    // === FINANCE SELECTION (for deposit stage) ===
    financeSelection: {
      isFinanced: { type: Boolean, default: false },
      financeCompanyContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
      toBeConfirmed: { type: Boolean, default: false },
    },

    // === SALES REQUESTS ===
    requests: [salesRequestSchema],

    // === TERMS SNAPSHOT ===
    termsKey: { type: String }, // e.g., "CONSUMER_IN_PERSON", "BUSINESS_DISTANCE"
    termsSnapshotText: { type: String },

    // === DOCUMENT LINKS ===
    linkedSubmissionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" }],

    // === TIMESTAMPS ===
    depositTakenAt: { type: Date },
    invoicedAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },

    // === WARRANTY ===
    warrantyMonths: { type: Number },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },

    // Notes
    notes: { type: String },
    internalNotes: { type: String },

    // Assigned salesperson
    salesPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // === AUDIT ===
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

dealSchema.plugin(toJSON);

// Indexes
dealSchema.index({ dealerId: 1, dealNumber: 1 }, { unique: true });
dealSchema.index({ dealerId: 1, vehicleId: 1 });
dealSchema.index({ dealerId: 1, status: 1 });
dealSchema.index({ dealerId: 1, createdAt: -1 });
dealSchema.index({ dealerId: 1, soldToContactId: 1 });
dealSchema.index({ dealerId: 1, salesPersonId: 1 });

// Virtual: Calculate total deposit paid
dealSchema.virtual("totalDepositPaid").get(function () {
  return (this.payments || [])
    .filter(p => p.type === "DEPOSIT" && !p.isRefunded)
    .reduce((sum, p) => sum + p.amount, 0);
});

// Virtual: Calculate total payments received
dealSchema.virtual("totalPaid").get(function () {
  return (this.payments || [])
    .filter(p => !p.isRefunded)
    .reduce((sum, p) => sum + p.amount, 0);
});

// Virtual: Calculate add-ons total (net)
dealSchema.virtual("addOnsNetTotal").get(function () {
  return (this.addOns || []).reduce((sum, a) => sum + (a.unitPriceNet * a.qty), 0);
});

// Virtual: Calculate add-ons VAT
dealSchema.virtual("addOnsVatTotal").get(function () {
  return (this.addOns || []).reduce((sum, a) => {
    if (a.vatTreatment === "STANDARD") {
      return sum + (a.unitPriceNet * a.qty * a.vatRate);
    }
    return sum;
  }, 0);
});

// Virtual: Calculate grand total
dealSchema.virtual("grandTotal").get(function () {
  const vehicleGross = this.vehiclePriceGross || 0;
  const addOnsNet = this.addOnsNetTotal || 0;
  const addOnsVat = this.addOnsVatTotal || 0;
  const deliveryAmount = (this.delivery?.isFree ? 0 : this.delivery?.amount) || 0;
  return vehicleGross + addOnsNet + addOnsVat + deliveryAmount;
});

// Virtual: Calculate balance due
dealSchema.virtual("balanceDue").get(function () {
  const total = this.grandTotal || 0;
  const paid = this.totalPaid || 0;
  const pxNet = (this.partExchangeAllowance || 0) - (this.partExchangeSettlement || 0);
  return total - paid - pxNet;
});

// Ensure virtuals are included in JSON
dealSchema.set("toJSON", { virtuals: true });
dealSchema.set("toObject", { virtuals: true });

export default mongoose.models?.Deal || mongoose.model("Deal", dealSchema);
