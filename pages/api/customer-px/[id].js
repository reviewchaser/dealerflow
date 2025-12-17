import connectMongo from "@/libs/mongoose";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";

export default async function handler(req, res) {
  try {
    await connectMongo();
    const { id } = req.query;

    if (req.method === "GET") {
      const appraisal = await CustomerPXAppraisal.findById(id)
        .populate("contactId")
        .populate("vehicleId")
        .lean();
      if (!appraisal) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(appraisal);
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const updates = req.body;
      if (updates.decision && updates.decision !== "pending") {
        updates.decidedAt = new Date();
      }
      const appraisal = await CustomerPXAppraisal.findByIdAndUpdate(id, updates, { new: true })
        .populate("contactId").lean();
      if (!appraisal) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(appraisal);
    }

    if (req.method === "DELETE") {
      await CustomerPXAppraisal.findByIdAndDelete(id);
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
