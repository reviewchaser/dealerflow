import connectMongo from "@/libs/mongoose";
import CustomerPXIssue from "@/models/CustomerPXIssue";

export default async function handler(req, res) {
  try {
    await connectMongo();

    if (req.method === "GET") {
      const { customerPXAppraisalId } = req.query;

      if (!customerPXAppraisalId) {
        return res.status(400).json({ error: "customerPXAppraisalId required" });
      }

      const issues = await CustomerPXIssue.find({ customerPXAppraisalId })
        .sort({ createdAt: -1 })
        .lean();

      // Transform _id to id
      const transformed = issues.map(issue => ({
        ...issue,
        id: issue._id.toString(),
        _id: undefined,
      }));

      return res.status(200).json(transformed);
    }

    if (req.method === "POST") {
      const { customerPXAppraisalId, category, subcategory, description, photos, attachments, actionNeeded, estimatedCost, notes, faultCodes, status } = req.body;

      if (!customerPXAppraisalId || !category || !description) {
        return res.status(400).json({ error: "customerPXAppraisalId, category, and description required" });
      }

      const issue = await CustomerPXIssue.create({
        customerPXAppraisalId,
        category,
        subcategory: subcategory || "Other",
        description,
        photos: photos || [],
        attachments: attachments || [],
        actionNeeded,
        estimatedCost,
        notes,
        faultCodes: faultCodes || null,
        status: status || "outstanding",
      });

      return res.status(201).json(issue.toJSON());
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Customer PX Issues API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
