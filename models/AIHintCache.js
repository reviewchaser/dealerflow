import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const aiHintCacheSchema = new mongoose.Schema(
  {
    make: { type: String, required: true },
    model: { type: String, required: true },
    engineSize: { type: String }, // e.g. "2.0", "1.6"
    fuelType: { type: String },
    yearFrom: { type: Number },
    yearTo: { type: Number },
    hintsText: { type: String, required: true }, // the AI generated hints
  },
  { timestamps: true }
);

// Index for lookup
aiHintCacheSchema.index({ make: 1, model: 1, engineSize: 1, fuelType: 1 });

aiHintCacheSchema.plugin(toJSON);
export default mongoose.models.AIHintCache || mongoose.model("AIHintCache", aiHintCacheSchema);
