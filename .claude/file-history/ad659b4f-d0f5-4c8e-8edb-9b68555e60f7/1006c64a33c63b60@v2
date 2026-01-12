import mongoose from "mongoose";
import connectMongo from "@/libs/mongoose";
import HolidayRequest from "@/models/HolidayRequest";
import CalendarEvent from "@/models/CalendarEvent";
import { withDealerContext } from "@/libs/authContext";

export default withDealerContext(async (req, res, ctx) => {
  await connectMongo();
  const { dealerId, userId, role } = ctx;
  const { id } = req.query;

  // Validate ID parameter
  if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
    console.error("Invalid holiday request ID:", id);
    return res.status(400).json({ error: "Invalid holiday request ID" });
  }

  // GET - Get single holiday request
  if (req.method === "GET") {
    try {
      const request = await HolidayRequest.findOne({ _id: id, dealerId }).lean();

      if (!request) {
        return res.status(404).json({ error: "Holiday request not found" });
      }

      // Staff can only view their own requests
      if ((role === "STAFF" || role === "WORKSHOP") && request.userId.toString() !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      return res.status(200).json(request);
    } catch (error) {
      console.error("Error fetching holiday request:", error);
      return res.status(500).json({ error: "Failed to fetch holiday request" });
    }
  }

  // PUT - Update holiday request (only if PENDING and own request or ADMIN)
  if (req.method === "PUT") {
    try {
      const request = await HolidayRequest.findOne({ _id: id, dealerId });

      if (!request) {
        return res.status(404).json({ error: "Holiday request not found" });
      }

      // Only allow updates if pending
      if (request.status !== "PENDING") {
        return res.status(400).json({ error: "Can only edit pending requests" });
      }

      // Staff can only edit their own requests
      if ((role === "STAFF" || role === "WORKSHOP") && request.userId.toString() !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { startDate, endDate, type, notes } = req.body;

      if (startDate) request.startDate = new Date(startDate);
      if (endDate) request.endDate = new Date(endDate);
      if (type) request.type = type;
      if (notes !== undefined) request.notes = notes;

      await request.save();
      return res.status(200).json(request.toJSON());
    } catch (error) {
      console.error("Error updating holiday request:", error);
      return res.status(500).json({ error: "Failed to update holiday request" });
    }
  }

  // DELETE - Cancel/delete holiday request
  if (req.method === "DELETE") {
    try {
      const request = await HolidayRequest.findOne({ _id: id, dealerId });

      if (!request) {
        return res.status(404).json({ error: "Holiday request not found" });
      }

      // Staff can only delete their own pending requests
      if ((role === "STAFF" || role === "WORKSHOP")) {
        if (request.userId.toString() !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        if (request.status !== "PENDING") {
          return res.status(400).json({ error: "Can only cancel pending requests" });
        }
      }

      // If approved, delete linked calendar event
      if (request.linkedCalendarEventId) {
        await CalendarEvent.findByIdAndDelete(request.linkedCalendarEventId);
      }

      await HolidayRequest.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting holiday request:", error);
      return res.status(500).json({ error: "Failed to delete holiday request" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
