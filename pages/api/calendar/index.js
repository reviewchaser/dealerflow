import connectMongo from "@/libs/mongoose";
import CalendarEvent from "@/models/CalendarEvent";
import CalendarCategory from "@/models/CalendarCategory";
import Contact from "@/models/Contact"; // Required for populate
import Vehicle from "@/models/Vehicle"; // Required for populate
import User from "@/models/User"; // Required for populate
import Notification from "@/models/Notification";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const { start, end, categoryId } = req.query;
    let query = { dealerId };

    if (start && end) {
      query.startDatetime = { $gte: new Date(start), $lte: new Date(end) };
    }
    if (categoryId) query.categoryId = categoryId;

    const events = await CalendarEvent.find(query)
      .populate("categoryId")
      .populate("linkedContactId")
      .populate("linkedVehicleId")
      .populate("assignedToUserIds", "name email")
      .sort({ startDatetime: 1 })
      .lean();

    // Transform _id to id for events and nested objects
    const result = events.map(event => ({
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      categoryId: event.categoryId ? {
        id: event.categoryId._id?.toString(),
        name: event.categoryId.name,
        colour: event.categoryId.colour,
      } : null,
      startDatetime: event.startDatetime,
      endDatetime: event.endDatetime,
      linkedContactId: event.linkedContactId,
      linkedVehicleId: event.linkedVehicleId,
      assignedToUserIds: event.assignedToUserIds || [],
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const {
      title, description, categoryId,
      startDatetime, endDatetime,
      linkedContactId, linkedVehicleId, linkedLeadId, linkedAftercareCaseId,
      assignedToUserIds
    } = req.body;

    if (!title || !startDatetime || !endDatetime) {
      return res.status(400).json({ error: "Title, start and end time required" });
    }

    const eventData = {
      dealerId,
      title,
      description,
      startDatetime: new Date(startDatetime),
      endDatetime: new Date(endDatetime),
    };

    // Only add categoryId if it's a valid ObjectId
    if (categoryId && categoryId !== "") {
      eventData.categoryId = categoryId;
    }

    // Only add linked IDs if they exist
    if (linkedContactId) eventData.linkedContactId = linkedContactId;
    if (linkedVehicleId) eventData.linkedVehicleId = linkedVehicleId;
    if (linkedLeadId) eventData.linkedLeadId = linkedLeadId;
    if (linkedAftercareCaseId) eventData.linkedAftercareCaseId = linkedAftercareCaseId;
    if (assignedToUserIds && assignedToUserIds.length > 0) {
      eventData.assignedToUserIds = assignedToUserIds;
    }

    const event = await CalendarEvent.create(eventData);

    // Create notification for new calendar event
    const eventDate = new Date(startDatetime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    await Notification.create({
      dealerId,
      userId: null, // broadcasts to all users in dealer
      type: "CALENDAR_EVENT_CREATED",
      title: "New Calendar Event",
      message: `${title} - ${eventDate}`,
      relatedCalendarEventId: event._id,
      isRead: false,
    });

    // Create notifications for assigned users
    if (assignedToUserIds && assignedToUserIds.length > 0) {
      for (const assignedUserId of assignedToUserIds) {
        if (assignedUserId === ctx.userId) continue; // Don't notify self
        await Notification.create({
          dealerId,
          userId: assignedUserId,
          type: "CALENDAR_EVENT_ASSIGNED",
          title: "You've been assigned to a calendar event",
          message: `${title} - ${eventDate}`,
          relatedCalendarEventId: event._id,
          isRead: false,
        });
      }
    }

    const populated = await CalendarEvent.findById(event._id)
      .populate("categoryId")
      .populate("assignedToUserIds", "name email")
      .lean();

    // Transform for response
    return res.status(201).json({
      id: populated._id.toString(),
      title: populated.title,
      description: populated.description,
      categoryId: populated.categoryId ? {
        id: populated.categoryId._id?.toString(),
        name: populated.categoryId.name,
        colour: populated.categoryId.colour,
      } : null,
      startDatetime: populated.startDatetime,
      endDatetime: populated.endDatetime,
      assignedToUserIds: populated.assignedToUserIds || [],
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
