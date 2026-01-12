import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";
import AppraisalIssue from "@/models/AppraisalIssue";
import CustomerPXIssue from "@/models/CustomerPXIssue";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId } = ctx;

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json([]);
  }

  // Normalize search query
  const normalizedQuery = q.toUpperCase().replace(/\s/g, "");

  // Search both buying appraisals and customer PX appraisals that haven't been converted
  // CRITICAL: Filter by dealerId to prevent cross-tenant data leakage
  const [buyingAppraisals, customerPxAppraisals] = await Promise.all([
    Appraisal.find({
      dealerId, // Tenant scoping
      vehicleReg: { $regex: normalizedQuery, $options: "i" },
      decision: { $in: ["pending", "reviewed"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    CustomerPXAppraisal.find({
      dealerId, // Tenant scoping
      vehicleReg: { $regex: normalizedQuery, $options: "i" },
      decision: { $in: ["pending", "reviewed"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Get issues for all appraisals
  const buyingIds = buyingAppraisals.map((a) => a._id);
  const pxIds = customerPxAppraisals.map((a) => a._id);

  const [buyingIssues, pxIssues] = await Promise.all([
    AppraisalIssue.find({ appraisalId: { $in: buyingIds } }).lean(),
    CustomerPXIssue.find({ customerPXAppraisalId: { $in: pxIds } }).lean(),
  ]);

  // Create issue count lookups
  const buyingIssueCounts = {};
  for (const issue of buyingIssues) {
    const id = issue.appraisalId.toString();
    buyingIssueCounts[id] = (buyingIssueCounts[id] || 0) + 1;
  }
  const pxIssueCounts = {};
  for (const issue of pxIssues) {
    const id = issue.customerPXAppraisalId.toString();
    pxIssueCounts[id] = (pxIssueCounts[id] || 0) + 1;
  }

  // Transform and combine results
  const suggestions = [
    ...buyingAppraisals.map((a) => ({
      id: a._id.toString(),
      type: "buying",
      vehicleReg: a.vehicleReg,
      vehicleMake: a.vehicleMake,
      vehicleModel: a.vehicleModel,
      vehicleYear: a.vehicleYear,
      mileage: a.mileage,
      colour: a.colour,
      fuelType: a.fuelType,
      conditionNotes: a.conditionNotes,
      proposedPurchasePrice: a.proposedPurchasePrice,
      serviceHistoryUrl: a.serviceHistoryUrl,
      v5Url: a.v5Url,
      otherDocuments: a.otherDocuments,
      aiHintText: a.aiHintText,
      prepTemplateId: a.prepTemplateId,
      issueCount: buyingIssueCounts[a._id.toString()] || 0,
      decision: a.decision,
      createdAt: a.createdAt,
    })),
    ...customerPxAppraisals.map((a) => ({
      id: a._id.toString(),
      type: "customer_px",
      vehicleReg: a.vehicleReg,
      vehicleMake: a.vehicleMake,
      vehicleModel: a.vehicleModel,
      vehicleYear: a.vehicleYear,
      mileage: a.mileage,
      colour: a.colour,
      fuelType: a.fuelType,
      conditionNotes: a.conditionNotes,
      proposedPurchasePrice: a.proposedPurchasePrice,
      serviceHistoryUrl: a.serviceHistoryUrl,
      v5Url: a.v5Url,
      otherDocuments: a.otherDocuments,
      aiHintText: a.aiHintText,
      prepTemplateId: a.prepTemplateId,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      customerEmail: a.customerEmail,
      outstandingFinanceAmount: a.outstandingFinanceAmount,
      issueCount: pxIssueCounts[a._id.toString()] || 0,
      decision: a.decision,
      createdAt: a.createdAt,
    })),
  ];

  // Sort by most recent first
  suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json(suggestions.slice(0, 10));
}

export default withDealerContext(handler);
