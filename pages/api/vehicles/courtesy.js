import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";

export default async function handler(req, res) {
  try {
    await connectMongo();

    if (req.method === "GET") {
      // Get all courtesy vehicles
      const vehicles = await Vehicle.find({ type: "COURTESY" })
        .sort({ regCurrent: 1 })
        .lean();

      // Transform to include id field
      const transformed = vehicles.map(v => ({
        id: v._id.toString(),
        regCurrent: v.regCurrent,
        make: v.make,
        model: v.model,
        year: v.year,
        colour: v.colour,
        fuelType: v.fuelType,
        mileageCurrent: v.mileageCurrent,
        status: v.status,
      }));

      return res.status(200).json(transformed);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error fetching courtesy vehicles:", error);
    return res.status(500).json({ error: error.message });
  }
}
