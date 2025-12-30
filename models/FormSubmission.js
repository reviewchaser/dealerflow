import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const editHistorySchema = new mongoose.Schema({
  editedAt: { type: Date, default: Date.now },
  editedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  editedByName: { type: String },
  previousAnswers: { type: Object },
}, { _id: false });

// PDI Issue schema for structured issue data
const pdiIssueSchema = new mongoose.Schema({
  category: { type: String, enum: ["Cosmetic", "Mechanical", "Electrical", "Other"], required: true },
  subcategory: { type: String, required: true },
  description: { type: String, required: true },
  actionNeeded: { type: String },
  photos: [{ type: String }],
  status: { type: String, enum: ["Outstanding", "Ordered", "In Progress", "Complete"], default: "Outstanding" },
  notes: { type: String },
}, { _id: false });

const formSubmissionSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedByContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    linkedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    linkedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    linkedVehicleSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleSale" },
    linkedAftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase" },
    linkedAppraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "Appraisal" },
    linkedCustomerPXAppraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerPXAppraisal" },
    submittedAt: { type: Date, default: Date.now },
    rawAnswers: { type: Object, required: true }, // field_name → value
    viewed: { type: Boolean, default: false },
    viewedAt: { type: Date },
    viewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["new", "viewed", "actioned", "archived"], default: "new" },
    // Edit tracking
    editHistory: [editHistorySchema],
    lastEditedAt: { type: Date },
    lastEditedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastEditedByName: { type: String },
    // PDI Issues - structured issue data for automation
    pdiIssues: [pdiIssueSchema],
    // Track VehicleIssue IDs created from this submission (for idempotency)
    createdIssueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "VehicleIssue" }],
  },
  { timestamps: true }
);

formSubmissionSchema.plugin(toJSON);

// Indexes for dashboard and submission queries
formSubmissionSchema.index({ dealerId: 1, formId: 1 });
formSubmissionSchema.index({ dealerId: 1, submittedAt: -1 });
formSubmissionSchema.index({ dealerId: 1, status: 1 });

export default mongoose.models?.FormSubmission || mongoose.model("FormSubmission", formSubmissionSchema);
