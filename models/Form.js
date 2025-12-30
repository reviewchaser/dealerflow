import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

// Visibility modes:
// - INTERNAL: Requires login to access (staff only)
// - SHARE_LINK: Accessible without login via unguessable publicSlug URL, not listed publicly
// - PUBLIC: Accessible without login and can be shared/listed publicly
const VISIBILITY_MODES = ["INTERNAL", "SHARE_LINK", "PUBLIC"];

const formSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    name: { type: String, required: true }, // PDI, Delivery, Warranty Claim, etc.
    type: {
      type: String,
      enum: ["PDI", "TEST_DRIVE", "WARRANTY_CLAIM", "COURTESY_OUT", "COURTESY_IN", "DELIVERY", "SERVICE_RECEIPT", "REVIEW_FEEDBACK", "OTHER"],
      required: true
    },
    // New visibility field - replaces isPublic
    visibility: {
      type: String,
      enum: VISIBILITY_MODES,
      default: "PUBLIC"
    },
    // Deprecated: kept for backward compatibility during migration
    isPublic: { type: Boolean, default: false },
    publicSlug: { type: String }, // Unique per dealer (compound index below)
    layoutConfig: { type: Object }, // optional for advanced layouts
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index: publicSlug is unique per dealer (allows same slug for different dealers)
formSchema.index({ dealerId: 1, publicSlug: 1 }, { unique: true, sparse: true });

formSchema.plugin(toJSON);

// Use existing model or create new one (prevents OverwriteModelError in dev)
export default mongoose.models?.Form || mongoose.model("Form", formSchema);
