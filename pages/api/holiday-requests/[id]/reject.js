import mongoose from "mongoose";
import connectMongo from "@/libs/mongoose";
import HolidayRequest from "@/models/HolidayRequest";
import CalendarEvent from "@/models/CalendarEvent";
import User from "@/models/User";
import { withDealerContext, requireRole } from "@/libs/authContext";

export default withDealerContext(async (req, res, ctx) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId, role, user } = ctx;
  const { id } = req.query;

  // Validate ID parameter
  if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
    console.error("Invalid holiday request ID:", id);
    return res.status(400).json({ error: "Invalid holiday request ID" });
  }

  // Only OWNER/ADMIN can reject
  try {
    requireRole({ role }, ["OWNER", "ADMIN"]);
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }

  try {
    const request = await HolidayRequest.findOne({ _id: id, dealerId });

    if (!request) {
      return res.status(404).json({ error: "Holiday request not found" });
    }

    // Idempotent: If already rejected, return success
    if (request.status === "REJECTED") {
      return res.status(200).json(request.toJSON());
    }

    const { adminNote } = req.body;

    // Get reviewer name
    const reviewer = await User.findById(userId).lean();
    const reviewerName = reviewer?.name || user?.name || user?.email || "Admin";

    // Delete all linked calendar events (from previous approval)
    const existingEventIds = [
      ...(request.linkedCalendarEventIds || []),
      ...(request.linkedCalendarEventId ? [request.linkedCalendarEventId] : [])
    ];

    if (existingEventIds.length > 0) {
      try {
        await CalendarEvent.deleteMany({
          _id: { $in: existingEventIds },
          dealerId
        });
      } catch (err) {
        console.warn("Could not delete calendar events:", err.message);
      }
    }

    // Clear the linked event IDs
    request.linkedCalendarEventId = null;
    request.linkedCalendarEventIds = [];

    // Update request status
    request.status = "REJECTED";
    request.reviewedByUserId = userId;
    request.reviewedByName = reviewerName;
    request.reviewedAt = new Date();
    request.adminNote = adminNote || null;

    await request.save();

    return res.status(200).json(request.toJSON());
  } catch (error) {
    console.error("Error rejecting holiday request:", error);
    return res.status(500).json({ error: error.message || "Failed to reject holiday request" });
  }
});
