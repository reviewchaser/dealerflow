import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const reviewResponseSchema = new mongoose.Schema(
  {
    reviewRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "ReviewRequest", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    publicReviewPlatform: { 
      type: String, 
      enum: ["google", "other", "none"],
      default: "none"
    },
    publicReviewSubmitted: { type: Boolean, default: false },
    privateFeedbackFormSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },
  },
  { timestamps: true }
);

reviewResponseSchema.plugin(toJSON);
export default mongoose.models.ReviewResponse || mongoose.model("ReviewResponse", reviewResponseSchema);
