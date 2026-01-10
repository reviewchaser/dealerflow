import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import PrepSummaryShareLink from "@/models/PrepSummaryShareLink";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import Dealer from "@/models/Dealer";
import { refreshDealerLogoUrl } from "@/libs/r2Client";

// Hash token with SHA256
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  try {
    // Hash the token and look up the share link
    const tokenHash = hashToken(token);
    const shareLink = await PrepSummaryShareLink.findOne({ tokenHash }).lean();

    if (!shareLink) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    // Check if active and not expired
    if (!shareLink.isActive) {
      return res.status(404).json({ error: "This link has been deactivated" });
    }

    if (new Date() > new Date(shareLink.expiresAt)) {
      return res.status(404).json({ error: "This link has expired" });
    }

    // Update view count
    await PrepSummaryShareLink.findByIdAndUpdate(shareLink._id, {
      $inc: { viewCount: 1 },
      lastViewedAt: new Date(),
    });

    // Fetch vehicle, tasks, and outstanding issues
    const vehicle = await Vehicle.findById(shareLink.vehicleId).lean();
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const tasks = await VehicleTask.find({ vehicleId: shareLink.vehicleId })
      .sort({ createdAt: 1 })
      .lean();

    // Only fetch outstanding and ordered issues
    const issues = await VehicleIssue.find({
      vehicleId: shareLink.vehicleId,
      status: { $in: ["outstanding", "ordered", "Outstanding", "Ordered", "In Progress"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch dealer info and refresh logo URL if needed
    let dealer = await Dealer.findById(shareLink.dealerId).lean();
    if (dealer) {
      dealer = await refreshDealerLogoUrl(dealer);
    }

    return res.status(200).json({
      prepSummary: {
        vehicle: {
          vrm: vehicle.vrm,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          colour: vehicle.colour,
          fuelType: vehicle.fuelType,
          mileage: vehicle.mileage,
        },
        tasks: tasks.map((t) => ({
          id: t._id,
          name: t.name,
          status: t.status,
          completedAt: t.completedAt,
          partsStatus: t.partsStatus,
          partsOrders: t.partsOrders || [],
        })),
        issues: issues.map((i) => ({
          id: i._id,
          category: i.category,
          subcategory: i.subcategory,
          description: i.description,
          actionNeeded: i.actionNeeded,
          status: i.status,
          partsRequired: i.partsRequired,
          partsDetails: i.partsDetails,
        })),
      },
      dealer: dealer
        ? {
            name: dealer.name,
            phone: dealer.phone,
            email: dealer.email,
            address: dealer.address,
            logo: dealer.logoUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching prep summary:", error);
    return res.status(500).json({ error: "Failed to load prep summary" });
  }
}
