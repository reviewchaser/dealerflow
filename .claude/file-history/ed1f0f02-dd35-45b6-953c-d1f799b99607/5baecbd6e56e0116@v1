import connectMongo from "@/libs/mongoose";
import ReviewRequest from "@/models/ReviewRequest";
import Contact from "@/models/Contact";
import { withDealerContext } from "@/libs/authContext";
import crypto from "crypto";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;

  const { channel, recipientName, recipientContact, vehicleId } = req.body;

  if (!channel || !recipientName || !recipientContact) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["email", "sms", "whatsapp"].includes(channel)) {
    return res.status(400).json({ error: "Invalid channel" });
  }

  try {
    // Find or create contact
    let contact = await Contact.findOne({
      dealerId,
      $or: [
        { email: recipientContact.toLowerCase() },
        { phone: recipientContact }
      ]
    });

    if (!contact) {
      // Create new contact
      const contactData = {
        dealerId,
        name: recipientName,
      };

      if (channel === "email") {
        contactData.email = recipientContact.toLowerCase();
      } else {
        contactData.phone = recipientContact;
      }

      contact = await Contact.create(contactData);
    }

    // Generate unique token for review link
    const uniqueToken = crypto.randomBytes(32).toString("hex");

    // Create review request
    const reviewRequest = await ReviewRequest.create({
      dealerId,
      contactId: contact._id,
      vehicleId: vehicleId || null,
      channel,
      status: "sent",
      uniqueToken,
      sentAt: new Date(),
    });

    // TODO: Actually send the message via the appropriate channel
    // For now, just log it (actual sending would require Twilio, SendGrid, etc.)
    console.log(`[Reviews] Would send ${channel} to ${recipientContact} with token ${uniqueToken}`);

    // In production:
    // - Email: Use SendGrid/Mailgun to send email with review link
    // - SMS: Use Twilio to send SMS with short link
    // - WhatsApp: Use Twilio WhatsApp API

    return res.status(201).json({
      ok: true,
      reviewRequest: {
        id: reviewRequest._id,
        channel,
        status: "sent",
        sentAt: reviewRequest.sentAt,
      },
      // For demo/testing purposes, include the review link
      reviewLink: `/public/review/${uniqueToken}`,
    });

  } catch (error) {
    console.error("Error sending review request:", error);
    return res.status(500).json({ error: "Failed to send review request" });
  }
}

export default withDealerContext(handler);
