import connectMongo from "@/libs/mongoose";
import CustomerPXIssue from "@/models/CustomerPXIssue";

export default async function handler(req, res) {
  try {
    await connectMongo();
    const { id } = req.query;

    if (req.method === "GET") {
      const issue = await CustomerPXIssue.findById(id).lean();
      if (!issue) return res.status(404).json({ error: "Issue not found" });

      return res.status(200).json({
        ...issue,
        id: issue._id.toString(),
        _id: undefined,
      });
    }

    if (req.method === "PUT") {
      const issue = await CustomerPXIssue.findByIdAndUpdate(id, req.body, { new: true });
      if (!issue) return res.status(404).json({ error: "Issue not found" });

      return res.status(200).json(issue.toJSON());
    }

    if (req.method === "DELETE") {
      const issue = await CustomerPXIssue.findByIdAndDelete(id);
      if (!issue) return res.status(404).json({ error: "Issue not found" });

      return res.status(200).json({ message: "Issue deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Customer PX Issue API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
