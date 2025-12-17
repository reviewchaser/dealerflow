import connectMongo from "@/libs/mongoose";
import VehicleTask from "@/models/VehicleTask";

export default async function handler(req, res) {
  try {
    await connectMongo();
    const { id } = req.query; // vehicleId

    if (!id) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    if (req.method === "GET") {
      const tasks = await VehicleTask.find({ vehicleId: id }).sort({ createdAt: 1 }).lean();
      return res.status(200).json(tasks);
    }

    if (req.method === "POST") {
      const { name, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Task name required" });

      const task = await VehicleTask.create({
        vehicleId: id,
        name,
        notes,
        status: "pending",
        source: "manual",
      });
      return res.status(201).json(task.toJSON());
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
