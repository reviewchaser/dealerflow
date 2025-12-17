import connectMongo from "@/libs/mongoose";
import VehicleDocument from "@/models/VehicleDocument";

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query; // vehicleId

  if (req.method === "GET") {
    try {
      const documents = await VehicleDocument.find({ vehicleId: id }).sort({ createdAt: -1 }).lean();
      return res.status(200).json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      return res.status(500).json({ error: "Failed to fetch documents" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, type, url } = req.body;

      if (!name || !type || !url) {
        return res.status(400).json({ error: "Name, type, and URL are required" });
      }

      const document = await VehicleDocument.create({
        vehicleId: id,
        name,
        type,
        url,
      });

      return res.status(201).json(document.toJSON());
    } catch (error) {
      console.error("Error creating document:", error);
      return res.status(500).json({ error: "Failed to create document" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
