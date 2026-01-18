import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import Vehicle from "@/models/Vehicle";
import Dealer from "@/models/Dealer";

/**
 * GET /api/public/driver-delivery/search
 * Search for deals awaiting delivery by VRM
 *
 * Query params:
 * - vrm: Vehicle registration (partial match, case insensitive)
 * - dealerSlug: Dealer slug to scope the search
 *
 * Returns matching deals that are INVOICED or DELIVERED (awaiting delivery completion)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { vrm, dealerSlug } = req.query;

    if (!vrm || vrm.length < 2) {
      return res.status(400).json({ error: "VRM must be at least 2 characters" });
    }

    if (!dealerSlug) {
      return res.status(400).json({ error: "Dealer slug is required" });
    }

    await connectMongo();

    // Find dealer by slug
    const dealer = await Dealer.findOne({ slug: dealerSlug }).lean();
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Normalize VRM for search (remove spaces, uppercase)
    const normalizedVrm = vrm.toUpperCase().replace(/\s/g, "");

    // Find vehicles matching the VRM
    const vehicles = await Vehicle.find({
      dealerId: dealer._id,
      regCurrent: { $regex: normalizedVrm, $options: "i" },
    }).lean();

    if (vehicles.length === 0) {
      return res.status(200).json({ deals: [] });
    }

    const vehicleIds = vehicles.map((v) => v._id);

    // Find deals for these vehicles that are awaiting delivery
    // Status: INVOICED (not yet delivered) or DELIVERED (delivered but not completed)
    const deals = await Deal.find({
      dealerId: dealer._id,
      vehicleId: { $in: vehicleIds },
      status: { $in: ["INVOICED", "DELIVERED"] },
      // Must have a driver link generated
      "signature.driverLinkToken": { $exists: true, $ne: null },
      // Link must not be expired
      "signature.driverLinkExpiresAt": { $gt: new Date() },
    })
      .populate("vehicleId", "regCurrent make model colour year")
      .populate("soldToContactId", "firstName lastName companyName")
      .lean();

    // Format response
    const results = deals.map((deal) => ({
      dealId: deal._id.toString(),
      vrm: deal.vehicleId?.regCurrent || "",
      vehicle: `${deal.vehicleId?.make || ""} ${deal.vehicleId?.model || ""}`.trim(),
      colour: deal.vehicleId?.colour || "",
      year: deal.vehicleId?.year || "",
      customer: deal.soldToContactId?.companyName ||
        `${deal.soldToContactId?.firstName || ""} ${deal.soldToContactId?.lastName || ""}`.trim(),
      status: deal.status,
      hasPinRequired: !!deal.signature?.driverLinkPinHash,
      invoiceNumber: deal.invoiceNumber || null,
    }));

    return res.status(200).json({ deals: results });
  } catch (error) {
    console.error("[driver-delivery/search] Error:", error);
    return res.status(500).json({ error: error.message || "Search failed" });
  }
}
