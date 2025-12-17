import connectMongo from "@/libs/mongoose";
import Sale from "@/models/Sale";
import Vehicle from "@/models/Vehicle";
import Contact from "@/models/Contact";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const { status } = req.query;

    let query = { dealerId };
    if (status && status !== "all") {
      query.status = status;
    }

    const sales = await Sale.find(query)
      .populate("vehicleId")
      .populate("buyerId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(sales);
  }

  if (req.method === "POST") {
    const {
      vehicleId,
      buyerName,
      buyerEmail,
      buyerPhone,
      salePrice,
      depositAmount,
      paymentMethod,
      deliveryDate,
      warrantyMonths,
      notes,
    } = req.body;

    if (!vehicleId || !buyerName || !salePrice) {
      return res.status(400).json({ error: "Vehicle, buyer name and sale price are required" });
    }

    // Find or create buyer contact - scoped by dealer
    let buyer = null;

    if (buyerEmail || buyerPhone) {
      const searchConditions = [];
      if (buyerEmail) searchConditions.push({ email: buyerEmail });
      if (buyerPhone) searchConditions.push({ phone: buyerPhone });

      buyer = await Contact.findOne({ dealerId, $or: searchConditions });
    }

    if (!buyer) {
      buyer = await Contact.create({
        dealerId,
        name: buyerName,
        email: buyerEmail || undefined,
        phone: buyerPhone || undefined,
        type: "buyer",
      });
    } else if (buyer.type === "seller") {
      buyer.type = "both";
      await buyer.save();
    }

    // Create sale
    const sale = await Sale.create({
      dealerId,
      vehicleId,
      buyerId: buyer._id,
      salePrice,
      depositAmount,
      paymentMethod,
      deliveryDate,
      warrantyMonths: warrantyMonths || 3,
      notes,
      status: depositAmount ? "deposit_paid" : "pending",
    });

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(vehicleId, {
      status: "reserved",
      buyerId: buyer._id,
      salePrice,
    });

    const populated = await Sale.findById(sale._id)
      .populate("vehicleId")
      .populate("buyerId")
      .lean();

    return res.status(201).json(populated);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
