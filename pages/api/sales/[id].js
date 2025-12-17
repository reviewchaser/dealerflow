import connectMongo from "@/libs/mongoose";
import Sale from "@/models/Sale";
import Vehicle from "@/models/Vehicle";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method === "GET") {
    const sale = await Sale.findOne({ _id: id, dealerId })
      .populate("vehicleId")
      .populate("buyerId")
      .lean();

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    return res.status(200).json(sale);
  }

  if (req.method === "PUT") {
    const updates = req.body;

    // If marking as completed, update vehicle status to sold
    if (updates.status === "completed") {
      const sale = await Sale.findOne({ _id: id, dealerId });
      if (sale && sale.vehicleId) {
        await Vehicle.findByIdAndUpdate(sale.vehicleId, {
          status: "sold",
          soldAt: new Date(),
        });
      }
      updates.deliveredAt = new Date();
    }

    const sale = await Sale.findOneAndUpdate(
      { _id: id, dealerId },
      updates,
      { new: true }
    )
      .populate("vehicleId")
      .populate("buyerId")
      .lean();

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    return res.status(200).json(sale);
  }

  if (req.method === "DELETE") {
    const sale = await Sale.findOne({ _id: id, dealerId });

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // If sale is deleted, update vehicle status back to live
    if (sale.vehicleId) {
      await Vehicle.findByIdAndUpdate(sale.vehicleId, {
        status: "live",
        buyerId: null,
      });
    }

    await Sale.findByIdAndDelete(id);

    return res.status(200).json({ message: "Sale deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
