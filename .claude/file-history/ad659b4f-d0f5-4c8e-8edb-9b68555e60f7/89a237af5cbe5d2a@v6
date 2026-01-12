import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import AftercareCaseComment from "@/models/AftercareCaseComment";
import FormSubmission from "@/models/FormSubmission";
import FormSubmissionFile from "@/models/FormSubmissionFile";
import CourtesyAllocation from "@/models/CourtesyAllocation";
import Vehicle from "@/models/Vehicle";
import User from "@/models/User";
import CalendarEvent from "@/models/CalendarEvent";
import CalendarCategory from "@/models/CalendarCategory";
import { withDealerContext } from "@/libs/authContext";

// Human-readable board status labels
const BOARD_STATUS_LABELS = {
  not_booked_in: "Not Booked In",
  on_site: "On Site",
  work_complete: "Work Complete",
  collected: "Collected"
};

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  if (req.method === "GET") {
    const aftercareCase = await AftercareCase.findOne({ _id: id, dealerId })
      .populate("contactId")
      .populate("vehicleId")
      .populate("vehicleSaleId")
      .lean();
    if (!aftercareCase) return res.status(404).json({ error: "Not found" });

    aftercareCase.comments = await AftercareCaseComment.find({ aftercareCaseId: id })
      .sort({ createdAt: 1 }).lean();

    // Count submission attachments if linked
    let submissionAttachmentCount = 0;
    if (aftercareCase.linkedSubmissionIds?.length > 0) {
      submissionAttachmentCount = await FormSubmissionFile.countDocuments({
        formSubmissionId: { $in: aftercareCase.linkedSubmissionIds }
      });
    }
    aftercareCase.submissionAttachmentCount = submissionAttachmentCount;

    // Count comment attachments
    let commentAttachmentCount = 0;
    aftercareCase.comments.forEach(c => {
      if (c.attachments?.length) commentAttachmentCount += c.attachments.length;
    });
    aftercareCase.commentAttachmentCount = commentAttachmentCount;

    // Populate courtesy allocation with vehicle details
    if (aftercareCase.courtesyAllocationId) {
      const allocation = await CourtesyAllocation.findOne({
        _id: aftercareCase.courtesyAllocationId,
        dealerId
      }).lean();
      if (allocation) {
        // Populate the courtesy vehicle
        const courtesyVehicle = await Vehicle.findById(allocation.courtesyVehicleId).lean();
        aftercareCase.courtesyAllocation = {
          ...allocation,
          courtesyVehicle
        };
      }
    }

    return res.status(200).json(aftercareCase);
  }

  if (req.method === "PUT") {
    const { boardStatus, _eventType, _eventMetadata, ...otherUpdates } = req.body;

    // Get user name for event tracking
    let userName = null;
    if (userId) {
      const user = await User.findById(userId).lean();
      userName = user?.name || null;
    }

    // Build events array
    const events = [];

    // Check if boardStatus is changing
    if (boardStatus) {
      const currentCase = await AftercareCase.findOne({ _id: id, dealerId }).lean();
      if (currentCase && currentCase.boardStatus !== boardStatus) {
        events.push({
          type: "STATUS_CHANGED",
          createdAt: new Date(),
          createdByUserId: userId,
          createdByName: userName,
          summary: `Status changed from "${BOARD_STATUS_LABELS[currentCase.boardStatus] || currentCase.boardStatus}" to "${BOARD_STATUS_LABELS[boardStatus] || boardStatus}"`,
          metadata: {
            fromStatus: currentCase.boardStatus,
            toStatus: boardStatus
          }
        });
      }
    }

    // Location type labels for event summaries
    const LOCATION_LABELS = {
      WITH_CUSTOMER: "With customer",
      ON_SITE: "On-site",
      THIRD_PARTY: "Third-party"
    };

    // Handle custom event types (LOCATION_UPDATED, BOOKING_UPDATED, PARTS_UPDATED, COURTESY_REQUIRED_TOGGLED)
    if (_eventType && ["LOCATION_UPDATED", "BOOKING_UPDATED", "PARTS_UPDATED", "COURTESY_REQUIRED_TOGGLED"].includes(_eventType)) {
      let summary = "";
      switch (_eventType) {
        case "LOCATION_UPDATED":
          const fromLoc = _eventMetadata?.fromLocation || "WITH_CUSTOMER";
          const toLoc = _eventMetadata?.toLocation || "WITH_CUSTOMER";
          summary = `Repair location changed from "${LOCATION_LABELS[fromLoc] || fromLoc}" to "${LOCATION_LABELS[toLoc] || toLoc}"`;
          break;
        case "BOOKING_UPDATED":
          if (_eventMetadata?.newBookedAt) {
            const bookedDate = new Date(_eventMetadata.newBookedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            summary = `Booking set: ${bookedDate}`;
          } else {
            summary = "Booking date cleared";
          }
          break;
        case "PARTS_UPDATED":
          if (_eventMetadata?.partsRequired !== undefined) {
            summary = _eventMetadata.partsRequired ? "Parts required marked" : "Parts no longer required";
          } else if (_eventMetadata?.partsNotes !== undefined) {
            summary = "Parts notes updated";
          }
          break;
        case "COURTESY_REQUIRED_TOGGLED":
          summary = _eventMetadata?.courtesyRequired ? "Courtesy car marked as required" : "Courtesy car no longer required";
          break;
      }

      events.push({
        type: _eventType,
        createdAt: new Date(),
        createdByUserId: userId,
        createdByName: userName,
        summary,
        metadata: _eventMetadata || {}
      });
    }

    // Build update object
    const updateObj = { ...otherUpdates };
    if (boardStatus) updateObj.boardStatus = boardStatus;

    // If events exist, push them
    if (events.length > 0) {
      updateObj.$push = { events: { $each: events } };
    }

    // ===== Calendar Event Automation for Warranty Bookings =====
    // Idempotent: create/update/delete calendar event when bookedInAt changes
    if (_eventType === "BOOKING_UPDATED") {
      const currentCase = await AftercareCase.findOne({ _id: id, dealerId })
        .populate("contactId")
        .populate("vehicleId")
        .lean();

      if (currentCase) {
        const newBookedAt = _eventMetadata?.newBookedAt ? new Date(_eventMetadata.newBookedAt) : null;

        if (newBookedAt) {
          // Get or create "Warranty" calendar category
          let warrantyCategory = await CalendarCategory.findOne({
            dealerId,
            name: "Warranty",
          });
          if (!warrantyCategory) {
            warrantyCategory = await CalendarCategory.create({
              dealerId,
              name: "Warranty",
              colour: "#f59e0b", // Amber color
            });
          }

          // Build event title and description
          const vrm = currentCase.currentReg || currentCase.vehicleId?.vrm || currentCase.regAtPurchase || "Unknown";
          const customerName = currentCase.contactId?.name || "Customer";
          const title = `Warranty: ${vrm} – ${customerName}`;

          // Build description with repair location and issue summary
          const repairLocLabel = LOCATION_LABELS[currentCase.repairLocationType] || currentCase.repairLocationType;
          let description = `Repair location: ${repairLocLabel}`;
          if (currentCase.repairLocationName) {
            description += ` (${currentCase.repairLocationName})`;
          }
          if (currentCase.summary) {
            description += `\n\nIssue: ${currentCase.summary}`;
          }

          // Set end time 2 hours after start (typical booking duration)
          const startDatetime = newBookedAt;
          const endDatetime = new Date(newBookedAt.getTime() + 2 * 60 * 60 * 1000);

          if (currentCase.linkedCalendarEventId) {
            // Update existing calendar event
            await CalendarEvent.findByIdAndUpdate(currentCase.linkedCalendarEventId, {
              title,
              description,
              categoryId: warrantyCategory._id,
              startDatetime,
              endDatetime,
            });
          } else {
            // Create new calendar event
            const calendarEvent = await CalendarEvent.create({
              dealerId,
              title,
              description,
              categoryId: warrantyCategory._id,
              startDatetime,
              endDatetime,
              createdByUserId: userId,
              linkedAftercareCaseId: id,
            });
            // Store the calendar event ID on the case
            updateObj.linkedCalendarEventId = calendarEvent._id;
          }
        } else {
          // Booking cleared - delete linked calendar event
          if (currentCase.linkedCalendarEventId) {
            await CalendarEvent.findByIdAndDelete(currentCase.linkedCalendarEventId);
            updateObj.linkedCalendarEventId = null;
          }
        }
      }
    }

    // Use updateOne to get modifiedCount, then fetch the updated document
    const updateResult = await AftercareCase.updateOne(
      { _id: id, dealerId },
      updateObj
    );

    // Check if document was found and updated
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ ok: false, error: "Case not found for dealer", modifiedCount: 0 });
    }

    // Fetch the updated document
    const aftercareCase = await AftercareCase.findOne({ _id: id, dealerId })
      .populate("contactId")
      .populate("vehicleId")
      .lean();

    return res.status(200).json({
      ok: true,
      modifiedCount: updateResult.modifiedCount,
      case: aftercareCase
    });
  }

  if (req.method === "DELETE") {
    const aftercareCase = await AftercareCase.findOne({ _id: id, dealerId });
    if (!aftercareCase) return res.status(404).json({ error: "Not found" });

    // Delete linked calendar event if exists
    if (aftercareCase.linkedCalendarEventId) {
      await CalendarEvent.findByIdAndDelete(aftercareCase.linkedCalendarEventId);
    }

    await AftercareCaseComment.deleteMany({ aftercareCaseId: id });
    await AftercareCase.findByIdAndDelete(id);
    return res.status(200).json({ message: "Deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
