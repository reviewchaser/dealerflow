import connectMongo from "@/libs/mongoose";
import CalendarEvent from "@/models/CalendarEvent";
import Contact from "@/models/Contact"; // Required for populate
import Vehicle from "@/models/Vehicle"; // Required for populate
import User from "@/models/User"; // Required for populate
import Notification from "@/models/Notification";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Event ID is required" });
  }

  if (req.method === "GET") {
    const event = await CalendarEvent.findOne({ _id: id, dealerId })
      .populate("categoryId")
      .populate("linkedContactId")
      .populate("linkedVehicleId")
      .populate("assignedToUserIds", "name email")
      .lean();

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({
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
    });
  }

  if (req.method === "PUT") {
    const {
      title, description, categoryId,
      startDatetime, endDatetime,
      linkedContactId, linkedVehicleId,
      assignedToUserIds
    } = req.body;

    if (!title || !startDatetime || !endDatetime) {
      return res.status(400).json({ error: "Title, start and end time required" });
    }

    // Fetch existing event to compare assigned users
    const existingEvent = await CalendarEvent.findOne({ _id: id, dealerId }).lean();
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }
    const oldAssignedIds = (existingEvent.assignedToUserIds || []).map(id => id.toString());

    const updateData = {
      title,
      description: description || "",
      startDatetime: new Date(startDatetime),
      endDatetime: new Date(endDatetime),
    };

    // Handle categoryId - set to null if empty, otherwise use the value
    if (categoryId && categoryId !== "") {
      updateData.categoryId = categoryId;
    } else {
      updateData.categoryId = null;
    }

    // Only update linked IDs if they exist in request
    if (linkedContactId !== undefined) {
      updateData.linkedContactId = linkedContactId || null;
    }
    if (linkedVehicleId !== undefined) {
      updateData.linkedVehicleId = linkedVehicleId || null;
    }
    if (assignedToUserIds !== undefined) {
      updateData.assignedToUserIds = assignedToUserIds || [];
    }

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: id, dealerId },
      updateData,
      { new: true, runValidators: true }
    ).populate("categoryId").populate("assignedToUserIds", "name email").lean();

    // Create notifications for newly assigned users
    if (assignedToUserIds && assignedToUserIds.length > 0) {
      const newAssignees = assignedToUserIds.filter(uid => !oldAssignedIds.includes(uid.toString()));
      if (newAssignees.length > 0) {
        const eventDate = new Date(startDatetime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        for (const assignedUserId of newAssignees) {
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
    }

    return res.status(200).json({
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
      assignedToUserIds: event.assignedToUserIds || [],
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  }

  if (req.method === "DELETE") {
    const event = await CalendarEvent.findOneAndDelete({ _id: id, dealerId });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({ success: true, message: "Event deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
