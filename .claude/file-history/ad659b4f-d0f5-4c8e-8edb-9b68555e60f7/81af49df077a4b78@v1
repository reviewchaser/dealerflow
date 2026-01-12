import connectMongo from "@/libs/mongoose";
import AppraisalShareLink from "@/models/AppraisalShareLink";
import { withDealerContext } from "@/libs/authContext";

export default withDealerContext(async (req, res, ctx) => {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  // GET - Get single share link
  if (req.method === "GET") {
    try {
      const link = await AppraisalShareLink.findOne({ _id: id, dealerId }).lean();

      if (!link) {
        return res.status(404).json({ error: "Share link not found" });
      }

      return res.status(200).json(link);
    } catch (error) {
      console.error("Error fetching share link:", error);
      return res.status(500).json({ error: "Failed to fetch share link" });
    }
  }

  // PUT - Update share link (toggle active status)
  if (req.method === "PUT") {
    try {
      const link = await AppraisalShareLink.findOne({ _id: id, dealerId });

      if (!link) {
        return res.status(404).json({ error: "Share link not found" });
      }

      const { isActive, expiresAt } = req.body;

      if (typeof isActive === "boolean") {
        link.isActive = isActive;
      }
      if (expiresAt !== undefined) {
        link.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      await link.save();
      return res.status(200).json(link.toJSON());
    } catch (error) {
      console.error("Error updating share link:", error);
      return res.status(500).json({ error: "Failed to update share link" });
    }
  }

  // DELETE - Permanently delete share link
  if (req.method === "DELETE") {
    try {
      const result = await AppraisalShareLink.findOneAndDelete({ _id: id, dealerId });

      if (!result) {
        return res.status(404).json({ error: "Share link not found" });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting share link:", error);
      return res.status(500).json({ error: "Failed to delete share link" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
