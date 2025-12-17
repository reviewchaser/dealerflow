import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import AppraisalShareLink from "@/models/AppraisalShareLink";
import Appraisal from "@/models/Appraisal";
import Contact from "@/models/Contact";

// Hash token with SHA256
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// This endpoint is PUBLIC - no auth required
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  try {
    const {
      token,
      // Vehicle info
      vehicleReg,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      mileage,
      colour,
      fuelType,
      conditionNotes,
      // Contact info
      submitterName,
      submitterEmail,
      submitterPhone,
      // Documents/photos (optional)
      v5Url,
      serviceHistoryUrl,
      damagePhotos,
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!vehicleReg) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    // Hash the provided token to find the link
    const tokenHash = hashToken(token);
    const link = await AppraisalShareLink.findOne({ tokenHash });

    if (!link) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    // Check if link is active
    if (!link.isActive) {
      return res.status(403).json({ error: "This link has been deactivated" });
    }

    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(403).json({ error: "This link has expired" });
    }

    const dealerId = link.dealerId;

    // Normalize VRM
    const vrmNormalized = vehicleReg.toUpperCase().replace(/\s/g, "");

    // Try to find or create a contact if email provided
    let contactId = null;
    if (submitterEmail) {
      const emailLower = submitterEmail.toLowerCase().trim();
      let contact = await Contact.findOne({
        dealerId,
        email: { $regex: new RegExp(`^${emailLower}$`, "i") },
      });

      if (!contact && submitterName) {
        contact = await Contact.create({
          dealerId,
          name: submitterName,
          email: emailLower,
          phone: submitterPhone,
        });
      }

      if (contact) {
        contactId = contact._id;
      }
    }

    // Create the appraisal
    const appraisal = await Appraisal.create({
      dealerId,
      contactId,
      shareLinkId: link._id,
      vehicleReg: vrmNormalized,
      vehicleMake,
      vehicleModel,
      vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
      mileage: mileage ? parseInt(mileage) : null,
      colour,
      fuelType,
      conditionNotes,
      v5Url,
      serviceHistoryUrl,
      damagePhotos: damagePhotos || [],
      submitterName,
      submitterEmail: submitterEmail?.toLowerCase().trim(),
      submitterPhone,
      decision: "pending",
    });

    // Update link usage stats
    await AppraisalShareLink.updateOne(
      { _id: link._id },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      }
    );

    return res.status(201).json({
      success: true,
      appraisalId: appraisal._id,
      message: "Appraisal submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting appraisal via share link:", error);
    return res.status(500).json({ error: "Failed to submit appraisal" });
  }
}
