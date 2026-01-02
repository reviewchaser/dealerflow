import { withDealerContext } from "@/libs/authContext";
import { sendEmail } from "@/libs/mailgun";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";
import CustomerPXIssue from "@/models/CustomerPXIssue";
import Dealer from "@/models/Dealer";
import connectMongo from "@/libs/mongoose";

/**
 * POST /api/customer-px/:id/share-email
 * Send a Customer PX Appraisal summary via email
 */
async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { to, message, includeValuation = true } = req.body;

  if (!to) {
    return res.status(400).json({ error: "Email address is required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  await connectMongo();

  // Fetch appraisal
  const appraisal = await CustomerPXAppraisal.findOne({
    _id: id,
    dealerId: ctx.dealerId,
  }).lean();

  if (!appraisal) {
    return res.status(404).json({ error: "Appraisal not found" });
  }

  // Fetch issues if including valuation details
  let issues = [];
  let totalEstimatedCost = 0;
  if (includeValuation) {
    issues = await CustomerPXIssue.find({ customerPXAppraisalId: id }).lean();
    totalEstimatedCost = issues.reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0);
  }

  // Get dealer info for branding
  const dealer = await Dealer.findById(ctx.dealerId).lean();
  const dealerName = dealer?.companyName || dealer?.name || "Our Dealership";

  const subject = `${dealerName} - PX Valuation for ${appraisal.vehicleReg}`;

  // Build text content
  let textContent = `
${dealerName} - Part Exchange Valuation

Vehicle: ${appraisal.vehicleReg}
${appraisal.vehicleMake ? `Make: ${appraisal.vehicleMake}` : ""}
${appraisal.vehicleModel ? `Model: ${appraisal.vehicleModel}` : ""}
${appraisal.vehicleYear ? `Year: ${appraisal.vehicleYear}` : ""}
${appraisal.mileage ? `Mileage: ${appraisal.mileage.toLocaleString()} miles` : ""}
${appraisal.colour ? `Colour: ${appraisal.colour}` : ""}

${message ? `Message from ${dealerName}:\n${message}\n` : ""}
`;

  if (includeValuation && appraisal.proposedPurchasePrice) {
    textContent += `\nValuation: £${appraisal.proposedPurchasePrice.toLocaleString()}`;
    if (totalEstimatedCost > 0) {
      textContent += `\n(Note: Subject to estimated repairs of £${totalEstimatedCost.toLocaleString()})`;
    }
  }

  textContent += `\n\nIf you have any questions, please contact ${dealerName}.`;

  // Build HTML content
  let valuationHtml = "";
  if (includeValuation && appraisal.proposedPurchasePrice) {
    valuationHtml = `
      <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; text-align: center;">
        <p style="color: rgba(255,255,255,0.9); margin: 0 0 4px; font-size: 14px;">Our Valuation</p>
        <p style="color: white; margin: 0; font-size: 32px; font-weight: 700;">£${appraisal.proposedPurchasePrice.toLocaleString()}</p>
        ${totalEstimatedCost > 0 ? `<p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 12px;">Subject to estimated repairs of £${totalEstimatedCost.toLocaleString()}</p>` : ""}
      </div>
    `;
  }

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
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Part Exchange Valuation</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">${appraisal.vehicleReg}</h2>
        <table style="width: 100%; font-size: 14px; color: #475569;">
          ${appraisal.vehicleMake ? `<tr><td style="padding: 4px 0; color: #64748b;">Make</td><td style="padding: 4px 0; text-align: right; font-weight: 500;">${appraisal.vehicleMake}</td></tr>` : ""}
          ${appraisal.vehicleModel ? `<tr><td style="padding: 4px 0; color: #64748b;">Model</td><td style="padding: 4px 0; text-align: right; font-weight: 500;">${appraisal.vehicleModel}</td></tr>` : ""}
          ${appraisal.vehicleYear ? `<tr><td style="padding: 4px 0; color: #64748b;">Year</td><td style="padding: 4px 0; text-align: right; font-weight: 500;">${appraisal.vehicleYear}</td></tr>` : ""}
          ${appraisal.mileage ? `<tr><td style="padding: 4px 0; color: #64748b;">Mileage</td><td style="padding: 4px 0; text-align: right; font-weight: 500;">${appraisal.mileage.toLocaleString()} miles</td></tr>` : ""}
          ${appraisal.colour ? `<tr><td style="padding: 4px 0; color: #64748b;">Colour</td><td style="padding: 4px 0; text-align: right; font-weight: 500;">${appraisal.colour}</td></tr>` : ""}
        </table>
      </div>

      ${message ? `<p style="color: #475569; margin: 0 0 24px; font-size: 14px; padding: 16px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">${message}</p>` : ""}

      ${valuationHtml}

      <p style="color: #94a3b8; margin: 24px 0 0; font-size: 12px; line-height: 1.5; text-align: center;">
        This valuation is based on the information provided and is subject to vehicle inspection.<br>
        If you have any questions, please contact ${dealerName}.
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
    const result = await sendEmail(to, subject, textContent.trim(), htmlContent);

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
    console.error("Error sending PX appraisal email:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}

export default withDealerContext(handler);
