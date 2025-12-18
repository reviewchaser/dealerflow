import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

/**
 * Vehicle Model
 *
 * SERVERLESS-SAFE PATTERN:
 * The export uses `mongoose.models.Vehicle || mongoose.model(...)` to prevent
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
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleLocation" },
    motExpiryDate: { type: Date },
    motStatus: {
      type: String,
      enum: ["unknown", "valid", "expired", "due_soon", "not_required"],
      default: "unknown"
    },
    taxExpiryDate: { type: Date },
    serviceDueDate: { type: Date },
    v5Url: { type: String },
    serviceHistoryUrl: { type: String },
    faultCodesUrl: { type: String },
    websiteUrl: { type: String },
    notes: { type: String },
    labels: [{ type: mongoose.Schema.Types.ObjectId, ref: "VehicleLabel" }],
    // Form integrations
    testDriveCount: { type: Number, default: 0 },
    pdiSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    pdiCompletedAt: { type: Date },
    deliverySubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
    // Sale tracking
    soldAt: { type: Date },
    // Audit fields
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

vehicleSchema.plugin(toJSON);
export default mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
