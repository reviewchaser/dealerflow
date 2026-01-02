import { withDealerContext } from "@/libs/authContext";
import { sendEmail } from "@/libs/mailgun";
import Dealer from "@/models/Dealer";
import connectMongo from "@/libs/mongoose";

/**
 * POST /api/forms/share-email
 * Send a form link via email
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, formName, formUrl, message } = req.body;

  if (!to || !formUrl) {
    return res.status(400).json({ error: "Missing required fields: to, formUrl" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  await connectMongo();

  // Get dealer info for branding
  const dealer = await Dealer.findById(ctx.dealerId).lean();
  const dealerName = dealer?.companyName || dealer?.name || "Our Dealership";

  const subject = `${dealerName} - ${formName || "Form Invitation"}`;

  const textContent = `
${dealerName} has invited you to complete a form.

${message ? `Message: ${message}\n` : ""}
Please click the link below to access the form:

${formUrl}

If you have any questions, please contact ${dealerName}.
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #0066CC 0%, #0052a3 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${dealerName}</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">${formName || "Form Invitation"}</h2>
      ${message ? `<p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">${message}</p>` : ""}
      <p style="color: #475569; margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
        You've been invited to complete a form. Please click the button below to get started.
      </p>
      <a href="${formUrl}" style="display: inline-block; background: #0066CC; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Open Form
      </a>
      <p style="color: #94a3b8; margin: 32px 0 0; font-size: 12px; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${formUrl}" style="color: #0066CC; word-break: break-all;">${formUrl}</a>
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 32px; text-align: center;">
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
        Sent by ${dealerName} via DealerFlow
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const result = await sendEmail(to, subject, textContent, htmlContent);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Email sent to ${to}`,
        provider: result.provider,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to send email",
      });
    }
  } catch (error) {
    console.error("Error sending share email:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}

export default withDealerContext(handler);
