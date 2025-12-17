import connectMongo from "@/libs/mongoose";
import VehicleDocument from "@/models/VehicleDocument";

export default async function handler(req, res) {
  await connectMongo();

  const { documentId } = req.query;

  if (req.method === "DELETE") {
    try {
      const document = await VehicleDocument.findByIdAndDelete(documentId);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      return res.status(200).json({ message: "Document deleted" });
    } catch (error) {
      console.error("Error deleting document:", error);
      return res.status(500).json({ error: "Failed to delete document" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
