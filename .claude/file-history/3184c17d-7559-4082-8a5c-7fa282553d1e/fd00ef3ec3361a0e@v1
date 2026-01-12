import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json([]);
    }

    // Normalize search term
    const searchTerm = q.toUpperCase().replace(/\s/g, "");

    // Search both Dealer Appraisals and Customer PX Appraisals that haven't been converted
    const [dealerAppraisals, customerPXAppraisals] = await Promise.all([
      Appraisal.find({
        vehicleReg: { $regex: searchTerm, $options: "i" },
        vehicleId: { $exists: false }, // Not yet converted to stock
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      CustomerPXAppraisal.find({
        vehicleReg: { $regex: searchTerm, $options: "i" },
        vehicleId: { $exists: false }, // Not yet converted to stock
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Format results
    const results = [
      ...dealerAppraisals.map((a) => ({
        id: a._id.toString(),
        type: "dealer",
        vehicleReg: a.vehicleReg,
        vehicleMake: a.vehicleMake,
        vehicleModel: a.vehicleModel,
        vehicleYear: a.vehicleYear,
        mileage: a.mileage,
        decision: a.decision,
        createdAt: a.createdAt,
      })),
      ...customerPXAppraisals.map((a) => ({
        id: a._id.toString(),
        type: "customer_px",
        vehicleReg: a.vehicleReg,
        vehicleMake: a.vehicleMake,
        vehicleModel: a.vehicleModel,
        vehicleYear: a.vehicleYear,
        mileage: a.mileage,
        decision: a.decision,
        createdAt: a.createdAt,
      })),
    ];

    // Sort by most recent and limit total
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json(results.slice(0, 8));
  } catch (error) {
    console.error("Error searching unconverted appraisals:", error);
    return res.status(500).json({ error: "Failed to search appraisals" });
  }
}
