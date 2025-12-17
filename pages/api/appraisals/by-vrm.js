import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    const { vrm } = req.query;

    if (!vrm) {
      return res.status(400).json({ error: "VRM required" });
    }

    // Normalize VRM
    const normalizedVrm = vrm.toUpperCase().replace(/\s/g, "");

    // Find appraisal for this VRM that hasn't been converted yet
    const appraisal = await Appraisal.findOne({
      vehicleReg: normalizedVrm,
      decision: { $in: ["pending", "reviewed"] }, // Not yet converted
    }).sort({ createdAt: -1 }).lean();

    if (!appraisal) {
      return res.status(404).json({ error: "No appraisal found for this VRM" });
    }

    return res.status(200).json({
      id: appraisal._id.toString(),
      vehicleReg: appraisal.vehicleReg,
      vehicleMake: appraisal.vehicleMake,
      vehicleModel: appraisal.vehicleModel,
      vehicleYear: appraisal.vehicleYear,
      mileage: appraisal.mileage,
      conditionNotes: appraisal.conditionNotes,
      proposedPurchasePrice: appraisal.proposedPurchasePrice,
      decision: appraisal.decision,
      createdAt: appraisal.createdAt,
    });
  } catch (error) {
    console.error("Error fetching appraisal by VRM:", error);
    return res.status(500).json({ error: "Failed to fetch appraisal" });
  }
}
