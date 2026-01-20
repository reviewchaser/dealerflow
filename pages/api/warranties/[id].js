import connectMongo from "@/libs/mongoose";
import WarrantyProduct from "@/models/WarrantyProduct";
import { withDealerContext } from "@/libs/authContext";

/**
 * Individual Warranty Product API
 * GET /api/warranties/[id] - Get single warranty
 * PUT /api/warranties/[id] - Update warranty
 * DELETE /api/warranties/[id] - Soft delete (set isActive: false)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid warranty ID" });
  }

  if (req.method === "GET") {
    const warranty = await WarrantyProduct.findOne({ _id: id, dealerId }).lean();

    if (!warranty) {
      return res.status(404).json({ error: "Warranty product not found" });
    }

    // Calculate virtuals
    let priceNet = warranty.priceGross || 0;
    let vatAmount = 0;
    if (warranty.vatTreatment === "STANDARD" && warranty.priceGross) {
      priceNet = Math.round((warranty.priceGross / (1 + (warranty.vatRate || 0.2))) * 100) / 100;
      vatAmount = Math.round((warranty.priceGross - priceNet) * 100) / 100;
    }

    return res.status(200).json({
      ...warranty,
      id: warranty._id.toString(),
      priceNet,
      vatAmount,
      _id: undefined,
      __v: undefined,
    });
  }

  if (req.method === "PUT") {
    const {
      name,
      description,
      priceGross,
      vatTreatment,
      vatRate,
      termMonths,
      claimLimit,
      costPrice,
      isActive,
      displayOrder,
    } = req.body;

    const updateData = {
      updatedByUserId: userId,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priceGross !== undefined) updateData.priceGross = priceGross;
    if (vatTreatment !== undefined) updateData.vatTreatment = vatTreatment;
    if (vatRate !== undefined) updateData.vatRate = vatRate;
    if (termMonths !== undefined) updateData.termMonths = termMonths;
    if (claimLimit !== undefined) updateData.claimLimit = claimLimit;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const warranty = await WarrantyProduct.findOneAndUpdate(
      { _id: id, dealerId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!warranty) {
      return res.status(404).json({ error: "Warranty product not found" });
    }

    return res.status(200).json(warranty.toJSON());
  }

  if (req.method === "DELETE") {
    // Soft delete by setting isActive to false
    const warranty = await WarrantyProduct.findOneAndUpdate(
      { _id: id, dealerId },
      { $set: { isActive: false, updatedByUserId: userId } },
      { new: true }
    );

    if (!warranty) {
      return res.status(404).json({ error: "Warranty product not found" });
    }

    return res.status(200).json({ success: true, message: "Warranty archived" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
