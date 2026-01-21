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
import Deal from "@/models/Deal";
import ActivityLog from "@/models/ActivityLog";
import VehicleLocation from "@/models/VehicleLocation";
import PartExchange from "@/models/PartExchange";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";
import Dealer from "@/models/Dealer";
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
  needsAttention: { soldInProgress: 0, warrantyNotBookedIn: 0, eventsToday: 0, courtesyDueBack: 0, motExpiringSoon: 0, contactDue: 0, newWarrantyCases: 0, pxFinanceUnsettled: 0 },
  today: { events: 0, deliveries: 0, testDrives: 0, courtesyDueBack: 0 },
  topForms: [],
  oldestAppraisalDays: null,
  aftersalesCosts: {
    thisMonth: { totalNet: 0, partsNet: 0, labourNet: 0, totalVat: 0, partsVat: 0, labourVat: 0, totalGross: 0, total: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0, avgPerCaseGross: 0 },
    lastMonth: { totalNet: 0, partsNet: 0, labourNet: 0, totalVat: 0, partsVat: 0, labourVat: 0, totalGross: 0, total: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0, avgPerCaseGross: 0 },
    ytd: { totalNet: 0, partsNet: 0, labourNet: 0, totalVat: 0, partsVat: 0, labourVat: 0, totalGross: 0, total: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0, avgPerCaseGross: 0 }
  },
  // Sales KPIs - using completedAt for proper date attribution
  sales: {
    thisMonth: { totalNet: 0, totalVat: 0, totalGross: 0, marginSalesGross: 0, vatQualifyingNet: 0, vatQualifyingVat: 0, dealCount: 0, depositTotal: 0 },
    lastMonth: { totalNet: 0, totalVat: 0, totalGross: 0, marginSalesGross: 0, vatQualifyingNet: 0, vatQualifyingVat: 0, dealCount: 0, depositTotal: 0 },
    ytd: { totalNet: 0, totalVat: 0, totalGross: 0, marginSalesGross: 0, vatQualifyingNet: 0, vatQualifyingVat: 0, dealCount: 0, depositTotal: 0 },
    activeDeals: 0,
    inProgressDeals: 0
  },
  activityFeed: [], // Recent sales events
};

