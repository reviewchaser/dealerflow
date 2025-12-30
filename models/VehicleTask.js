import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// Parts Status Enum - overall parts status for the task
const PARTS_STATUS = {
  NONE: "NONE",           // No parts needed or not tracked
  ORDERED: "ORDERED",     // Parts have been ordered
  AWAITING_DELIVERY: "AWAITING_DELIVERY", // Waiting for parts to arrive
  RECEIVED: "RECEIVED",   // Parts received
  NOT_REQUIRED: "NOT_REQUIRED", // Task doesn't need parts
};

// Supplier Type Enum
const SUPPLIER_TYPE = {
  EURO_CAR_PARTS: "EURO_CAR_PARTS",
  TPS: "TPS",
  MAIN_DEALER: "MAIN_DEALER",
  LOCAL_FACTOR: "LOCAL_FACTOR",
  ONLINE: "ONLINE",
  OTHER: "OTHER", // Requires supplierName to be set
};

// Supplier type labels for display
const SUPPLIER_TYPE_LABELS = {
  EURO_CAR_PARTS: "Euro Car Parts",
  TPS: "TPS",
  MAIN_DEALER: "Main Dealer",
  LOCAL_FACTOR: "Local Factor",
  ONLINE: "Online",
  OTHER: "Other",
};

// Parts Order subdocument schema
const partsOrderSchema = new mongoose.Schema(
  {
    supplierType: {
      type: String,
      enum: Object.values(SUPPLIER_TYPE),
      required: true,
    },
    supplierName: {
      type: String, // Required when supplierType is OTHER
    },
    orderRef: { type: String }, // Optional order reference
    orderedAt: { type: Date, default: Date.now },
    expectedAt: { type: Date }, // Optional expected delivery date
    receivedAt: { type: Date }, // When parts were received
    notes: { type: String }, // Short notes about this order
    status: {
      type: String,
      enum: Object.values(PARTS_STATUS),
      default: PARTS_STATUS.ORDERED,
    },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Legacy task progress for backwards compatibility
const TASK_PROGRESS = {
  NONE: "NONE",
  PARTS_ORDERED: "PARTS_ORDERED",
  AWAITING_PARTS: "AWAITING_PARTS",
  BOOKED_IN: "BOOKED_IN",
  IN_WORKSHOP: "IN_WORKSHOP",
};

const vehicleTaskSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    name: { type: String, required: true }, // e.g. "PDI", "Valet", "Oil service", "MOT", "Photos", "Delivery"
    status: {
      type: String,
      enum: ["pending", "in_progress", "done", "not_required", "PENDING", "IN_PROGRESS", "DONE", "NOT_REQUIRED"],
      default: "pending"
    },

    // Parts ordering - structured approach
    partsStatus: {
      type: String,
      enum: Object.values(PARTS_STATUS),
      default: PARTS_STATUS.NONE,
    },
    partsOrders: [partsOrderSchema], // Array of parts orders for this task

    // Legacy progress field (kept for backwards compatibility)
    progress: {
      type: String,
      enum: Object.values(TASK_PROGRESS),
      default: TASK_PROGRESS.NONE,
    },
    progressNote: { type: String },

    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    source: {
      type: String,
      enum: ["template", "manual", "from_form", "ai_hint", "system_default", "TEMPLATE", "MANUAL", "FROM_FORM", "AI_HINT", "SYSTEM_DEFAULT"],
      default: "manual"
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

vehicleTaskSchema.plugin(toJSON);

export default mongoose.models?.VehicleTask || mongoose.model("VehicleTask", vehicleTaskSchema);
export { TASK_PROGRESS, PARTS_STATUS, SUPPLIER_TYPE, SUPPLIER_TYPE_LABELS };
