import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import SalesDocument from "@/models/SalesDocument";
import { withDealerContext } from "@/libs/authContext";

/**
 * Void Invoice API
 * POST /api/deals/[id]/void-invoice
 *
 * Voids an existing invoice and reverts deal status to DEPOSIT_TAKEN.
 * Allows generating a new corrected invoice.
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid deal ID" });
  }

  const { reason } = req.body || {};

  // Get the deal
  const deal = await Deal.findOne({ _id: id, dealerId });

  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Can only void invoice for INVOICED deals (not delivered or completed)
  if (deal.status !== "INVOICED") {
    return res.status(400).json({
      error: `Cannot void invoice for ${deal.status.toLowerCase()} deal`,
      hint: deal.status === "DELIVERED" || deal.status === "COMPLETED"
        ? "Deal has already been delivered or completed"
        : "No invoice exists for this deal",
    });
  }

  // Find the active invoice
  const invoice = await SalesDocument.findOne({
    dealId: deal._id,
    type: "INVOICE",
    status: { $ne: "VOID" },
  });

  if (!invoice) {
    return res.status(400).json({
      error: "No active invoice found for this deal",
    });
  }

  // Void the invoice
  invoice.status = "VOID";
  invoice.voidedAt = new Date();
  invoice.voidedByUserId = userId;
  invoice.voidReason = reason || "Voided by user";
  await invoice.save();

  // Revert deal status to DEPOSIT_TAKEN
  deal.status = "DEPOSIT_TAKEN";
  deal.invoicedAt = null;
  deal.updatedByUserId = userId;
  await deal.save();

  return res.status(200).json({
    success: true,
    message: "Invoice voided successfully",
    dealId: deal._id.toString(),
    dealStatus: deal.status,
    voidedInvoiceNumber: invoice.documentNumber,
    hint: "You can now generate a new invoice for this deal",
  });
}

export default withDealerContext(handler);
