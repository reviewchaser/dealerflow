import connectMongo from "@/libs/mongoose";
import VehicleLabel from "@/models/VehicleLabel";
import VehicleLabelAssignment from "@/models/VehicleLabelAssignment";

export default async function handler(req, res) {
  try {
    await connectMongo();
    const { id } = req.query;

    if (req.method === "DELETE") {
      // Delete label
      await VehicleLabel.findByIdAndDelete(id);
      // Also delete any assignments using this label
      await VehicleLabelAssignment.deleteMany({ labelId: id });
      return res.status(200).json({ success: true });
    }

    if (req.method === "PUT") {
      const { name, colour } = req.body;
      const label = await VehicleLabel.findByIdAndUpdate(
        id,
        { name, colour },
        { new: true }
      );
      if (!label) return res.status(404).json({ error: "Label not found" });
      return res.status(200).json(label);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
