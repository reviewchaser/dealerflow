import { withDealerContext } from "../../../libs/authContext";
import connectMongo from "../../../libs/mongoose";
import OvertimeSubmission from "../../../models/OvertimeSubmission";
import User from "../../../models/User";

/**
 * User Overtime API
 * GET  - List own submissions (with optional filters)
 * POST - Create a new draft submission for a week
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;

  if (req.method === "GET") {
    return handleGet(req, res, dealerId, userId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, ctx);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

/**
 * GET /api/overtime
 * Query params:
 *   - status: filter by status (DRAFT, SUBMITTED, APPROVED, REJECTED)
 *   - year: filter by year (defaults to current year)
 *   - month: filter by month (1-12)
 *   - limit: max results (default 52, max 100)
 */
async function handleGet(req, res, dealerId, userId) {
  try {
    const { status, year, month, limit = 52 } = req.query;

    const query = {
      dealerId,
      userId,
    };

    // Filter by status
    if (status && ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].includes(status)) {
      query.status = status;
    }

    // Filter by date range
    if (year) {
      const yearNum = parseInt(year, 10);
      if (month) {
        // Specific month
        const monthNum = parseInt(month, 10) - 1;
        const startDate = new Date(Date.UTC(yearNum, monthNum, 1));
        const endDate = new Date(Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59));
        query.weekStartDate = { $gte: startDate, $lte: endDate };
      } else {
        // Entire year
        const startDate = new Date(Date.UTC(yearNum, 0, 1));
        const endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59));
        query.weekStartDate = { $gte: startDate, $lte: endDate };
      }
    }

    const submissions = await OvertimeSubmission.find(query)
      .sort({ weekStartDate: -1 })
      .limit(Math.min(parseInt(limit, 10), 100))
      .lean();

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Error fetching overtime submissions:", error);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
}

/**
 * POST /api/overtime
 * Body:
 *   - weekStartDate: ISO date string (will be normalized to Monday)
 *   - entries: optional initial day entries
 *   - notes: optional notes
 */
async function handlePost(req, res, ctx) {
  try {
    const { dealerId, userId, user } = ctx;
    const { weekStartDate, entries, notes } = req.body;

    if (!weekStartDate) {
      return res.status(400).json({ error: "weekStartDate is required" });
    }

    // Normalize to Monday of that week
    const normalizedWeekStart = OvertimeSubmission.getWeekStartDate(new Date(weekStartDate));

    // Check if submission already exists for this week
    const existing = await OvertimeSubmission.findOne({
      dealerId,
      userId,
      weekStartDate: normalizedWeekStart,
    });

    if (existing) {
      return res.status(409).json({
        error: "Submission already exists for this week",
        existingId: existing._id,
        status: existing.status,
      });
    }

    // Get user's display name for snapshot
    const fullUser = await User.findById(userId).lean();
    const userDisplayName = fullUser?.fullName || fullUser?.name || user?.email?.split("@")[0] || "Unknown User";

    // Validate entries if provided
    const validatedEntries = validateEntries(entries);

    const submission = new OvertimeSubmission({
      dealerId,
      userId,
      userDisplayNameSnapshot: userDisplayName,
      weekStartDate: normalizedWeekStart,
      status: "DRAFT",
      entries: validatedEntries,
      notes: notes?.trim() || null,
    });

    await submission.save();

    return res.status(201).json({
      submission: submission.toObject(),
      message: "Draft created successfully",
    });
  } catch (error) {
    console.error("Error creating overtime submission:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ error: "Submission already exists for this week" });
    }

    return res.status(500).json({ error: "Failed to create submission" });
  }
}

/**
 * Validate and sanitize day entries
 */
function validateEntries(entries) {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const seenDays = new Set();

  return entries
    .filter((entry) => {
      // Must have a valid day
      if (!entry.day || !validDays.includes(entry.day)) {
        return false;
      }
      // No duplicate days
      if (seenDays.has(entry.day)) {
        return false;
      }
      seenDays.add(entry.day);
      return true;
    })
    .map((entry) => ({
      day: entry.day,
      startTime: entry.startTime || null,
      endTime: entry.endTime || null,
      startFinishText: entry.startFinishText?.trim() || null,
      location: entry.location?.trim() || null,
      overtimeHours: Math.min(Math.max(parseFloat(entry.overtimeHours) || 0, 0), 24),
      breakMinutes: Math.min(Math.max(parseInt(entry.breakMinutes, 10) || 0, 0), 480),
    }));
}

export default withDealerContext(handler);
