import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const formSubmissionFileSchema = new mongoose.Schema(
  {
    formSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission", required: true },
    fieldName: { type: String, required: true }, // which field the file was uploaded to
    url: { type: String, required: true },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number }, // in bytes
  },
  { timestamps: true }
);

formSubmissionFileSchema.plugin(toJSON);
export default mongoose.models.FormSubmissionFile || mongoose.model("FormSubmissionFile", formSubmissionFileSchema);
