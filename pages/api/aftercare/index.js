import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import AftercareCaseComment from "@/models/AftercareCaseComment";
import Contact from "@/models/Contact";
import Vehicle from "@/models/Vehicle"; // Required for populate
import VehicleSale from "@/models/VehicleSale"; // Required for populate
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const { boardStatus, status, excludeOldClosed } = req.query;
    let query = { dealerId };
    if (boardStatus && boardStatus !== "all") query.boardStatus = boardStatus;
    if (status && status !== "all") query.status = status;

    // Auto-archive: exclude cases in "collected" status older than 90 days
    if (excludeOldClosed === "true") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      // Either not in "collected" status, OR in "collected" but updated within 90 days
      query.$or = [
        { boardStatus: { $ne: "collected" } },
        { boardStatus: "collected", updatedAt: { $gte: ninetyDaysAgo } }
      ];
    }

    const cases = await AftercareCase.find(query)
      .populate("contactId")
      .populate("vehicleId")
      .populate("vehicleSaleId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(cases);
  }

  if (req.method === "POST") {
    const {
      customerName, customerEmail, customerPhone,
      addressStreet, addressCity, addressPostcode,
      vehicleReg, regAtPurchase, summary, details, source = "manual",
      priority = "normal", warrantyType, attachments
    } = req.body;

    if (!customerName) {
      return res.status(400).json({ error: "Customer name required" });
    }

    // Create or find contact - scoped by dealer
    let contact = null;
    if (customerEmail || customerPhone) {
      const conditions = [];
      if (customerEmail) conditions.push({ email: customerEmail });
      if (customerPhone) conditions.push({ phone: customerPhone });
      contact = await Contact.findOne({ dealerId, $or: conditions });
    }

    if (!contact) {
      contact = await Contact.create({
        dealerId,
        name: customerName,
        email: customerEmail || undefined,
        phone: customerPhone || undefined,
      });
    }

    // Build initial events
    const initialEvents = [{
      type: "CASE_CREATED",
      createdAt: new Date(),
      summary: "Case created"
    }];

    // Process attachments if provided
    const processedAttachments = [];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach(att => {
        processedAttachments.push({
          url: att.url,
          filename: att.filename || "attachment",
          uploadedAt: new Date()
        });
      });
      initialEvents.push({
        type: "ATTACHMENT_ADDED",
        createdAt: new Date(),
        summary: `${attachments.length} file(s) attached`
      });
    }

    // Build customerAddress object if any address fields provided
    const customerAddress = (addressStreet || addressCity || addressPostcode) ? {
      street: addressStreet || "",
      city: addressCity || "",
      postcode: addressPostcode || "",
    } : undefined;

    // Create case with CASE_CREATED event
    const aftercareCase = await AftercareCase.create({
      dealerId,
      contactId: contact._id,
      summary,
      details: { ...details, vehicleReg, regAtPurchase },
      source,
      priority,
      regAtPurchase,
      customerAddress,
      warrantyType: warrantyType || undefined,
      boardStatus: "not_booked_in",
      status: "new",
      attachments: processedAttachments,
      events: initialEvents
    });

    // Create initial comment with claim details
    if (summary || details) {
      await AftercareCaseComment.create({
        aftercareCaseId: aftercareCase._id,
        authorType: source === "warranty_claim_form" ? "customer" : "staff",
        content: summary || "Case created",
      });
    }

    const populated = await AftercareCase.findById(aftercareCase._id)
      .populate("contactId").lean();
    return res.status(201).json(populated);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
