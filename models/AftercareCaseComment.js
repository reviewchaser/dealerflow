import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const aftercareCaseCommentSchema = new mongoose.Schema(
  {
    aftercareCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "AftercareCase", required: true },
    authorType: { 
      type: String, 
      enum: ["staff", "customer", "bot"],
      required: true
    },
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // only for staff
    content: { type: String, required: true },
    attachments: { type: Array, default: [] }, // list of file URLs
  },
  { timestamps: true }
);

aftercareCaseCommentSchema.plugin(toJSON);
export default mongoose.models.AftercareCaseComment || mongoose.model("AftercareCaseComment", aftercareCaseCommentSchema);
