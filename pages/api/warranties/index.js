import connectMongo from "@/libs/mongoose";
import WarrantyProduct from "@/models/WarrantyProduct";
import { withDealerContext } from "@/libs/authContext";

/**
 * Warranty Products API
 * GET /api/warranties - List warranty products
 * POST /api/warranties - Create new warranty product
 *
 * Query params:
 * - active: true|false|all (defaults to true)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;

  if (req.method === "GET") {
    const { active } = req.query;

    let query = { dealerId };

    // Filter by active status (default to showing active only)
    if (active === "false") {
      query.isActive = false;
    } else if (active !== "all") {
      query.isActive = { $ne: false };
    }

    const warranties = await WarrantyProduct.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Transform IDs and include virtuals
    const transformed = warranties.map(w => {
      // Calculate virtuals since lean() doesn't include them
      let priceNet = w.priceGross || 0;
      let vatAmount = 0;
      if (w.vatTreatment === "STANDARD" && w.priceGross) {
        priceNet = Math.round((w.priceGross / (1 + (w.vatRate || 0.2))) * 100) / 100;
        vatAmount = Math.round((w.priceGross - priceNet) * 100) / 100;
      }

      return {
        ...w,
        id: w._id.toString(),
        priceNet,
        vatAmount,
        _id: undefined,
        __v: undefined,
      };
    });

    return res.status(200).json(transformed);
  }

  if (req.method === "POST") {
    const {
      name,
      description,
      priceGross,
      vatTreatment,
      vatRate,
      termMonths,
      claimLimit,
      costPrice,
      displayOrder,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const warranty = await WarrantyProduct.create({
      dealerId,
      name,
      description,
      priceGross: priceGross ?? 0,
      vatTreatment: vatTreatment || "NO_VAT",
      vatRate: vatRate ?? 0.2,
      termMonths,
      claimLimit,
      costPrice,
      displayOrder: displayOrder ?? 0,
      createdByUserId: userId,
    });

    return res.status(201).json(warranty.toJSON());
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
