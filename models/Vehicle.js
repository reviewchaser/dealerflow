import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * Vehicle Model
 *
 * SERVERLESS-SAFE PATTERN:
 * The export uses `mongoose.models?.Vehicle || mongoose.model(...)` to prevent
 * OverwriteModelError during Vercel/serverless hot reloads and cold starts.
 *
 * IMPORTANT FOR POPULATE:
 * Any file that uses .populate("vehicleId") must import this model, even if
 * it doesn't use Vehicle directly. Mongoose needs the model registered before
 * it can resolve the "Vehicle" ref during populate operations.
 */
const vehicleSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    type: {
      type: String,
      enum: ["STOCK", "COURTESY", "FLEET_OTHER"],
      default: "STOCK"
    },
    saleType: {
      type: String,
      enum: ["RETAIL", "TRADE"],
      default: "RETAIL"
    },
    regCurrent: { type: String, required: true, uppercase: true },
    vin: { type: String },
    make: { type: String, required: true },
    model: { type: String, required: true },
    derivative: { type: String },
    year: { type: Number },
    mileageCurrent: { type: Number },
    bodyType: { type: String },
    fuelType: { type: String },
    transmission: { type: String },
    colour: { type: String },
    status: {
      type: String,
      enum: ["appraised", "in_stock", "in_prep", "live", "reserved", "sold", "delivered", "archived"],
      default: "in_stock"
    },
    // Whether vehicle appears on the Prep Board (can be removed without deleting from Stock Book)
    showOnPrepBoard: {
      type: Boolean,
      default: false,
    },
    // Track when vehicle was removed from prep board (for restore option)
    prepBoardRemovedAt: { type: Date },
    // Manual priority order on prep board (lower = higher priority)
    prepBoardOrder: { type: Number, default: 0 },
    // Whether vehicle is pinned to top of prep board
    isPinnedOnPrepBoard: { type: Boolean, default: false },
    // Whether vehicle is advertised online
    isAdvertised: {
      type: Boolean,
      default: false,
    },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleLocation" },
    motExpiryDate: { type: Date },
    // Date of first registration from DVSA (firstUsedDate)
    firstRegisteredDate: { type: Date },
    motStatus: {
      type: String,
      enum: ["unknown", "valid", "expired", "due_soon", "not_required"],
      default: "unknown"
    },
    taxExpiryDate: { type: Date },
    // DVLA Vehicle Enquiry Service details
    dvlaDetails: {
      co2Emissions: { type: Number },
      engineCapacity: { type: Number },
      fuelType: { type: String },
      markedForExport: { type: Boolean },
      monthOfFirstRegistration: { type: String },
      motStatus: { type: String },
      motExpiryDate: { type: String },
      revenueWeight: { type: Number },
      taxDueDate: { type: String },
      taxStatus: { type: String },
      yearOfManufacture: { type: Number },
      euroStatus: { type: String },
      dateOfLastV5CIssued: { type: String },
      wheelplan: { type: String },
      typeApproval: { type: String },
    },
    lastDvlaFetchAt: { type: Date },
    serviceDueDate: { type: Date },
    v5Url: { type: String },
    serviceHistoryUrl: { type: String },
    faultCodesUrl: { type: String },
    websiteUrl: { type: String },
    notes: { type: String },
    labels: [{ type: mongoose.Schema.Types.ObjectId, ref: "VehicleLabel" }],
    // Vehicle images (stored in R2)
    images: [{
      url: { type: String, required: true },
      key: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    primaryImageUrl: { type: String },

    // === SALES FIELDS ===
    stockNumber: { type: String }, // Dealer's stock reference number
    vatScheme: {
      type: String,
      enum: ["MARGIN", "VAT_QUALIFYING", "NO_VAT"],
      default: "MARGIN",
    },

    // Purchase details
    purchase: {
      purchasedFromContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
      purchaseDate: { type: Date },
      purchasePriceNet: { type: Number }, // For margin scheme, this is the gross paid
      purchaseVat: { type: Number }, // Only relevant for VAT qualifying purchases
      purchaseInvoiceRef: { type: String },
      purchaseNotes: { type: String },
    },

    // Link to original appraisal if this vehicle was a part exchange
    sourceAppraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "Appraisal" },

    // Link to deal this vehicle was part exchanged against (for PX vehicles)
    sourceDealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
    // VRM of the vehicle this was part exchanged against
    sourcePxVrm: { type: String },

    // Link to deal that sold this vehicle (for ex-stock viewing)
    soldDealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },

    // Sales status (tracks vehicle through sales pipeline)
    salesStatus: {
      type: String,
      enum: ["AVAILABLE", "IN_DEAL", "SOLD_IN_PROGRESS", "DELIVERED", "COMPLETED"],
      default: "AVAILABLE",
    },

    // First registration for MOT calculation
    firstRegistrationDate: { type: Date },
    firstMotDue: { type: Date }, // Calculated: firstRegistrationDate + 3 years

    // Recall status
    recallStatus: {
      type: String,
      enum: ["UNKNOWN", "NO_OUTSTANDING", "OUTSTANDING", "CHECK_REQUIRED"],
      default: "UNKNOWN",
    },
    recallLastCheckedAt: { type: Date },
    recallNotes: { type: String },

    // MOT history cache
    motHistory: [{
      completedDate: { type: String },
      expiryDate: { type: String },
      testResult: { type: String }, // PASSED, FAILED
      odometerValue: { type: Number },
      odometerUnit: { type: String },
      motTestNumber: { type: String },
      defects: [{
        text: { type: String },
        type: { type: String }, // ADVISORY, DANGEROUS, MAJOR, MINOR
        dangerous: { type: Boolean }
      }]
    }],
    motHistoryFetchedAt: { type: Date },

    // Form integrations
    testDriveCount: { type: Number, default: 0 },
    pdiSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    pdiCompletedAt: { type: Date },
    deliverySubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    serviceReceiptSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    serviceReceiptCompletedAt: { type: Date },
    // Sale tracking
    soldAt: { type: Date },
    // Audit fields
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

vehicleSchema.plugin(toJSON);

// Indexes for dashboard and common queries
vehicleSchema.index({ dealerId: 1, status: 1 });
vehicleSchema.index({ dealerId: 1, createdAt: -1 });
vehicleSchema.index({ dealerId: 1, motExpiryDate: 1, status: 1 });
vehicleSchema.index({ dealerId: 1, type: 1 });
vehicleSchema.index({ dealerId: 1, salesStatus: 1 });
vehicleSchema.index({ dealerId: 1, stockNumber: 1 });

export default mongoose.models?.Vehicle || mongoose.model("Vehicle", vehicleSchema);
