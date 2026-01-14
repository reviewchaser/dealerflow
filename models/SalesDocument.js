import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * SalesDocument Model
 *
 * Stores deposit receipts and invoices with snapshots of deal data.
 * Supports signature capture and PDF storage.
 */

const salesDocumentSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      // Required for DEPOSIT_RECEIPT and INVOICE, not for SELF_BILL_INVOICE
    },

    // Vehicle ID (for self-billing invoices which don't have a deal)
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      // Required for SELF_BILL_INVOICE
    },

    // Document type and number
    type: {
      type: String,
      enum: ["DEPOSIT_RECEIPT", "INVOICE", "SELF_BILL_INVOICE", "PAYMENT_RECEIPT"],
      required: true,
    },
    documentNumber: { type: String, required: true },

    // Status
    status: {
      type: String,
      enum: ["DRAFT", "ISSUED", "VOID"],
      default: "DRAFT",
    },
    issuedAt: { type: Date },
    voidedAt: { type: Date },
    voidReason: { type: String },

    // === SNAPSHOT DATA ===
    // Captured at time of document generation for immutability
    snapshotData: {
      // Vehicle
      vehicle: {
        regCurrent: { type: String },
        vin: { type: String },
        make: { type: String },
        model: { type: String },
        derivative: { type: String },
        year: { type: Number },
        mileage: { type: Number },
        colour: { type: String },
      },

      // Customer (sold to)
      customer: {
        name: { type: String },
        companyName: { type: String },
        email: { type: String },
        phone: { type: String },
        address: {
          line1: { type: String },
          line2: { type: String },
          town: { type: String },
          county: { type: String },
          postcode: { type: String },
        },
      },

      // Invoice to (if different - e.g., finance company)
      invoiceTo: {
        name: { type: String },
        companyName: { type: String },
        email: { type: String },
        address: {
          line1: { type: String },
          line2: { type: String },
          town: { type: String },
          county: { type: String },
          postcode: { type: String },
        },
      },

      // Pricing
      vatScheme: { type: String },
      vehiclePriceNet: { type: Number },
      vehicleVatAmount: { type: Number },
      vehiclePriceGross: { type: Number },

      // Add-ons
      addOns: [{
        name: { type: String },
        qty: { type: Number },
        unitPriceNet: { type: Number },
        vatTreatment: { type: String },
        vatRate: { type: Number },
      }],
      addOnsNetTotal: { type: Number },
      addOnsVatTotal: { type: Number },

      // Delivery
      delivery: {
        amount: { type: Number },
        isFree: { type: Boolean },
        notes: { type: String },
      },

      // Finance selection (customer finance intention)
      financeSelection: {
        isFinanced: { type: Boolean },
        financeCompanyName: { type: String },
        toBeConfirmed: { type: Boolean },
      },

      // Sale classification
      saleType: { type: String }, // RETAIL, TRADE, EXPORT
      buyerUse: { type: String }, // PERSONAL, BUSINESS
      saleChannel: { type: String }, // IN_PERSON, DISTANCE

      // Finance details (when paymentType involves finance)
      finance: {
        provider: { type: String },
        financeType: { type: String },
        amountFinanced: { type: Number },
        status: { type: String },
        reference: { type: String },
      },

      // Part exchange
      partExchange: {
        vrm: { type: String },
        make: { type: String },
        model: { type: String },
        allowance: { type: Number },
        settlement: { type: Number },
        // Finance & VAT fields
        vatQualifying: { type: Boolean },
        hasFinance: { type: Boolean },
        financeCompanyName: { type: String },
        hasSettlementInWriting: { type: Boolean },
        financeSettled: { type: Boolean },
      },

      // Payments (for deposit receipt or invoice showing deposits paid)
      payments: [{
        type: { type: String },
        amount: { type: Number },
        method: { type: String },
        paidAt: { type: Date },
        reference: { type: String },
      }],

      // Totals
      subtotal: { type: Number },
      totalVat: { type: Number },
      grandTotal: { type: Number },
      totalPaid: { type: Number },
      partExchangeNet: { type: Number },
      balanceDue: { type: Number },

      // Agreed work / requests
      requests: [{
        title: { type: String },
        details: { type: String },
        type: { type: String },
        status: { type: String },
      }],

      // User who took deposit / created document
      takenBy: {
        name: { type: String },
        email: { type: String },
      },

      // Terms
      termsText: { type: String },

      // Dealer details
      dealer: {
        name: { type: String },
        companyName: { type: String },
        address: { type: String },
        phone: { type: String },
        email: { type: String },
        vatNumber: { type: String },
        companyNumber: { type: String },
        logoUrl: { type: String },
      },

      // Supplier details (for self-billing invoices - the seller we bought from)
      supplier: {
        name: { type: String },
        companyName: { type: String },
        email: { type: String },
        phone: { type: String },
        vatNumber: { type: String },
        address: {
          line1: { type: String },
          line2: { type: String },
          town: { type: String },
          county: { type: String },
          postcode: { type: String },
        },
      },

      // Purchase details (for self-billing invoices)
      purchase: {
        purchaseDate: { type: Date },
        purchasePriceNet: { type: Number },
        purchaseVat: { type: Number },
        purchasePriceGross: { type: Number },
        purchaseInvoiceRef: { type: String },
      },

      // Bank details (for invoice)
      bankDetails: {
        accountName: { type: String },
        sortCode: { type: String },
        accountNumber: { type: String },
        iban: { type: String },
      },

      // Payment receipt specific fields
      paymentReceipt: {
        paymentAmount: { type: Number },
        paymentMethod: { type: String },
        paymentReference: { type: String },
        invoiceNumber: { type: String },
        invoiceBalanceBefore: { type: Number },
        invoiceBalanceAfter: { type: Number },
        isFullPayment: { type: Boolean },
      },
    },

    // === SIGNATURES ===
    signature: {
      required: { type: Boolean, default: false },
      buyerSignatureImageKey: { type: String }, // R2 storage key
      dealerSignatureImageKey: { type: String },
      signedAt: { type: Date },
    },

    // PDF storage
    pdfStorageKey: { type: String }, // R2/S3 object key

    // Share link
    shareToken: { type: String },
    shareTokenHash: { type: String },
    shareExpiresAt: { type: Date },

    // Audit
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

salesDocumentSchema.plugin(toJSON);

// Indexes
salesDocumentSchema.index({ dealerId: 1, type: 1, documentNumber: 1 }, { unique: true });
salesDocumentSchema.index({ dealerId: 1, dealId: 1, type: 1 });
salesDocumentSchema.index({ dealerId: 1, vehicleId: 1, type: 1 }); // For self-billing invoices
salesDocumentSchema.index({ dealerId: 1, createdAt: -1 });
salesDocumentSchema.index({ shareTokenHash: 1 }, { sparse: true });

export default mongoose.models?.SalesDocument || mongoose.model("SalesDocument", salesDocumentSchema);
