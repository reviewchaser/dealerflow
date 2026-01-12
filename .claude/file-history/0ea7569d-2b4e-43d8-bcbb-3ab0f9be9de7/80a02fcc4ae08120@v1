import connectMongo from "@/libs/mongoose";
import Deal from "@/models/Deal";
import SalesDocument from "@/models/SalesDocument";
import { withDealerContext } from "@/libs/authContext";

/**
 * Deal Documents API
 * GET /api/deals/[id]/documents
 *
 * Returns all sales documents (receipts, invoices) for a deal.
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid deal ID" });
  }

  // Verify deal belongs to dealer
  const deal = await Deal.findOne({ _id: id, dealerId }).lean();
  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Fetch documents for this deal
  const documents = await SalesDocument.find({
    dealerId,
    dealId: id,
  })
    .sort({ createdAt: -1 })
    .lean();

  // Add share URLs to documents
  const documentsWithUrls = documents.map((doc) => ({
    id: doc._id.toString(),
    type: doc.type,
    documentNumber: doc.documentNumber,
    status: doc.status,
    issuedAt: doc.issuedAt,
    shareToken: doc.shareToken,
    shareUrl:
      doc.type === "DEPOSIT_RECEIPT"
        ? `/public/deposit-receipt/${doc.shareToken}`
        : `/public/invoice/${doc.shareToken}`,
    createdAt: doc.createdAt,
  }));

  return res.status(200).json({
    documents: documentsWithUrls,
  });
}

export default withDealerContext(handler);
