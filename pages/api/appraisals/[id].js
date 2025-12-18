import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
import Vehicle from "@/models/Vehicle"; // Required for populate
import Contact from "@/models/Contact"; // Required for populate
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method === "GET") {
    const appraisal = await Appraisal.findOne({ _id: id, dealerId })
      .populate("contactId")
      .populate("vehicleId")
      .lean();
    if (!appraisal) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(appraisal);
  }

  if (req.method === "PUT") {
    const updates = req.body;
    if (updates.decision && updates.decision !== "pending") {
      updates.decidedAt = new Date();
    }
    const appraisal = await Appraisal.findOneAndUpdate(
      { _id: id, dealerId },
      updates,
      { new: true }
    ).populate("contactId").lean();
    if (!appraisal) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(appraisal);
  }

  if (req.method === "DELETE") {
    const appraisal = await Appraisal.findOne({ _id: id, dealerId });
    if (!appraisal) return res.status(404).json({ error: "Not found" });
    await Appraisal.findByIdAndDelete(id);
    return res.status(200).json({ message: "Deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
