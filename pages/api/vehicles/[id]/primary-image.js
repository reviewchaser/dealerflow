import mongoose from "mongoose";
import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import { requireDealerContext } from "@/libs/authContext";

/**
 * Set primary image for a vehicle
 *
 * PUT /api/vehicles/[id]/primary-image
 * Body: { "url": "<imageUrl>" }
 */
export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  const ctx = await requireDealerContext(req, res);
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Validate vehicle ID
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid vehicle ID" });
  }

  // Find the vehicle (scoped to dealer)
  const vehicle = await Vehicle.findOne({ _id: id, dealerId });
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing required field: url" });
    }

    // Verify the URL is one of the vehicle's images
    const imageExists = vehicle.images?.some((img) => img.url === url);
    if (!imageExists) {
      return res.status(400).json({ error: "Image not found in vehicle gallery" });
    }

    // Update primary image
    vehicle.primaryImageUrl = url;
    vehicle.updatedByUserId = userId;

    await vehicle.save();

    return res.status(200).json({
      message: "Primary image updated",
      vehicle: vehicle.toJSON(),
    });
  } catch (error) {
    console.error("[Vehicle Primary Image] Error:", error.message);
    return res.status(500).json({ error: "Failed to update primary image" });
  }
}
