import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const courtesyAllocationSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true },
    courtesyVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true }, // where Vehicle.type = COURTESY
    aftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" },
    customerVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }, // optional link to customer's vehicle
    customerVehicleRegNormalized: { type: String, uppercase: true }, // reg of customer's car being repaired
    dateOut: { type: Date, required: true },
    dateDueBack: { type: Date },
    dateReturned: { type: Date },
    mileageOut: { type: Number },
    mileageIn: { type: Number },
    fuelLevelOut: { type: String }, // e.g. "Full", "3/4", "Half", "1/4", "Empty"
    fuelLevelIn: { type: String },
    driverName: { type: String },
    driverLicenceUrl: { type: String },
    notes: { type: String },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    source: {
      type: String,
      enum: ["MANUAL", "FORM"],
      default: "MANUAL"
    },
    status: {
      type: String,
      enum: ["OUT", "RETURNED"],
      default: "OUT"
    },
  },
  { timestamps: true }
);

courtesyAllocationSchema.plugin(toJSON);

// Indexes for dashboard and courtesy queries
courtesyAllocationSchema.index({ dealerId: 1, dateDueBack: 1, dateReturned: 1 });
courtesyAllocationSchema.index({ dealerId: 1, status: 1 });
courtesyAllocationSchema.index({ courtesyVehicleId: 1, status: 1 });

export default mongoose.models.CourtesyAllocation || mongoose.model("CourtesyAllocation", courtesyAllocationSchema);
