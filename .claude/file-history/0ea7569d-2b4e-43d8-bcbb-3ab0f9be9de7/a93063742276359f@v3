import connectMongo from "@/libs/mongoose";
import mongoose from "mongoose";
import Appraisal from "@/models/Appraisal";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import AftercareCase from "@/models/AftercareCase";
import ReviewResponse from "@/models/ReviewResponse";
import Form from "@/models/Form";
import FormSubmission from "@/models/FormSubmission";
import CalendarEvent from "@/models/CalendarEvent";
import CourtesyAllocation from "@/models/CourtesyAllocation";
import Contact from "@/models/Contact"; // Required for populate
import { requireDealerContext } from "@/libs/authContext";

// Default empty stats object for safe responses
const DEFAULT_STATS = {
  appraisals: { total: 0, pending: 0 },
  vehicles: { total: 0, inStock: 0, inPrep: 0, live: 0, delivered: 0 },
  aftercare: { total: 0, open: 0 },
  reviews: { count: 0, avgRating: "N/A", lastReviewDays: null },
  forms: { total: 0, submissions: 0 },
  recent: { appraisals: [], vehicles: [], formSubmissions: [] },
  prepPriorities: [], // Enhanced prep priorities for dashboard widget
  needsAttention: { soldInProgress: 0, warrantyNotBookedIn: 0, eventsToday: 0, courtesyDueBack: 0, motExpiringSoon: 0, contactDue: 0, newWarrantyCases: 0 },
  today: { events: 0, deliveries: 0, testDrives: 0, courtesyDueBack: 0 },
  topForms: [],
  oldestAppraisalDays: null,
  aftersalesCosts: {
    thisMonth: { totalNet: 0, partsNet: 0, labourNet: 0, totalVat: 0, partsVat: 0, labourVat: 0, totalGross: 0, total: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0, avgPerCaseGross: 0 },
    lastMonth: { totalNet: 0, partsNet: 0, labourNet: 0, totalVat: 0, partsVat: 0, labourVat: 0, totalGross: 0, total: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0, avgPerCaseGross: 0 },
    ytd: { totalNet: 0, partsNet: 0, labourNet: 0, totalVat: 0, partsVat: 0, labourVat: 0, totalGross: 0, total: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0, avgPerCaseGross: 0 }
  },
};

export default async function handler(req, res) {
  await connectMongo();

  // Try to get dealer context - if it fails, return safe defaults
  let ctx;
  try {
    ctx = await requireDealerContext(req, res);
  } catch (error) {
    // No dealer context - return safe defaults instead of 403
    console.log("[Dashboard Stats] No dealer context, returning defaults");
    return res.status(200).json(DEFAULT_STATS);
  }

  return handleStats(req, res, ctx);
}

