/**
 * Agent Appraisal Submission API
 *
 * POST - Submit a full appraisal via agent share link (token-based, no auth required)
 * Used by third-party agents/contractors to submit appraisals on behalf of dealers
 */

import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import AppraisalShareLink from "@/models/AppraisalShareLink";
import Appraisal from "@/models/Appraisal";
import AppraisalIssue from "@/models/AppraisalIssue";
import Dealer from "@/models/Dealer";

// Hash token with SHA256
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Normalize VRM (strip spaces, uppercase)
function normalizeVrm(vrm) {
  return vrm?.replace(/\s/g, "").toUpperCase() || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  try {
    const { token, ...formData } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Validate token
    const tokenHash = hashToken(token);
    const link = await AppraisalShareLink.findOne({ tokenHash }).lean();

    if (!link) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    if (!link.isActive) {
      return res.status(403).json({ error: "This link has been deactivated" });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(403).json({ error: "This link has expired" });
    }

    // Verify this is an agent appraisal link
    if (link.linkType !== "agent_appraisal") {
      return res.status(400).json({ error: "Invalid link type for this form" });
    }

    // Get dealer info
    const dealer = await Dealer.findById(link.dealerId).lean();
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    const {
      agentName,
      agentEmail,
      agentPhone,
      agentCompany,
      vehicleReg,
      vin,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      mileage,
      colour,
      fuelType,
      transmission,
      dateOfRegistration,
      conditionNotes,
      proposedPurchasePrice,
      prepTemplateId,
      v5Url,
      serviceHistoryUrl,
      otherDocuments,
      genericPhotos,
      issues,
    } = formData;

    // Validate required fields
    if (!vehicleReg) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    const normalizedVrm = normalizeVrm(vehicleReg);

    // Build notes with agent info
    let fullConditionNotes = conditionNotes || "";
    if (agentName || agentCompany) {
      fullConditionNotes = `[Submitted by: ${agentName || "Agent"}${agentCompany ? ` (${agentCompany})` : ""}]\n\n${fullConditionNotes}`;
    }

    // Create appraisal
    const appraisal = await Appraisal.create({
      dealerId: dealer._id,
      vehicleReg: normalizedVrm,
      vin: vin || undefined,
      vehicleMake: vehicleMake || "",
      vehicleModel: vehicleModel || "",
      vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
      mileage: mileage ? parseInt(mileage) : null,
      colour: colour || "",
      fuelType: fuelType || "",
      transmission: transmission || "",
      conditionNotes: fullConditionNotes.trim(),
      proposedPurchasePrice: proposedPurchasePrice ? parseInt(proposedPurchasePrice) : null,
      decision: "pending",
      prepTemplateId: prepTemplateId || undefined,
      // Documents and photos
      v5Url: v5Url || undefined,
      serviceHistoryUrl: serviceHistoryUrl || undefined,
      otherDocuments: Array.isArray(otherDocuments) ? otherDocuments : [],
      genericPhotos: Array.isArray(genericPhotos) ? genericPhotos : [],
      // Link to share link
      shareLinkId: link._id,
      // Agent info
      submitterName: agentName || "",
      submitterEmail: agentEmail || "",
      submitterPhone: agentPhone || "",
    });

    // Create issues if provided
    if (Array.isArray(issues) && issues.length > 0) {
      for (const issue of issues) {
        if (issue.category && issue.description) {
          await AppraisalIssue.create({
            appraisalId: appraisal._id,
            category: issue.category,
            subcategory: issue.subcategory || "",
            description: issue.description,
            actionNeeded: issue.actionNeeded || "",
            estimatedCost: issue.estimatedCost ? parseFloat(issue.estimatedCost) : null,
            status: "outstanding",
            notes: issue.notes || "",
            faultCodes: issue.faultCodes || "",
            photos: Array.isArray(issue.photos) ? issue.photos : [],
          });
        }
      }
    }

    // Update link usage stats
    await AppraisalShareLink.updateOne(
      { _id: link._id },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      }
    );

    console.log(`[AgentAppraisal] New appraisal submitted for ${normalizedVrm} by agent ${agentName || "Unknown"} to dealer ${dealer.name}`);

    return res.status(201).json({
      success: true,
      appraisalId: appraisal._id,
    });
  } catch (error) {
    console.error("Error creating agent appraisal:", error);
    return res.status(500).json({ error: "Failed to submit appraisal" });
  }
}
