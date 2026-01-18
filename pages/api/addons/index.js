import connectMongo from "@/libs/mongoose";
import AddOnProduct from "@/models/AddOnProduct";
import { withDealerContext } from "@/libs/authContext";

/**
 * Add-On Products API
 * GET /api/addons - List add-on products
 * POST /api/addons - Create new add-on product
 *
 * Query params:
 * - category: Filter by category
 * - active: true|false (defaults to true)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;

  if (req.method === "GET") {
    const { category, active } = req.query;

    let query = { dealerId };

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Filter by active status (default to showing active only)
    if (active === "false") {
      query.isActive = false;
    } else if (active !== "all") {
      query.isActive = { $ne: false };
    }

    const addOns = await AddOnProduct.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Transform IDs
    const transformed = addOns.map(a => ({
      ...a,
      id: a._id.toString(),
      _id: undefined,
      __v: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === "POST") {
    const {
      name,
      description,
      category,
      defaultPriceNet,
      defaultPriceGross,  // NEW: User enters gross, model calculates net
      vatTreatment,
      vatRate,
      costPrice,
      supplierId,
      displayOrder,
      claimLimit,  // WARRANTY-specific
      termMonths,  // WARRANTY-specific
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Require either gross or net price (gross preferred)
    if ((defaultPriceGross === undefined || defaultPriceGross === null) &&
        (defaultPriceNet === undefined || defaultPriceNet === null)) {
      return res.status(400).json({ error: "Price is required" });
    }

    const addOn = await AddOnProduct.create({
      dealerId,
      name,
      description,
      category: category || "OTHER",
      defaultPriceGross,  // Model pre-save hook calculates net from this
      defaultPriceNet: defaultPriceGross ? undefined : defaultPriceNet,  // Only use if gross not provided
      vatTreatment: vatTreatment || "STANDARD",
      vatRate: vatRate ?? 0.2,
      costPrice,
      supplierId,
      displayOrder: displayOrder ?? 0,
      // WARRANTY-specific fields
      claimLimit: category === "WARRANTY" ? claimLimit : undefined,
      termMonths: category === "WARRANTY" ? termMonths : undefined,
      createdByUserId: userId,
    });

    return res.status(201).json(addOn.toJSON());
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
