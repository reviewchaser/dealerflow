import mongoose from "mongoose";
import connectMongo from "@/libs/mongoose";
import HolidayRequest from "@/models/HolidayRequest";
import CalendarEvent from "@/models/CalendarEvent";
import CalendarCategory from "@/models/CalendarCategory";
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

  // Only OWNER/ADMIN can approve
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

    // Validate date range before approval
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (end < start) {
      return res.status(400).json({ error: "Invalid date range: end date is before start date" });
    }

    if (totalDays > 60) {
      return res.status(400).json({ error: `Invalid date range: ${totalDays} days exceeds maximum of 60 days. Please reject and ask user to resubmit.` });
    }

    // If already approved, just return success (idempotent)
    if (request.status === "APPROVED") {
      return res.status(200).json(request.toJSON());
    }

    const { adminNote } = req.body;

    // Get reviewer name
    const reviewer = await User.findById(userId).lean();
    const reviewerName = reviewer?.name || user?.name || user?.email || "Admin";

    // Get or create "Holiday" calendar category
    let holidayCategory = await CalendarCategory.findOne({
      dealerId,
      name: "Holiday",
    });

    if (!holidayCategory) {
      holidayCategory = await CalendarCategory.create({
        dealerId,
        name: "Holiday",
        colour: "#10b981", // Green color for holidays
      });
    }

    // Idempotent cleanup: Delete any existing linked calendar events first
    const existingEventIds = [
      ...(request.linkedCalendarEventIds || []),
      ...(request.linkedCalendarEventId ? [request.linkedCalendarEventId] : [])
    ];

    if (existingEventIds.length > 0) {
      await CalendarEvent.deleteMany({
        _id: { $in: existingEventIds },
        dealerId
      });
    }

    // Create one calendar event per day in the range (inclusive)
    const createdEventIds = [];
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      // Create event for this day
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Format day label (e.g., "Day 1 of 5")
      const dayNumber = Math.ceil((currentDate - start) / (1000 * 60 * 60 * 24)) + 1;
      const dayLabel = totalDays > 1 ? ` (Day ${dayNumber}/${totalDays})` : "";

      const calendarEvent = await CalendarEvent.create({
        dealerId,
        title: `${request.type} - ${request.userName}${dayLabel}`,
        description: request.notes || `${request.type} request`,
        categoryId: holidayCategory._id,
        startDatetime: dayStart,
        endDatetime: dayEnd,
        assignedUserId: request.userId,
        createdByUserId: userId,
        linkedHolidayRequestId: request._id,
      });

      createdEventIds.push(calendarEvent._id);

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update request status
    request.status = "APPROVED";
    request.reviewedByUserId = userId;
    request.reviewedByName = reviewerName;
    request.reviewedAt = new Date();
    request.adminNote = adminNote || null;
    // Store all event IDs
    request.linkedCalendarEventIds = createdEventIds;
    // Also set legacy single ID to first event for backwards compat
    request.linkedCalendarEventId = createdEventIds[0] || null;

    await request.save();

    return res.status(200).json(request.toJSON());
  } catch (error) {
    console.error("Error approving holiday request:", error);
    return res.status(500).json({ error: error.message || "Failed to approve holiday request" });
  }
});
