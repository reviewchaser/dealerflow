import connectMongo from "@/libs/mongoose";
import AppraisalIssue from "@/models/AppraisalIssue";

export default async function handler(req, res) {
  try {
    await connectMongo();

    if (req.method === "GET") {
      const { appraisalId } = req.query;

      if (!appraisalId) {
        return res.status(400).json({ error: "appraisalId required" });
      }

      const issues = await AppraisalIssue.find({ appraisalId })
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
      const { appraisalId, category, subcategory, description, photos, actionNeeded, estimatedCost, notes, faultCodes, status } = req.body;

      if (!appraisalId || !category || !description) {
        return res.status(400).json({ error: "appraisalId, category, and description required" });
      }

      const issue = await AppraisalIssue.create({
        appraisalId,
        category,
        subcategory: subcategory || "Other",
        description,
        photos: photos || [],
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
    console.error("Appraisal Issues API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