async function handleStats(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  // Date helpers for today queries
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // MOT due within 14 days
  const motDueSoon = new Date();
  motDueSoon.setDate(motDueSoon.getDate() + 14);

  // 48 hours ago for new warranty cases
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

  // Date ranges for aftersales cost calculations
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfLastMonth = new Date(startOfMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

  const endOfLastMonth = new Date(startOfMonth);
  endOfLastMonth.setTime(endOfLastMonth.getTime() - 1);

  const startOfYear = new Date();
  startOfYear.setMonth(0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const [
    totalAppraisals, pendingAppraisals,
    totalVehicles, inStockVehicles, inPrepVehicles, liveVehicles, deliveredVehicles,
    totalCases, openCases,
    reviews,
    totalForms, totalSubmissions,
    // Needs Attention counts
    soldInProgress,
    warrantyNotBookedIn,
    eventsToday,
    courtesyDueBack,
    motExpiringSoon,
    contactDue,
    newWarrantyCases,
    // Additional data
    oldestPendingAppraisal,
    lastReview
  ] = await Promise.all([
    Appraisal.countDocuments({ dealerId }),
    Appraisal.countDocuments({ dealerId, decision: "pending" }),
    Vehicle.countDocuments({ dealerId }),
    Vehicle.countDocuments({ dealerId, status: "in_stock" }),
    Vehicle.countDocuments({ dealerId, status: "in_prep" }),
    Vehicle.countDocuments({ dealerId, status: "live" }),
    Vehicle.countDocuments({ dealerId, status: "delivered" }),
    AftercareCase.countDocuments({ dealerId }),
    AftercareCase.countDocuments({ dealerId, status: { $in: ["new", "in_progress"] } }),
    ReviewResponse.find({ dealerId }).lean(),
    Form.countDocuments({ dealerId }),
    FormSubmission.countDocuments({ dealerId }),
    // Needs Attention: Sold in progress (status="live" maps to "Sold In Progress" column)
    Vehicle.countDocuments({ dealerId, status: "live" }),
    // Needs Attention: Warranty not booked in
    AftercareCase.countDocuments({ dealerId, boardStatus: "not_booked_in" }),
    // Needs Attention: Events today
    CalendarEvent.countDocuments({
      dealerId,
      startDatetime: { $gte: startOfToday, $lt: endOfToday }
    }),
    // Needs Attention: Courtesy due back today or overdue
    CourtesyAllocation.countDocuments({
      dealerId,
      dateDueBack: { $lte: endOfToday },
      dateReturned: null
    }),
    // Needs Attention: MOT expiring soon (only if motExpiryDate exists)
    Vehicle.countDocuments({
      dealerId,
      motExpiryDate: { $exists: true, $ne: null, $lte: motDueSoon },
      status: { $nin: ["delivered", "archived"] }
    }),
    // Needs Attention: Contact due (nextContactAt is today or earlier)
    AftercareCase.countDocuments({
      dealerId,
      nextContactAt: { $exists: true, $ne: null, $lte: endOfToday },
      status: { $in: ["new", "in_progress"] }
    }),
    // Needs Attention: New warranty cases (created within last 48 hours)
    AftercareCase.countDocuments({
      dealerId,
      createdAt: { $gte: fortyEightHoursAgo },
      status: { $in: ["new", "in_progress"] }
    }),
    // Oldest pending appraisal (sort ascending to get oldest)
    Appraisal.findOne({ dealerId, decision: "pending" })
      .sort({ createdAt: 1 })
      .select("createdAt")
      .lean(),
    // Most recent review
    ReviewResponse.findOne({ dealerId })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean()
  ]);

  // Helper to transform _id to id for lean() results
  const transformDoc = (doc) => {
    if (!doc) return null;
    const { _id, __v, ...rest } = doc;
    return { id: _id?.toString(), ...rest };
  };

  // Second batch of parallel queries - aggregations and recent items
  const dealerObjectId = new mongoose.Types.ObjectId(dealerId);
  const [
    topFormsAgg,
    todayCategoryCounts,
    recentAppraisalsRaw,
    recentVehiclesRaw,
    recentSubmissionsRaw,
    allForms,
    prepPriorityVehiclesRaw,
    // Aftersales cost aggregations
    aftersalesCostThisMonth,
    aftersalesCostLastMonth,
    aftersalesCostYTD
  ] = await Promise.all([
    // Top 3 forms by submission count
    FormSubmission.aggregate([
      { $match: { dealerId: dealerObjectId } },
      { $group: { _id: "$formId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
      { $lookup: { from: "forms", localField: "_id", foreignField: "_id", as: "form" } },
      { $unwind: { path: "$form", preserveNullAndEmptyArrays: false } },
      { $project: { formId: "$_id", count: 1, name: "$form.name", type: "$form.type" } }
    ]),
    // Today counts by calendar category
    CalendarEvent.aggregate([
      { $match: {
        dealerId: dealerObjectId,
        startDatetime: { $gte: startOfToday, $lt: endOfToday }
      }},
      { $lookup: { from: "calendarcategories", localField: "categoryId", foreignField: "_id", as: "category" }},
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true }},
      { $group: { _id: { $toLower: "$category.name" }, count: { $sum: 1 } }}
    ]),
    // Recent appraisals
    Appraisal.find({ dealerId })
      .populate("contactId")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    // Recent vehicles
    Vehicle.find({ dealerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    // Recent submissions
    FormSubmission.find({ dealerId })
      .populate("formId")
      .sort({ submittedAt: -1 })
      .limit(5)
      .lean(),
    // All forms for quick forms section (eliminates separate /api/forms call)
    Form.find({ dealerId })
      .sort({ type: 1, createdAt: -1 })
      .lean(),
    // Prep priority vehicles - in_stock, in_prep, or live (sold in progress)
    Vehicle.find({
      dealerId,
      status: { $in: ["in_stock", "in_prep", "live"] }
    })
      .sort({ status: -1, createdAt: 1 }) // live first (urgent), then oldest
      .limit(10)
      .lean(),
    // Aftersales cost this month - using costingAddedAt for correct month attribution
    // Uses new VAT structure: partsNet, labourNet with per-component VAT treatment
    AftercareCase.aggregate([
      { $match: { dealerId: dealerObjectId, costingAddedAt: { $gte: startOfMonth } } },
      { $addFields: {
        // Calculate VAT for each component based on treatment
        partsVat: {
          $cond: [
            { $eq: ["$costing.partsVatTreatment", "NO_VAT"] },
            0,
            { $multiply: [{ $ifNull: ["$costing.partsNet", { $ifNull: ["$costing.partsCost", 0] }] }, { $ifNull: ["$costing.partsVatRate", 0.2] }] }
          ]
        },
        labourVat: {
          $cond: [
            { $eq: ["$costing.labourVatTreatment", "NO_VAT"] },
            0,
            { $multiply: [{ $ifNull: ["$costing.labourNet", { $ifNull: ["$costing.labourCost", 0] }] }, { $ifNull: ["$costing.labourVatRate", 0.2] }] }
          ]
        },
        partsNetVal: { $ifNull: ["$costing.partsNet", { $ifNull: ["$costing.partsCost", 0] }] },
        labourNetVal: { $ifNull: ["$costing.labourNet", { $ifNull: ["$costing.labourCost", 0] }] }
      }},
      { $group: {
        _id: null,
        totalPartsNet: { $sum: "$partsNetVal" },
        totalLabourNet: { $sum: "$labourNetVal" },
        totalPartsVat: { $sum: "$partsVat" },
        totalLabourVat: { $sum: "$labourVat" },
        caseCount: { $sum: 1 }
      }}
    ]),
    // Aftersales cost last month
    AftercareCase.aggregate([
      { $match: { dealerId: dealerObjectId, costingAddedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $addFields: {
        partsVat: {
          $cond: [
            { $eq: ["$costing.partsVatTreatment", "NO_VAT"] },
            0,
            { $multiply: [{ $ifNull: ["$costing.partsNet", { $ifNull: ["$costing.partsCost", 0] }] }, { $ifNull: ["$costing.partsVatRate", 0.2] }] }
          ]
        },
        labourVat: {
          $cond: [
            { $eq: ["$costing.labourVatTreatment", "NO_VAT"] },
            0,
            { $multiply: [{ $ifNull: ["$costing.labourNet", { $ifNull: ["$costing.labourCost", 0] }] }, { $ifNull: ["$costing.labourVatRate", 0.2] }] }
          ]
        },
        partsNetVal: { $ifNull: ["$costing.partsNet", { $ifNull: ["$costing.partsCost", 0] }] },
        labourNetVal: { $ifNull: ["$costing.labourNet", { $ifNull: ["$costing.labourCost", 0] }] }
      }},
      { $group: {
        _id: null,
        totalPartsNet: { $sum: "$partsNetVal" },
        totalLabourNet: { $sum: "$labourNetVal" },
        totalPartsVat: { $sum: "$partsVat" },
        totalLabourVat: { $sum: "$labourVat" },
        caseCount: { $sum: 1 }
      }}
    ]),
    // Aftersales cost YTD
    AftercareCase.aggregate([
      { $match: { dealerId: dealerObjectId, costingAddedAt: { $gte: startOfYear } } },
      { $addFields: {
        partsVat: {
          $cond: [
            { $eq: ["$costing.partsVatTreatment", "NO_VAT"] },
            0,
            { $multiply: [{ $ifNull: ["$costing.partsNet", { $ifNull: ["$costing.partsCost", 0] }] }, { $ifNull: ["$costing.partsVatRate", 0.2] }] }
          ]
        },
        labourVat: {
          $cond: [
            { $eq: ["$costing.labourVatTreatment", "NO_VAT"] },
            0,
            { $multiply: [{ $ifNull: ["$costing.labourNet", { $ifNull: ["$costing.labourCost", 0] }] }, { $ifNull: ["$costing.labourVatRate", 0.2] }] }
          ]
        },
        partsNetVal: { $ifNull: ["$costing.partsNet", { $ifNull: ["$costing.partsCost", 0] }] },
        labourNetVal: { $ifNull: ["$costing.labourNet", { $ifNull: ["$costing.labourCost", 0] }] }
      }},
      { $group: {
        _id: null,
        totalPartsNet: { $sum: "$partsNetVal" },
        totalLabourNet: { $sum: "$labourNetVal" },
        totalPartsVat: { $sum: "$partsVat" },
        totalLabourVat: { $sum: "$labourVat" },
        caseCount: { $sum: 1 }
      }}
    ])
  ]);

  // Extract category counts
  const deliveriesToday = todayCategoryCounts.find(c =>
    c._id?.includes("handover") || c._id?.includes("delivery")
  )?.count || 0;
  const testDrivesToday = todayCategoryCounts.find(c =>
    c._id?.includes("test drive") || c._id?.includes("testdrive")
  )?.count || 0;

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  // Transform all recent items
  const recentAppraisals = recentAppraisalsRaw.map(transformDoc);
  const recentVehicles = recentVehiclesRaw.map(transformDoc);
  const recentSubmissions = recentSubmissionsRaw.map(transformDoc);
  const formsList = allForms.map(transformDoc);

  // Calculate days since oldest pending appraisal
  const oldestAppraisalDays = oldestPendingAppraisal
    ? Math.floor((Date.now() - new Date(oldestPendingAppraisal.createdAt)) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate days since last review
  const lastReviewDays = lastReview
    ? Math.floor((Date.now() - new Date(lastReview.createdAt)) / (1000 * 60 * 60 * 24))
    : null;

  // Enrich prep priority vehicles with tasks and issues
  let prepPriorities = [];
  if (prepPriorityVehiclesRaw.length > 0) {
    const vehicleIds = prepPriorityVehiclesRaw.map(v => v._id);

    // Fetch tasks and issues for all prep priority vehicles in parallel
    const [allTasks, allIssues] = await Promise.all([
      VehicleTask.find({ vehicleId: { $in: vehicleIds } }).lean(),
      VehicleIssue.find({ vehicleId: { $in: vehicleIds } }).lean()
    ]);

    // Group tasks and issues by vehicleId
    const tasksByVehicle = {};
    const issuesByVehicle = {};

    allTasks.forEach(task => {
      const vid = task.vehicleId.toString();
      if (!tasksByVehicle[vid]) tasksByVehicle[vid] = [];
      tasksByVehicle[vid].push(task);
    });

    allIssues.forEach(issue => {
      const vid = issue.vehicleId.toString();
      if (!issuesByVehicle[vid]) issuesByVehicle[vid] = [];
      issuesByVehicle[vid].push(issue);
    });

    // Build enriched prep priorities
    prepPriorities = prepPriorityVehiclesRaw.map(v => {
      const vid = v._id.toString();
      const tasks = tasksByVehicle[vid] || [];
      const issues = issuesByVehicle[vid] || [];

      // Calculate task stats
      const totalTasks = tasks.filter(t =>
        !["not_required", "NOT_REQUIRED"].includes(t.status)
      ).length;
      const completedTasks = tasks.filter(t =>
        ["done", "DONE"].includes(t.status)
      ).length;
      const tasksRemaining = totalTasks - completedTasks;
      const awaitingParts = tasks.filter(t =>
        t.partsStatus === "AWAITING_DELIVERY"
      ).length;

      // Calculate issue stats
      const openIssues = issues.filter(i => i.status !== "Complete");
      const mechanicalIssues = openIssues.filter(i => i.category === "Mechanical").length;
      const highPriorityIssues = openIssues.filter(i => i.priority === "high").length;

      // Calculate days in stock
      const daysInStock = Math.floor(
        (Date.now() - new Date(v.createdAt)) / (1000 * 60 * 60 * 24)
      );

      // Priority score for sorting (higher = more urgent)
      // Sold in progress = 100 base, mechanical issues = +20 each, high priority = +10, days = +1 per day
      let priorityScore = 0;
      if (v.status === "live") priorityScore += 100; // Sold in progress is most urgent
      priorityScore += mechanicalIssues * 20;
      priorityScore += highPriorityIssues * 10;
      priorityScore += Math.min(daysInStock, 30); // Cap days contribution at 30

      return {
        id: vid,
        regCurrent: v.regCurrent,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        daysInStock,
        totalTasks,
        completedTasks,
        tasksRemaining,
        awaitingParts,
        openIssues: openIssues.length,
        mechanicalIssues,
        highPriorityIssues,
        priorityScore
      };
    });

    // Sort by priority score (highest first), then take top 5
    prepPriorities = prepPriorities
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 5);
  }

  // Process aftersales cost aggregations with new VAT structure
  const defaultCost = { totalPartsNet: 0, totalLabourNet: 0, totalPartsVat: 0, totalLabourVat: 0, caseCount: 0 };
  const costThisMonth = aftersalesCostThisMonth[0] || defaultCost;
  const costLastMonth = aftersalesCostLastMonth[0] || defaultCost;
  const costYTD = aftersalesCostYTD[0] || defaultCost;

  // Helper to calculate cost breakdown for a period
  const buildCostBreakdown = (cost) => {
    const totalNet = (cost.totalPartsNet || 0) + (cost.totalLabourNet || 0);
    const totalVat = (cost.totalPartsVat || 0) + (cost.totalLabourVat || 0);
    const totalGross = totalNet + totalVat;
    return {
      // Net amounts (default display)
      totalNet,
      partsNet: cost.totalPartsNet || 0,
      labourNet: cost.totalLabourNet || 0,
      // VAT amounts
      totalVat,
      partsVat: cost.totalPartsVat || 0,
      labourVat: cost.totalLabourVat || 0,
      // Gross amounts
      totalGross,
      // Legacy compatibility - "total" defaults to net
      total: totalNet,
      parts: cost.totalPartsNet || 0,
      labour: cost.totalLabourNet || 0,
      // Counts and averages
      caseCount: cost.caseCount || 0,
      avgPerCase: cost.caseCount > 0 ? totalNet / cost.caseCount : 0,
      avgPerCaseGross: cost.caseCount > 0 ? totalGross / cost.caseCount : 0
    };
  };

  const aftersalesCosts = {
    thisMonth: buildCostBreakdown(costThisMonth),
    lastMonth: buildCostBreakdown(costLastMonth),
    ytd: buildCostBreakdown(costYTD)
  };

  return res.status(200).json({
    appraisals: { total: totalAppraisals, pending: pendingAppraisals },
    vehicles: {
      total: totalVehicles,
      inStock: inStockVehicles,
      inPrep: inPrepVehicles,
      live: liveVehicles,
      delivered: deliveredVehicles
    },
    aftercare: { total: totalCases, open: openCases },
    reviews: { count: reviews.length, avgRating, lastReviewDays },
    forms: { total: totalForms, submissions: totalSubmissions },
    recent: { appraisals: recentAppraisals, vehicles: recentVehicles, formSubmissions: recentSubmissions },
    // Prep priority vehicles with enriched data
    prepPriorities,
    // Needs Attention counts
    needsAttention: {
      soldInProgress,
      warrantyNotBookedIn,
      eventsToday,
      courtesyDueBack,
      motExpiringSoon,
      contactDue,
      newWarrantyCases
    },
    // Today strip
    today: {
      events: eventsToday,
      deliveries: deliveriesToday,
      testDrives: testDrivesToday,
      courtesyDueBack
    },
    // Top forms by usage
    topForms: topFormsAgg,
    // All forms for quick forms section (eliminates separate /api/forms call)
    formsList,
    // KPI micro-context
    oldestAppraisalDays,
    // Aftersales cost KPIs
    aftersalesCosts,
  });
}

