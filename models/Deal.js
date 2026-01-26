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
    enum: ["DEPOSIT", "BALANCE", "FINANCE_ADVANCE", "OTHER"],
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
  costPrice: { type: Number }, // Cost price for margin tracking
  soldByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Staff member who sold this add-on
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
    // Step 4: Has buyer physically seen the vehicle? (for defect acknowledgement)
    buyerHasSeenVehicle: {
      type: Boolean,
      default: false,
    },
    // Payment method for balance (confirmed at invoice generation)
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "BANK_TRANSFER", "FINANCE", "MIXED"],
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

    // === PURCHASE PRICE SNAPSHOT ===
    purchasePriceNet: { type: Number }, // SIV snapshotted from vehicle at deal creation

    // === SIV AMENDMENT AUDIT ===
    sivAmendment: {
      isUnlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date },
      unlockedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      originalValue: { type: Number }, // Original SIV before amendment
      amendedAt: { type: Date },
      amendedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String },
    },

    // === PART EXCHANGE ===
    // Legacy single PX field (for backwards compatibility)
    partExchangeId: { type: mongoose.Schema.Types.ObjectId, ref: "PartExchange" },
    partExchangeAllowance: { type: Number, default: 0 },
    partExchangeSettlement: { type: Number, default: 0 },
    // Multiple part exchanges (max 2) - embedded for display
    partExchanges: [{
      partExchangeId: { type: mongoose.Schema.Types.ObjectId, ref: "PartExchange" },
      // Vehicle details
      vrm: { type: String },
      make: { type: String },
      model: { type: String },
      year: { type: Number },
      mileage: { type: Number },
      colour: { type: String },
      fuelType: { type: String },
      // Values
      allowance: { type: Number, default: 0 },
      settlement: { type: Number, default: 0 },
      // VAT & Finance
      vatQualifying: { type: Boolean, default: false },
      hasFinance: { type: Boolean, default: false },
      financeCompanyContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
      financeCompanyName: { type: String },
      hasSettlementInWriting: { type: Boolean, default: false },
      // Notes
      conditionNotes: { type: String },
    }],

    // === PAYMENTS ===
    payments: [paymentSchema],

    // === ADD-ONS ===
    addOns: [dealAddOnSchema],

    // === DELIVERY ===
    delivery: {
      amount: { type: Number, default: 0 }, // Legacy: gross amount
      amountGross: { type: Number }, // Gross amount (inc VAT)
      amountNet: { type: Number }, // Net amount (ex VAT)
      vatAmount: { type: Number }, // VAT amount
      isFree: { type: Boolean, default: false },
      notes: { type: String },
      // Delivery scheduling
      scheduledDate: { type: Date },
      scheduledCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" },
      // Track original amount on deposit for credit calculation
      originalAmountOnDeposit: { type: Number },
    },

    // === COLLECTION (for customer pickup) ===
    collection: {
      scheduledDate: { type: Date },
      scheduledCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" },
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

    // === E-SIGNATURES (Invoice) ===
    signature: {
      // Customer signature
      customerSignedAt: { type: Date },
      customerSignerName: { type: String },
      customerSignatureImageKey: { type: String }, // R2 storage key
      // Dealer signature
      dealerSignedAt: { type: Date },
      dealerSignerName: { type: String },
      dealerSignatureImageKey: { type: String }, // R2 storage key
      // Driver signing link (for third-party delivery)
      driverLinkToken: { type: String },
      driverLinkTokenHash: { type: String },
      driverLinkExpiresAt: { type: Date },
      driverLinkPinHash: { type: String }, // Optional 4-digit PIN (hashed)
    },

    // === E-SIGNATURES (Deposit Receipt) ===
    depositSignature: {
      customerSignedAt: { type: Date },
      customerSignerName: { type: String },
      customerSignatureImageKey: { type: String },
      dealerSignedAt: { type: Date },
      dealerSignerName: { type: String },
      dealerSignatureImageKey: { type: String },
    },

    // === TIMESTAMPS ===
    depositTakenAt: { type: Date },
    invoicedAt: { type: Date },
    deliveredAt: { type: Date },
    deliveredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deliveryMileage: { type: Number },
    deliveryNotes: { type: String },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },

    // === WARRANTY ===
    warrantyMonths: { type: Number },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
    // Structured warranty details
    warranty: {
      included: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ["DEFAULT", "TRADE", "THIRD_PARTY"],
        default: "DEFAULT",
      },
      warrantyProductId: { type: mongoose.Schema.Types.ObjectId, ref: "WarrantyProduct" },
      name: { type: String },
      description: { type: String },
      durationMonths: { type: Number },
      claimLimit: { type: Number }, // null = unlimited
      priceGross: { type: Number },
      priceNet: { type: Number },
      costPrice: { type: Number }, // Cost to dealer for profit tracking
      vatTreatment: {
        type: String,
        enum: ["NO_VAT", "STANDARD", "EXEMPT"],
        default: "NO_VAT",
      },
      vatAmount: { type: Number },
      tradeTermsText: { type: String }, // For TRADE type - shown on PDFs
      isDefault: { type: Boolean }, // true = dealer default (kept for backwards compat)
      addOnProductId: { type: mongoose.Schema.Types.ObjectId, ref: "AddOnProduct" }, // Kept for backwards compat
    },

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
// Performance indexes for dashboard stats (queries by completedAt)
dealSchema.index({ dealerId: 1, completedAt: -1 });
dealSchema.index({ dealerId: 1, status: 1, completedAt: -1 });
// Performance indexes for vehicles API queries
dealSchema.index({ dealerId: 1, vehicleId: 1, status: 1 });
dealSchema.index({ dealerId: 1, buyerHasSeenVehicle: 1 });

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
  // Use new amountGross if available, otherwise fall back to legacy amount field
  const deliveryAmount = this.delivery?.isFree ? 0 :
    (this.delivery?.amountGross || this.delivery?.amount || 0);
  // Include warranty price if applicable
  const warrantyAmount = this.warranty?.included ? (this.warranty?.priceGross || 0) : 0;
  return vehicleGross + addOnsNet + addOnsVat + deliveryAmount + warrantyAmount;
});

// Virtual: Calculate total PX net value (allowance - settlement)
dealSchema.virtual("totalPartExchangeNet").get(function () {
  // Check new partExchanges array first
  if (this.partExchanges && this.partExchanges.length > 0) {
    return this.partExchanges.reduce((sum, px) => {
      return sum + ((px.allowance || 0) - (px.settlement || 0));
    }, 0);
  }
  // Fall back to legacy single PX fields
  return (this.partExchangeAllowance || 0) - (this.partExchangeSettlement || 0);
});

// Virtual: Calculate balance due
dealSchema.virtual("balanceDue").get(function () {
  const total = this.grandTotal || 0;
  const paid = this.totalPaid || 0;
  const pxNet = this.totalPartExchangeNet || 0;
  return total - paid - pxNet;
});

// Ensure virtuals are included in JSON
dealSchema.set("toJSON", { virtuals: true });
dealSchema.set("toObject", { virtuals: true });

export default mongoose.models?.Deal || mongoose.model("Deal", dealSchema);
