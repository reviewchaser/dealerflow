import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const aftercareCaseSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleSale" },
    source: {
      type: String,
      enum: ["warranty_claim_form", "low_review", "complaint_form", "manual"],
      default: "manual"
    },
    status: {
      type: String,
      enum: ["new", "in_progress", "pending_third_party", "resolved", "closed"],
      default: "new"
    },
    // Board status for Customer/Warranty board
    boardStatus: {
      type: String,
      enum: ["not_booked_in", "on_site", "work_complete", "collected"],
      default: "not_booked_in"
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal"
    },
    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    summary: { type: String }, // short text
    details: { type: Object }, // text or json
    regAtPurchase: { type: String }, // reg at time of purchase if different
    currentReg: { type: String }, // current reg if vehicle was re-registered
    warrantyType: {
      type: String,
      enum: ["Dealer Warranty", "External Warranty"],
    },
    linkedSubmissionIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormSubmission"
    }],

    // Case-level attachments (separate from comment attachments)
    attachments: [{
      url: { type: String, required: true },
      filename: { type: String },
      uploadedAt: { type: Date, default: Date.now },
      uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }],

    // Timeline events - embedded array
    events: [{
      type: {
        type: String,
        enum: [
          "CASE_CREATED",
          "SUBMISSION_LINKED",
          "COMMENT_ADDED",
          "STATUS_CHANGED",
          "AI_REVIEW_GENERATED",
          "ATTACHMENT_ADDED",
          "LOCATION_UPDATED",
          "BOOKING_UPDATED",
          "PARTS_UPDATED",
          "COURTESY_REQUIRED_TOGGLED",
          "COURTESY_ALLOCATED",
          "COURTESY_RETURNED",
          "COURTESY_OUT_RECORDED",
          "COURTESY_IN_RECORDED",
          // Warranty booking auto-move events
          "WARRANTY_BOOKED_IN",
          "WARRANTY_BOOKING_UPDATED",
          "WARRANTY_BOOKING_CANCELLED",
          "WARRANTY_STAGE_MOVED"
        ],
        required: true
      },
      createdAt: { type: Date, default: Date.now },
      createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdByName: { type: String }, // snapshot of user name for display
      summary: { type: String },
      metadata: { type: mongoose.Schema.Types.Mixed }
    }],

    // Repair Location - tracks where the vehicle currently is
    repairLocationType: {
      type: String,
      enum: ["WITH_CUSTOMER", "ON_SITE", "THIRD_PARTY"],
      default: "WITH_CUSTOMER"  // New claims start with vehicle at customer
    },
    repairLocationName: { type: String }, // garage name when THIRD_PARTY
    repairLocationNotes: { type: String }, // notes about repair location

    // LEGACY: kept for backwards compatibility - do not use in new code
    repairLocationContact: { type: String },
    repairExpectedCompleteAt: { type: Date },

    // Booking fields
    bookedInAt: { type: Date }, // booking date/time
    linkedCalendarEventId: { type: mongoose.Schema.Types.ObjectId, ref: "CalendarEvent" }, // linked warranty booking calendar event
    previousBoardStatusBeforeBookedIn: { type: String }, // for restoring if booking removed

    // Parts fields
    partsRequired: { type: Boolean, default: false },
    partsNotes: { type: String },

    // Courtesy car fields
    courtesyRequired: { type: Boolean, default: false },
    courtesyAllocationId: { type: mongoose.Schema.Types.ObjectId, ref: "CourtesyAllocation" },
    // Courtesy summary for clean card display (populated from submissions)
    courtesy: {
      vehicleReg: { type: String },      // Courtesy car registration
      vehicleName: { type: String },     // e.g. "Ford Fiesta" for display
      outAt: { type: Date },             // When courtesy car was given out
      dueBack: { type: Date },           // Expected return date
      returnedAt: { type: Date },        // Actual return date (null if still out)
    },

    // AI Case Review - cached output
    aiReview: {
      generatedAt: { type: Date },
      generatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      payload: {
        summary: { type: String },
        possibleCauses: [{ type: String }],
        recommendedSteps: [{ type: String }],
        warrantyConsiderations: [{ type: String }],
        draftCustomerReply: { type: String },
        draftInternalNote: { type: String }
      }
    },
    // Audit fields
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

aftercareCaseSchema.plugin(toJSON);

// Indexes for dashboard and common queries
aftercareCaseSchema.index({ dealerId: 1, boardStatus: 1 });
aftercareCaseSchema.index({ dealerId: 1, status: 1 });
aftercareCaseSchema.index({ dealerId: 1, createdAt: -1 });

export default mongoose.models.AftercareCase || mongoose.model("AftercareCase", aftercareCaseSchema);
