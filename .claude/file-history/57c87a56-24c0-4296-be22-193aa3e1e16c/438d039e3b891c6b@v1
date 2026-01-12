import connectMongo from "@/libs/mongoose";
import VehicleLocation from "@/models/VehicleLocation";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const locations = await VehicleLocation.find({ dealerId }).sort({ name: 1 }).lean();
    // Transform _id to id
    const result = locations.map(loc => ({
      id: loc._id.toString(),
      name: loc.name,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    }));
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const location = await VehicleLocation.create({ dealerId, name });
    return res.status(201).json({
      id: location._id.toString(),
      name: location.name,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
