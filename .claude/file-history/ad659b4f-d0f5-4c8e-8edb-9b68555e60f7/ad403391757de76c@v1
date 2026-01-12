import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// AppraisalShareLink - Secure tokenized links for public appraisal submission
// Security: Raw token is NEVER stored. Only SHA256 hash is kept in DB.
// Flow:
// 1. Generate crypto.randomBytes(32).toString('hex') → rawToken
// 2. Hash with SHA256 → tokenHash (store this)
// 3. Return rawToken to user ONCE for URL
// 4. On public access: hash incoming token, lookup by tokenHash

const appraisalShareLinkSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true }, // SHA256 hash of raw token
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },
    expiresAt: { type: Date }, // default 60 days from creation
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

appraisalShareLinkSchema.plugin(toJSON);
export default mongoose.models.AppraisalShareLink || mongoose.model("AppraisalShareLink", appraisalShareLinkSchema);
