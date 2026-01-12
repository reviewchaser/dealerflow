import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import { requireDealerContext } from "@/libs/authContext";

export default async function handler(req, res) {
  try {
    await connectMongo();

    if (req.method === "GET") {
      // Get dealer context - tenant scoping
      const ctx = await requireDealerContext(req, res);
      const { dealerId } = ctx;

      const { search } = req.query;

      // Get stock vehicles that are available (live, reserved, in_stock, in_prep)
      // Scoped to current dealer - prevents showing other dealers' vehicles
      let query = {
        dealerId,
        type: "STOCK",
        status: { $in: ["live", "reserved", "in_stock", "in_prep"] }
      };

      const vehicles = await Vehicle.find(query)
        .sort({ createdAt: -1 }) // Sort newest first for duplicate VRMs
        .lean();

      // Transform and optionally filter by search term
      let transformed = vehicles.map(v => ({
        id: v._id.toString(),
        regCurrent: v.regCurrent,
        make: v.make,
        model: v.model,
        year: v.year,
        colour: v.colour,
        fuelType: v.fuelType,
        status: v.status,
        displayName: `${v.regCurrent} - ${v.make} ${v.model}${v.year ? ` (${v.year})` : ""}`,
      }));

      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        transformed = transformed.filter(v =>
          v.regCurrent.toLowerCase().includes(searchLower) ||
          v.make.toLowerCase().includes(searchLower) ||
          v.model.toLowerCase().includes(searchLower) ||
          v.displayName.toLowerCase().includes(searchLower)
        );
      }

      return res.status(200).json(transformed);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error fetching stock vehicles:", error);
    return res.status(500).json({ error: error.message });
  }
}
