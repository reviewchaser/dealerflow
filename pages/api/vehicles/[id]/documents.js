import connectMongo from "@/libs/mongoose";
import VehicleDocument from "@/models/VehicleDocument";
import Vehicle from "@/models/Vehicle";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";
import { logDocumentUploaded } from "@/libs/activityLogger";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId, user } = ctx;
  const { id } = req.query; // vehicleId

  // Verify vehicle belongs to this dealer
  const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

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
        uploadedBy: userId,
      });

      // Get actor name for activity logging
      const actor = await User.findById(userId).lean();
      const actorName = actor?.name || user?.name || user?.email || "System";

      // Log to ActivityLog for dashboard feed
      await logDocumentUploaded({
        dealerId,
        vehicleId: id,
        vehicleReg: vehicle.regCurrent,
        vehicleMakeModel: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
        documentName: name,
        documentType: type,
        userId,
        userName: actorName,
      });

      return res.status(201).json(document.toJSON());
    } catch (error) {
      console.error("Error creating document:", error);
      return res.status(500).json({ error: "Failed to create document" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
