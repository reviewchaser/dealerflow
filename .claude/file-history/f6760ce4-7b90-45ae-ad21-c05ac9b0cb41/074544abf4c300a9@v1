import mongoose from "mongoose";
import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import { requireDealerContext } from "@/libs/authContext";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, getBucket } from "@/libs/r2Client";

/**
 * Vehicle Images API
 *
 * POST /api/vehicles/[id]/images - Add an image to a vehicle
 * DELETE /api/vehicles/[id]/images - Remove an image from a vehicle
 */
export default async function handler(req, res) {
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

  // POST - Add image
  if (req.method === "POST") {
    try {
      const { url, key } = req.body;

      // Validate required fields
      if (!url || !key) {
        return res.status(400).json({ error: "Missing required fields: url, key" });
      }

      // Validate URL format (basic check)
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Check for duplicate key
      const existingImage = vehicle.images?.find((img) => img.key === key);
      if (existingImage) {
        return res.status(409).json({ error: "Image already exists" });
      }

      // Add image to the vehicle
      const newImage = {
        url,
        key,
        uploadedAt: new Date(),
      };

      if (!vehicle.images) {
        vehicle.images = [];
      }
      vehicle.images.push(newImage);

      // Set primary image if this is the first image
      if (!vehicle.primaryImageUrl) {
        vehicle.primaryImageUrl = url;
      }

      // Track who updated
      vehicle.updatedByUserId = userId;

      await vehicle.save();

      return res.status(200).json({
        message: "Image added successfully",
        vehicle: vehicle.toJSON(),
      });
    } catch (error) {
      console.error("[Vehicle Images] Error adding image:", error.message);
      return res.status(500).json({ error: "Failed to add image" });
    }
  }

  // DELETE - Remove image
  if (req.method === "DELETE") {
    try {
      const { key } = req.body;

      if (!key) {
        return res.status(400).json({ error: "Missing required field: key" });
      }

      // Find the image
      const imageIndex = vehicle.images?.findIndex((img) => img.key === key);
      if (imageIndex === -1 || imageIndex === undefined) {
        return res.status(404).json({ error: "Image not found" });
      }

      const removedImage = vehicle.images[imageIndex];

      // Remove from vehicle
      vehicle.images.splice(imageIndex, 1);

      // Update primary image if needed
      if (vehicle.primaryImageUrl === removedImage.url) {
        vehicle.primaryImageUrl = vehicle.images[0]?.url || null;
      }

      // Track who updated
      vehicle.updatedByUserId = userId;

      await vehicle.save();

      // Try to delete from R2 (non-blocking, log errors)
      try {
        const r2Client = getR2Client();
        const bucket = getBucket();
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
      } catch (r2Error) {
        // Log but don't fail the request - the DB update succeeded
        console.warn("[Vehicle Images] Failed to delete from R2:", r2Error.message);
      }

      return res.status(200).json({
        message: "Image removed successfully",
        vehicle: vehicle.toJSON(),
      });
    } catch (error) {
      console.error("[Vehicle Images] Error removing image:", error.message);
      return res.status(500).json({ error: "Failed to remove image" });
    }
  }

  // GET - List images
  if (req.method === "GET") {
    return res.status(200).json({
      images: vehicle.images || [],
      primaryImageUrl: vehicle.primaryImageUrl,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
