import connectMongo from "@/libs/mongoose";
import HolidayRequest from "@/models/HolidayRequest";
import User from "@/models/User";
import { withDealerContext } from "@/libs/authContext";

export default withDealerContext(async (req, res, ctx) => {
  await connectMongo();
  const { dealerId, userId, role } = ctx;

  // GET - List holiday requests
  if (req.method === "GET") {
    try {
      let query = { dealerId };

      // Staff can only see their own requests; ADMIN/OWNER see all
      if (role === "STAFF" || role === "WORKSHOP") {
        query.userId = userId;
      }

      // Optional filters
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.userId && (role === "OWNER" || role === "ADMIN")) {
        query.userId = req.query.userId;
      }

      const requests = await HolidayRequest.find(query)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .lean();

      // Enrich with user info and transform _id to id
      const enrichedRequests = requests.map(req => ({
        ...req,
        id: req._id.toString(), // Ensure id is available for frontend
        userName: req.userName || req.userId?.name || req.userId?.email || "Unknown",
        userEmail: req.userEmail || req.userId?.email || "",
        // Compute totalDays if not stored
        totalDays: req.totalDays || (Math.ceil(Math.abs(new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24)) + 1),
      }));

      return res.status(200).json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching holiday requests:", error);
      return res.status(500).json({ error: "Failed to fetch holiday requests" });
    }
  }

  // POST - Create holiday request
  if (req.method === "POST") {
    try {
      const {
        startDate,
        endDate,
        startSession = "AM",
        endSession = "PM",
        type,
        notes,
        requestForUserId,
      } = req.body;

      if (!startDate) {
        return res.status(400).json({ error: "Start date is required" });
      }

      // Validate sessions
      if (!["AM", "PM"].includes(startSession) || !["AM", "PM"].includes(endSession)) {
        return res.status(400).json({ error: "Invalid session values. Must be AM or PM." });
      }

      // Parse dates
      const start = new Date(startDate);
      // If no end date, default to start date (single day)
      const end = endDate ? new Date(endDate) : new Date(startDate);

      if (end < start) {
        return res.status(400).json({ error: "End date must be on or after start date" });
      }

      // Compute total days using the AM/PM logic
      const totalDaysComputed = HolidayRequest.computeTotalDays(start, end, startSession, endSession);

      if (totalDaysComputed === null) {
        return res.status(400).json({ error: "Invalid date/session combination. PM to AM on the same day is not allowed." });
      }

      // Prevent absurd date ranges (max 60 days per request)
      if (totalDaysComputed > 60) {
        return res.status(400).json({ error: "Holiday request cannot exceed 60 days. Please submit multiple requests for longer periods." });
      }

      // Prevent dates too far in the past (max 1 year ago)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (start < oneYearAgo) {
        return res.status(400).json({ error: "Start date cannot be more than 1 year in the past" });
      }

      // Prevent dates too far in the future (max 2 years ahead)
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (end > twoYearsFromNow) {
        return res.status(400).json({ error: "End date cannot be more than 2 years in the future" });
      }

      // Determine target user ID for duplicate check
      const checkUserId = (requestForUserId && (role === "OWNER" || role === "ADMIN"))
        ? requestForUserId
        : userId;

      // Check for overlapping existing requests (PENDING or APPROVED)
      // Two date ranges overlap if: start1 <= end2 AND end1 >= start2
      const overlappingRequests = await HolidayRequest.find({
        dealerId,
        userId: checkUserId,
        status: { $in: ["PENDING", "APPROVED"] },
        $and: [
          { startDate: { $lte: end } },
          { endDate: { $gte: start } }
        ]
      }).lean();

      if (overlappingRequests.length > 0) {
        const existingDates = overlappingRequests.map(r => {
          const s = new Date(r.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          const e = new Date(r.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          return s === e ? s : `${s} - ${e}`;
        }).join(", ");

        return res.status(409).json({
          error: `You already have a ${overlappingRequests[0].status.toLowerCase()} request that overlaps with these dates (${existingDates})`,
          existingRequestId: overlappingRequests[0]._id.toString(),
          existingDates
        });
      }

      // Determine which user the request is for
      let targetUserId = userId;
      let targetUserName = ctx.user.name || ctx.user.email;
      let targetUserEmail = ctx.user.email;

      // Admin/Owner can create requests for other staff
      if (requestForUserId && (role === "OWNER" || role === "ADMIN")) {
        const targetUser = await User.findById(requestForUserId).lean();
        if (targetUser) {
          targetUserId = requestForUserId;
          targetUserName = targetUser.fullName || targetUser.name || targetUser.email;
          targetUserEmail = targetUser.email;
        }
      } else {
        // Get current user's name
        const currentUser = await User.findById(userId).lean();
        if (currentUser) {
          targetUserName = currentUser.fullName || currentUser.name || currentUser.email;
          targetUserEmail = currentUser.email;
        }
      }

      const request = await HolidayRequest.create({
        dealerId,
        userId: targetUserId,
        userName: targetUserName,
        userEmail: targetUserEmail,
        startDate: start,
        endDate: end,
        startSession,
        endSession,
        totalDaysComputed,
        totalDays: totalDaysComputed, // legacy field
        type: type || "Holiday",
        notes,
        status: "PENDING",
      });

      return res.status(201).json(request.toJSON());
    } catch (error) {
      console.error("Error creating holiday request:", error);
      return res.status(500).json({ error: "Failed to create holiday request" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
