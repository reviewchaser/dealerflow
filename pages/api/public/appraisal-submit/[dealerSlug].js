/**
 * Public Dealer Buying Appraisal Submission API
 *
 * POST - Submit a dealer buying appraisal (public, no auth required)
 */

import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import Appraisal from "@/models/Appraisal";
import Contact from "@/models/Contact";

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
    const { dealerSlug } = req.query;

    // Find dealer by slug or ID
    let dealer = await Dealer.findOne({ slug: dealerSlug }).lean();
    if (!dealer) {
      // Try finding by ID
      dealer = await Dealer.findById(dealerSlug).lean();
    }

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    const {
      submitterName,
      submitterEmail,
      submitterPhone,
      submitterCompany,
      vehicleReg,
      vin,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      mileage,
      colour,
      fuelType,
      conditionRating,
      conditionNotes,
      proposedPurchasePrice,
      hasV5,
      hasServiceHistory,
    } = req.body;

    // Validate required fields
    if (!submitterName || !submitterEmail || !vehicleReg) {
      return res.status(400).json({ error: "Name, email, and vehicle registration are required" });
    }

    const normalizedVrm = normalizeVrm(vehicleReg);

    // Create or find contact
    let contact = await Contact.findOne({
      dealerId: dealer._id,
      email: submitterEmail.toLowerCase(),
    });

    if (!contact) {
      contact = await Contact.create({
        dealerId: dealer._id,
        name: submitterName,
        email: submitterEmail.toLowerCase(),
        phone: submitterPhone || "",
        notes: submitterCompany ? `Company: ${submitterCompany}` : "",
      });
    }

    // Build condition notes with document info
    let fullConditionNotes = conditionNotes || "";
    if (hasV5) {
      fullConditionNotes += `\nV5 Present: ${hasV5}`;
    }
    if (hasServiceHistory) {
      fullConditionNotes += `\nService History: ${hasServiceHistory}`;
    }
    if (conditionRating) {
      fullConditionNotes = `Condition: ${conditionRating}\n${fullConditionNotes}`;
    }

    // Create appraisal
    const appraisal = await Appraisal.create({
      dealerId: dealer._id,
      contactId: contact._id,
      vehicleReg: normalizedVrm,
      vin: vin || undefined,
      vehicleMake: vehicleMake || "",
      vehicleModel: vehicleModel || "",
      vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
      mileage: mileage ? parseInt(mileage) : null,
      colour: colour || "",
      fuelType: fuelType || "",
      conditionNotes: fullConditionNotes.trim(),
      proposedPurchasePrice: proposedPurchasePrice ? parseInt(proposedPurchasePrice) : null,
      decision: "pending",
      // Track that this came from public form
      submitterName,
      submitterEmail: submitterEmail.toLowerCase(),
      submitterPhone: submitterPhone || "",
    });

    console.log(`[PublicAppraisal] New appraisal submitted for ${normalizedVrm} to dealer ${dealer.name}`);

    return res.status(201).json({
      success: true,
      appraisalId: appraisal._id,
    });
  } catch (error) {
    console.error("Error creating public appraisal:", error);
    return res.status(500).json({ error: "Failed to submit appraisal" });
  }
}
