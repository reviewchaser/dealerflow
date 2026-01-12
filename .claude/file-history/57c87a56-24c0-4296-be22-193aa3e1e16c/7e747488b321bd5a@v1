import connectMongo from "@/libs/mongoose";
import VehicleLabel from "@/models/VehicleLabel";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const labels = await VehicleLabel.find({ dealerId }).sort({ name: 1 }).lean();
    // Transform _id to id
    const result = labels.map(label => ({
      id: label._id.toString(),
      name: label.name,
      colour: label.colour,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
    }));
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const { name, colour = "#6366f1" } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const label = await VehicleLabel.create({ dealerId, name, colour });
    return res.status(201).json({
      id: label._id.toString(),
      name: label.name,
      colour: label.colour,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
