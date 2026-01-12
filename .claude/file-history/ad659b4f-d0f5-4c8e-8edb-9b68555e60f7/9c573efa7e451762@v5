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

    // For all-day events, set times to start/end of day
    const startDatetime = new Date(request.startDate);
    startDatetime.setHours(0, 0, 0, 0);

    const endDatetime = new Date(request.endDate);
    endDatetime.setHours(23, 59, 59, 999);

    // Idempotent: Update existing calendar event or create new one
    let calendarEvent;
    if (request.linkedCalendarEventId) {
      // Update existing calendar event (e.g., if dates were edited)
      calendarEvent = await CalendarEvent.findByIdAndUpdate(
        request.linkedCalendarEventId,
        {
          title: `${request.type} - ${request.userName}`,
          description: request.notes || `${request.type} request`,
          categoryId: holidayCategory._id,
          startDatetime,
          endDatetime,
        },
        { new: true }
      );
    }

    if (!calendarEvent) {
      // Create new calendar event
      calendarEvent = await CalendarEvent.create({
        dealerId,
        title: `${request.type} - ${request.userName}`,
        description: request.notes || `${request.type} request`,
        categoryId: holidayCategory._id,
        startDatetime,
        endDatetime,
        assignedUserId: request.userId,
        createdByUserId: userId,
        linkedHolidayRequestId: request._id,
      });
    }

    // Update request status
    request.status = "APPROVED";
    request.reviewedByUserId = userId;
    request.reviewedByName = reviewerName;
    request.reviewedAt = new Date();
    request.adminNote = adminNote || null;
    request.linkedCalendarEventId = calendarEvent._id;

    await request.save();

    return res.status(200).json(request.toJSON());
  } catch (error) {
    console.error("Error approving holiday request:", error);
    return res.status(500).json({ error: error.message || "Failed to approve holiday request" });
  }
});
