import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const leadSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
    primaryVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    source: { 
      type: String, 
      enum: ["website_form", "website_chat", "px_form", "phone_log", "manual", "warranty", "review", "other"],
      default: "manual"
    },
    status: { 
      type: String, 
      enum: ["new", "in_progress", "test_drive_booked", "reserved", "sold", "lost", "aftercare"],
      default: "new"
    },
    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Object }, // URL, UTM tags, etc.
  },
  { timestamps: true }
);

leadSchema.plugin(toJSON);
export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
