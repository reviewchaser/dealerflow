import connectMongo from "@/libs/mongoose";
import AddOnProduct from "@/models/AddOnProduct";
import { withDealerContext } from "@/libs/authContext";

/**
 * Individual Add-On Product API
 * GET /api/addons/[id] - Get single add-on
 * PUT /api/addons/[id] - Update add-on
 * DELETE /api/addons/[id] - Soft delete (set isActive: false)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid add-on ID" });
  }

  if (req.method === "GET") {
    const addOn = await AddOnProduct.findOne({ _id: id, dealerId }).lean();

    if (!addOn) {
      return res.status(404).json({ error: "Add-on product not found" });
    }

    return res.status(200).json({
      ...addOn,
      id: addOn._id.toString(),
      _id: undefined,
      __v: undefined,
    });
  }

  if (req.method === "PUT") {
    const {
      name,
      description,
      category,
      defaultPriceNet,
      vatTreatment,
      vatRate,
      costPrice,
      supplierId,
      isActive,
      displayOrder,
    } = req.body;

    const updateData = {
      updatedByUserId: userId,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (defaultPriceNet !== undefined) updateData.defaultPriceNet = defaultPriceNet;
    if (vatTreatment !== undefined) updateData.vatTreatment = vatTreatment;
    if (vatRate !== undefined) updateData.vatRate = vatRate;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const addOn = await AddOnProduct.findOneAndUpdate(
      { _id: id, dealerId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!addOn) {
      return res.status(404).json({ error: "Add-on product not found" });
    }

    return res.status(200).json(addOn.toJSON());
  }

  if (req.method === "DELETE") {
    // Soft delete by setting isActive to false
    const addOn = await AddOnProduct.findOneAndUpdate(
      { _id: id, dealerId },
      { $set: { isActive: false, updatedByUserId: userId } },
      { new: true }
    );

    if (!addOn) {
      return res.status(404).json({ error: "Add-on product not found" });
    }

    return res.status(200).json({ success: true, message: "Add-on archived" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
