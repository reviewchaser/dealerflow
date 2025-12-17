import connectMongo from "@/libs/mongoose";
import VehicleLocation from "@/models/VehicleLocation";

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const location = await VehicleLocation.findByIdAndDelete(id);

      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }

      return res.status(200).json({ message: "Location deleted" });
    } catch (error) {
      console.error("Error deleting location:", error);
      return res.status(500).json({ error: "Failed to delete location" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
