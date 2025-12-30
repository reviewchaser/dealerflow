import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const prepTaskTemplateSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    name: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

prepTaskTemplateSchema.plugin(toJSON);
export default mongoose.models?.PrepTaskTemplate || mongoose.model("PrepTaskTemplate", prepTaskTemplateSchema);
