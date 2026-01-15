import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import { requireDealerContext } from "@/libs/authContext";

// Map form-friendly status names to database status values
const STATUS_MAP = {
  IN_PREP: ["in_prep", "in_stock"],
  IN_STOCK: ["in_stock"],
  ADVERTISED: ["live"],
  LIVE: ["live"],
  RESERVED: ["reserved"],
  SOLD: ["sold"],
  DELIVERED: ["delivered"],
  COURTESY: ["in_stock", "live"], // For courtesy vehicles
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    // Get dealer context - tenant scoping
    const ctx = await requireDealerContext(req, res);
    const { dealerId } = ctx;

    const { q, statuses, excludeStatuses, vehicleType, limit = 10 } = req.query;

    // Build query with tenant scoping
    const query = { dealerId };

    // Filter by vehicle type (STOCK, COURTESY, etc.)
    if (vehicleType) {
      query.type = vehicleType;
    }

    // Filter by statuses
    if (statuses) {
      const statusArray = statuses.split(",");
      const dbStatuses = [];
      for (const status of statusArray) {
        const mapped = STATUS_MAP[status.toUpperCase()];
        if (mapped) {
          dbStatuses.push(...mapped);
        } else {
          // Try using the raw status value
          dbStatuses.push(status.toLowerCase());
        }
      }
      // Remove duplicates
      query.status = { $in: [...new Set(dbStatuses)] };
    }

    // Exclude specific statuses (e.g., exclude delivered vehicles from suggestions)
    if (excludeStatuses) {
      const excludeArray = excludeStatuses.split(",");
      const dbExcludeStatuses = [];
      for (const status of excludeArray) {
        const mapped = STATUS_MAP[status.toUpperCase()];
        if (mapped) {
          dbExcludeStatuses.push(...mapped);
        } else {
          dbExcludeStatuses.push(status.toLowerCase());
        }
      }
      // If we already have a status filter, combine with $nin
      if (query.status) {
        query.status.$nin = [...new Set(dbExcludeStatuses)];
      } else {
        query.status = { $nin: [...new Set(dbExcludeStatuses)] };
      }
    }

    // Search by VRM, make, model if query provided
    if (q && q.length >= 2) {
      const searchRegex = new RegExp(q.replace(/\s/g, ""), "i");
      query.$or = [
        { regCurrent: searchRegex },
        { make: { $regex: q, $options: "i" } },
        { model: { $regex: q, $options: "i" } },
      ];
    }

    const vehicles = await Vehicle.find(query)
      .sort({ updatedAt: -1, createdAt: -1 }) // Sort by most recent activity first
      .limit(parseInt(limit))
      .lean();

    // Transform for form use
    const results = vehicles.map((v) => ({
      id: v._id.toString(),
      vrm: v.regCurrent,
      regCurrent: v.regCurrent,
      make: v.make,
      model: v.model,
      year: v.year,
      colour: v.colour,
      fuelType: v.fuelType,
      transmission: v.transmission,
      mileage: v.mileageCurrent,
      status: v.status,
      type: v.type,
      updatedAt: v.updatedAt,
      createdAt: v.createdAt,
      soldAt: v.soldAt, // Include for archive detection
      displayName: `${v.regCurrent} - ${v.make} ${v.model}${v.year ? ` (${v.year})` : ""}`,
    }));

    return res.status(200).json(results);
  } catch (error) {
    console.error("Vehicle search error:", error);
    return res.status(error.status || 500).json({ error: error.message || "Failed to search vehicles" });
  }
}
