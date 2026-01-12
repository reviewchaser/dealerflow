import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const contactSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    notes: { type: String },
    // Audit fields
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

contactSchema.plugin(toJSON);
export default mongoose.models.Contact || mongoose.model("Contact", contactSchema);