export default async function handler(req, res) {
  await connectMongo();

  // Check if slug is provided for parallel fetch optimization
  const { slug } = req.query;

  if (slug) {
    // Fast path: resolve dealer directly from slug (for parallel fetch from dashboard)
    const dealer = await Dealer.findOne({ slug }).select("_id").lean();
    if (!dealer) {
      console.log("[Dashboard Stats] Invalid slug, returning defaults");
      return res.status(200).json(DEFAULT_STATS);
    }
    // Pass dealerId directly without full context resolution
    return handleStats(req, res, { dealerId: dealer._id });
  }

  // Standard path: use full dealer context (for backwards compatibility)
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
    pxFinanceUnsettled,
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
    // Needs Attention: Part exchange finance unsettled
    // Count deals with PX that has finance but not yet settled
    PartExchange.countDocuments({
      dealerId,
      hasFinance: true,
      financeSettled: { $ne: true }
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
    recentDealerAppraisalsRaw,
    recentCustomerPXAppraisalsRaw,
    recentVehiclesRaw,
    recentSubmissionsRaw,
    allForms,
    prepPriorityVehiclesRaw,
    // Aftersales cost aggregations
    aftersalesCostThisMonth,
    aftersalesCostLastMonth,
    aftersalesCostYTD,
    // Sales KPI aggregations
    activeDealsCount,
    inProgressDealsCount,
    salesThisMonth,
    salesLastMonth,
    salesYTD,
    depositsThisMonth,
    depositsLastMonth,
    depositsYTD,
    recentDealsRaw
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
    // Recent dealer buying appraisals
    Appraisal.find({ dealerId })
      .populate("contactId")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    // Recent customer PX appraisals
    CustomerPXAppraisal.find({ dealerId })
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
    ]),
    // === SALES KPIs ===
    // Active deals count (not completed or cancelled)
    Deal.countDocuments({
      dealerId: dealerObjectId,
      status: { $nin: ["COMPLETED", "CANCELLED"] }
    }),
    // In-progress deals (deposit taken but not delivered)
    Deal.countDocuments({
      dealerId: dealerObjectId,
      status: { $in: ["DEPOSIT_TAKEN", "INVOICED"] }
    }),
    // Sales completed this month - uses completedAt for proper date attribution
    Deal.aggregate([
      { $match: {
        dealerId: dealerObjectId,
        status: "COMPLETED",
        completedAt: { $gte: startOfMonth }
      }},
      { $group: {
        _id: null,
        // For margin scheme: only gross matters
        marginSalesGross: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "MARGIN"] }, { $ifNull: ["$vehiclePriceGross", 0] }, 0] }
        },
        // For VAT qualifying: net + VAT separately
        vatQualifyingNet: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "VAT_QUALIFYING"] }, { $ifNull: ["$vehiclePriceNet", 0] }, 0] }
        },
        vatQualifyingVat: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "VAT_QUALIFYING"] }, { $ifNull: ["$vehicleVatAmount", 0] }, 0] }
        },
        dealCount: { $sum: 1 }
      }}
    ]),
    // Sales completed last month
    Deal.aggregate([
      { $match: {
        dealerId: dealerObjectId,
        status: "COMPLETED",
        completedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
      }},
      { $group: {
        _id: null,
        marginSalesGross: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "MARGIN"] }, { $ifNull: ["$vehiclePriceGross", 0] }, 0] }
        },
        vatQualifyingNet: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "VAT_QUALIFYING"] }, { $ifNull: ["$vehiclePriceNet", 0] }, 0] }
        },
        vatQualifyingVat: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "VAT_QUALIFYING"] }, { $ifNull: ["$vehicleVatAmount", 0] }, 0] }
        },
        dealCount: { $sum: 1 }
      }}
    ]),
    // Sales completed YTD
    Deal.aggregate([
      { $match: {
        dealerId: dealerObjectId,
        status: "COMPLETED",
        completedAt: { $gte: startOfYear }
      }},
      { $group: {
        _id: null,
        marginSalesGross: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "MARGIN"] }, { $ifNull: ["$vehiclePriceGross", 0] }, 0] }
        },
        vatQualifyingNet: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "VAT_QUALIFYING"] }, { $ifNull: ["$vehiclePriceNet", 0] }, 0] }
        },
        vatQualifyingVat: {
          $sum: { $cond: [{ $eq: ["$vatScheme", "VAT_QUALIFYING"] }, { $ifNull: ["$vehicleVatAmount", 0] }, 0] }
        },
        dealCount: { $sum: 1 }
      }}
    ]),
    // Deposits this month - uses payment paidAt date
    Deal.aggregate([
      { $match: { dealerId: dealerObjectId }},
      { $unwind: "$payments" },
      { $match: {
        "payments.type": "DEPOSIT",
        "payments.isRefunded": { $ne: true },
        "payments.paidAt": { $gte: startOfMonth }
      }},
      { $group: { _id: null, total: { $sum: "$payments.amount" } }}
    ]),
    // Deposits last month
    Deal.aggregate([
      { $match: { dealerId: dealerObjectId }},
      { $unwind: "$payments" },
      { $match: {
        "payments.type": "DEPOSIT",
        "payments.isRefunded": { $ne: true },
        "payments.paidAt": { $gte: startOfLastMonth, $lte: endOfLastMonth }
      }},
      { $group: { _id: null, total: { $sum: "$payments.amount" } }}
    ]),
    // Deposits YTD
    Deal.aggregate([
      { $match: { dealerId: dealerObjectId }},
      { $unwind: "$payments" },
      { $match: {
        "payments.type": "DEPOSIT",
        "payments.isRefunded": { $ne: true },
        "payments.paidAt": { $gte: startOfYear }
      }},
      { $group: { _id: null, total: { $sum: "$payments.amount" } }}
    ]),
    // Activity feed - recent deals with their key milestones
    Deal.find({ dealerId: dealerObjectId })
      .populate("vehicleId", "regCurrent make model")
      .populate("soldToContactId", "displayName")
      .populate("salesPersonId", "name")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean()
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
  // Combine dealer appraisals and customer PX appraisals into one list
  const dealerAppraisals = recentDealerAppraisalsRaw.map(doc => ({
    ...transformDoc(doc),
    type: "dealer_appraisal",
    displayReg: doc.vehicleReg,
    displayName: doc.contactId?.displayName || doc.submitterName || "Unknown",
  }));
  const customerPXAppraisals = recentCustomerPXAppraisalsRaw.map(doc => ({
    ...transformDoc(doc),
    type: "customer_px",
    displayReg: doc.vehicleReg,
    displayName: doc.customerName || "Unknown",
  }));
  // Combine and sort by createdAt descending, take top 5
  const recentAppraisals = [...dealerAppraisals, ...customerPXAppraisals]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
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
      // Status is the primary factor - sold vehicles need attention first
      let priorityScore = 0;

      // Status tiers (most important factor)
      if (v.status === "live") {
        priorityScore += 1000; // Sold in progress - customer waiting
      } else if (v.status === "in_prep") {
        priorityScore += 500; // Advertised - customer facing
      }
      // in_stock = 0 base (not yet advertised)

      // Urgency factors within status tier
      priorityScore += mechanicalIssues * 50; // Mechanical issues are critical
      priorityScore += highPriorityIssues * 30; // High priority issues
      priorityScore += openIssues.length * 10; // Any open issues
      priorityScore += awaitingParts * 25; // Blocking - parts needed
      priorityScore += tasksRemaining * 5; // Tasks still to do

      // Age factor (older stock needs more attention)
      priorityScore += Math.min(daysInStock, 60); // Cap at 60 days contribution

      // Priority reason for display
      let priorityReason = "";
      if (v.status === "live") {
        priorityReason = "Sold - awaiting delivery";
      } else if (mechanicalIssues > 0) {
        priorityReason = `${mechanicalIssues} mechanical issue${mechanicalIssues > 1 ? "s" : ""}`;
      } else if (openIssues.length > 0) {
        priorityReason = `${openIssues.length} open issue${openIssues.length > 1 ? "s" : ""}`;
      } else if (awaitingParts > 0) {
        priorityReason = "Awaiting parts";
      } else if (tasksRemaining > 0) {
        priorityReason = `${tasksRemaining} task${tasksRemaining > 1 ? "s" : ""} remaining`;
      } else if (daysInStock > 14) {
        priorityReason = `${daysInStock} days in stock`;
      }

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
        priorityScore,
        priorityReason
      };
    });

    // Sort by priority score (highest first), then by days in stock as tie-breaker
    prepPriorities = prepPriorities
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return b.daysInStock - a.daysInStock; // Older stock first as tie-breaker
      })
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

  // Process sales KPIs
  // Sales values - margin sales are already gross, VAT qualifying have net + VAT
  const buildSalesBreakdown = (salesData, depositData) => {
    const data = salesData?.[0] || {};
    const marginGross = data.marginSalesGross || 0;
    const vatQNet = data.vatQualifyingNet || 0;
    const vatQVat = data.vatQualifyingVat || 0;

    // For Ex VAT display: margin gross + VAT qualifying net
    const totalNet = marginGross + vatQNet;
    // VAT collected is only from VAT qualifying sales
    const totalVat = vatQVat;
    // Gross total: margin gross + VAT qualifying (net + VAT)
    const totalGross = marginGross + vatQNet + vatQVat;

    return {
      totalNet,
      totalVat,
      totalGross,
      marginSalesGross: marginGross,
      vatQualifyingNet: vatQNet,
      vatQualifyingVat: vatQVat,
      dealCount: data.dealCount || 0,
      depositTotal: depositData?.[0]?.total || 0
    };
  };

  const sales = {
    thisMonth: buildSalesBreakdown(salesThisMonth, depositsThisMonth),
    lastMonth: buildSalesBreakdown(salesLastMonth, depositsLastMonth),
    ytd: buildSalesBreakdown(salesYTD, depositsYTD),
    activeDeals: activeDealsCount || 0,
    inProgressDeals: inProgressDealsCount || 0
  };

  // Build comprehensive activity feed from multiple sources
  // This combines deal events, issues, vehicle changes, tasks, and logged activities

  // First, try to get activities from ActivityLog (newer approach)
  const loggedActivities = await ActivityLog.find({ dealerId: dealerObjectId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  // Also fetch recent changes from other models to supplement the feed
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [recentIssues, recentTasks, allLocations] = await Promise.all([
    // Recent issues (created or completed in last 7 days)
    VehicleIssue.find({
      $or: [
        { createdAt: { $gte: sevenDaysAgo } },
        { completedAt: { $gte: sevenDaysAgo } }
      ]
    })
      .populate("vehicleId", "regCurrent make model dealerId")
      .populate("createdByUserId", "name")
      .populate("updatedByUserId", "name")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
    // Recent completed tasks
    VehicleTask.find({
      completedAt: { $gte: sevenDaysAgo }
    })
      .populate("vehicleId", "regCurrent make model dealerId")
      .populate("assignedUserId", "name")
      .sort({ completedAt: -1 })
      .limit(20)
      .lean(),
    // All locations for lookup
    VehicleLocation.find({ dealerId: dealerObjectId }).lean()
  ]);

  // Build location lookup map
  const locationMap = {};
  allLocations.forEach(loc => {
    locationMap[loc._id.toString()] = loc.name;
  });

  const activityFeed = [];

  // Add logged activities from ActivityLog model
  for (const activity of loggedActivities) {
    activityFeed.push({
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      userName: activity.userName || "System",
      vehicleReg: activity.vehicleReg,
      vehicleMakeModel: activity.vehicleMakeModel,
      vehicleId: activity.vehicleId?.toString(),
      metadata: activity.metadata || {},
    });
  }

  // Add deal events
  for (const deal of recentDealsRaw || []) {
    const vehicle = deal.vehicleId;
    const vehicleDesc = vehicle
      ? `${vehicle.regCurrent || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim()
      : "Unknown vehicle";
    const customer = deal.soldToContactId?.displayName || "Unknown customer";
    const salesPerson = deal.salesPersonId?.name;

    // Deal created
    if (deal.createdAt) {
      activityFeed.push({
        type: "DEAL_CREATED",
        dealId: deal._id.toString(),
        vehicleDesc,
        vehicleReg: vehicle?.regCurrent,
        customer,
        userName: salesPerson || "System",
        amount: deal.vehiclePriceGross,
        timestamp: deal.createdAt,
        description: `Deal created for ${vehicleDesc}`
      });
    }

    // Deposit taken
    if (deal.depositTakenAt) {
      const depositPayment = deal.payments?.find(p => p.type === "DEPOSIT" && !p.isRefunded);
      activityFeed.push({
        type: "DEPOSIT_TAKEN",
        dealId: deal._id.toString(),
        vehicleDesc,
        vehicleReg: vehicle?.regCurrent,
        customer,
        userName: salesPerson || "System",
        amount: depositPayment?.amount || 0,
        timestamp: deal.depositTakenAt,
        description: `Deposit taken for ${vehicleDesc}`
      });
    }

    // Invoice generated
    if (deal.invoicedAt) {
      activityFeed.push({
        type: "INVOICE_GENERATED",
        dealId: deal._id.toString(),
        vehicleDesc,
        vehicleReg: vehicle?.regCurrent,
        customer,
        userName: salesPerson || "System",
        amount: deal.vehiclePriceGross,
        timestamp: deal.invoicedAt,
        description: `Invoice generated for ${vehicleDesc}`
      });
    }

    // Delivered
    if (deal.deliveredAt) {
      activityFeed.push({
        type: "DELIVERED",
        dealId: deal._id.toString(),
        vehicleDesc,
        vehicleReg: vehicle?.regCurrent,
        customer,
        userName: salesPerson || "System",
        timestamp: deal.deliveredAt,
        description: `${vehicleDesc} delivered to ${customer}`
      });
    }

    // Completed
    if (deal.completedAt) {
      activityFeed.push({
        type: "COMPLETED",
        dealId: deal._id.toString(),
        vehicleDesc,
        vehicleReg: vehicle?.regCurrent,
        customer,
        userName: salesPerson || "System",
        amount: deal.vehiclePriceGross,
        timestamp: deal.completedAt,
        description: `Sale completed: ${vehicleDesc}`
      });
    }
  }

  // Add recent issues (filter to this dealer)
  for (const issue of recentIssues) {
    if (issue.vehicleId?.dealerId?.toString() !== dealerId) continue;

    const vehicleReg = issue.vehicleId?.regCurrent || "Unknown";
    const vehicleDesc = issue.vehicleId
      ? `${vehicleReg} ${issue.vehicleId.make || ""} ${issue.vehicleId.model || ""}`.trim()
      : "Unknown vehicle";

    // Issue created
    if (issue.createdAt >= sevenDaysAgo) {
      activityFeed.push({
        type: "ISSUE_CREATED",
        issueId: issue._id.toString(),
        vehicleId: issue.vehicleId?._id?.toString(),
        vehicleReg,
        vehicleDesc,
        userName: issue.createdByUserId?.name || "System",
        timestamp: issue.createdAt,
        description: `Issue added: ${issue.subcategory || issue.category} on ${vehicleReg}`,
        metadata: {
          category: issue.category,
          priority: issue.priority,
          subcategory: issue.subcategory,
        }
      });
    }

    // Issue resolved
    if (issue.status === "Complete" && issue.completedAt && issue.completedAt >= sevenDaysAgo) {
      activityFeed.push({
        type: "ISSUE_RESOLVED",
        issueId: issue._id.toString(),
        vehicleId: issue.vehicleId?._id?.toString(),
        vehicleReg,
        vehicleDesc,
        userName: issue.updatedByUserId?.name || "System",
        timestamp: issue.completedAt,
        description: `Issue resolved: ${issue.subcategory || issue.category} on ${vehicleReg}`,
        metadata: {
          category: issue.category,
          subcategory: issue.subcategory,
        }
      });
    }
  }

  // Add recent completed tasks (filter to this dealer)
  for (const task of recentTasks) {
    if (task.vehicleId?.dealerId?.toString() !== dealerId) continue;

    const vehicleReg = task.vehicleId?.regCurrent || "Unknown";
    const vehicleDesc = task.vehicleId
      ? `${vehicleReg} ${task.vehicleId.make || ""} ${task.vehicleId.model || ""}`.trim()
      : "Unknown vehicle";

    activityFeed.push({
      type: "TASK_COMPLETED",
      taskId: task._id.toString(),
      vehicleId: task.vehicleId?._id?.toString(),
      vehicleReg,
      vehicleDesc,
      userName: task.assignedUserId?.name || "System",
      timestamp: task.completedAt,
      description: `${task.name} completed on ${vehicleReg}`,
      metadata: {
        taskName: task.name,
      }
    });
  }

  // Add recent vehicles added (from recentVehiclesRaw already fetched)
  for (const vehicle of recentVehiclesRaw.slice(0, 5)) {
    if (vehicle.createdAt >= sevenDaysAgo) {
      activityFeed.push({
        type: "VEHICLE_ADDED",
        vehicleId: vehicle._id.toString(),
        vehicleReg: vehicle.regCurrent,
        vehicleDesc: `${vehicle.regCurrent} ${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
        userName: "System", // TODO: track createdByUserId
        timestamp: vehicle.createdAt,
        description: `Vehicle added: ${vehicle.regCurrent} ${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
      });
    }
  }

  // Sort by timestamp descending and deduplicate
  activityFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Deduplicate by creating a unique key for each activity
  const seen = new Set();
  const deduped = [];
  for (const activity of activityFeed) {
    const key = `${activity.type}-${activity.timestamp?.toISOString?.() || activity.timestamp}-${activity.vehicleReg || activity.description?.slice(0, 30)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(activity);
    }
  }

  const recentActivity = deduped.slice(0, 20);

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
      newWarrantyCases,
      pxFinanceUnsettled
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
    // Sales KPIs - using completedAt for proper attribution
    sales,
    // Activity feed - recent sales events
    activityFeed: recentActivity,
  });
}

