import mongoose from "mongoose";

/**
 * Day Entry Schema - Individual day entry within an overtime submission
 */
const dayEntrySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      required: true,
    },
    startTime: {
      type: String, // HH:MM format
      default: null,
    },
    endTime: {
      type: String, // HH:MM format
      default: null,
    },
    startFinishText: {
      type: String, // Free text alternative (e.g., "8am - 6pm")
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
    },
    breakMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 480, // Max 8 hours break
    },
  },
  { _id: false }
);

/**
 * Overtime Submission Schema
 * One submission per user per week (weekStartDate = Monday)
 */
const overtimeSubmissionSchema = new mongoose.Schema(
  {
    // Tenant scoping
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    // Owner of this submission
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of user's display name at creation time
    userDisplayNameSnapshot: {
      type: String,
      required: true,
    },

    // Week identifier (always a Monday, stored as start of day UTC)
    weekStartDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Status workflow: DRAFT → SUBMITTED → APPROVED | REJECTED
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },

    // Day entries (Mon-Sun)
    entries: {
      type: [dayEntrySchema],
      default: [],
    },

    // Computed total overtime hours (calculated on save)
    totalOvertimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional notes from user
    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },

    // Audit: Submission
    submittedAt: {
      type: Date,
      default: null,
    },

    // Audit: Approval
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByName: {
      type: String,
      default: null,
    },

    // Audit: Rejection
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedByName: {
      type: String,
      default: null,
    },
    rejectedReason: {
      type: String,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound unique index: one submission per user per week per dealer
overtimeSubmissionSchema.index(
  { dealerId: 1, userId: 1, weekStartDate: 1 },
  { unique: true }
);

// Index for admin listing (status + dealer)
overtimeSubmissionSchema.index({ dealerId: 1, status: 1, submittedAt: -1 });

// Index for user's own submissions
overtimeSubmissionSchema.index({ dealerId: 1, userId: 1, weekStartDate: -1 });

/**
 * Pre-save hook: compute totalOvertimeHours from entries
 */
overtimeSubmissionSchema.pre("save", function (next) {
  if (this.entries && this.entries.length > 0) {
    this.totalOvertimeHours = this.entries.reduce((sum, entry) => {
      return sum + (entry.overtimeHours || 0);
    }, 0);
  } else {
    this.totalOvertimeHours = 0;
  }
  next();
});

/**
 * Static method: Get the Monday of a given date's week
 */
overtimeSubmissionSchema.statics.getWeekStartDate = function (date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
};

/**
 * Static method: Check if a submission can be edited
 */
overtimeSubmissionSchema.statics.canEdit = function (submission, userId) {
  // Only DRAFT status can be edited
  if (submission.status !== "DRAFT") {
    return false;
  }
  // Only the owner can edit
  return submission.userId.toString() === userId.toString();
};

/**
 * Static method: Check if a submission can be submitted
 */
overtimeSubmissionSchema.statics.canSubmit = function (submission, userId) {
  // Only DRAFT status can be submitted
  if (submission.status !== "DRAFT") {
    return false;
  }
  // Only the owner can submit
  return submission.userId.toString() === userId.toString();
};

/**
 * Static method: Check if admin can approve/reject
 */
overtimeSubmissionSchema.statics.canReview = function (submission) {
  // Only SUBMITTED status can be reviewed
  return submission.status === "SUBMITTED";
};

// Prevent model recompilation in dev mode
export default mongoose.models.OvertimeSubmission ||
  mongoose.model("OvertimeSubmission", overtimeSubmissionSchema);
