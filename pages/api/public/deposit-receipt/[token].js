import connectMongo from "@/libs/mongoose";
import SalesDocument from "@/models/SalesDocument";
import crypto from "crypto";

/**
 * Public Deposit Receipt API
 * GET /api/public/deposit-receipt/[token]
 *
 * Returns deposit receipt data for public viewing (no auth required).
 * Uses share token hash for lookup.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Hash the token for lookup
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find the document
  const document = await SalesDocument.findOne({
    shareTokenHash: tokenHash,
    type: "DEPOSIT_RECEIPT",
    status: { $ne: "VOID" },
  }).lean();

  if (!document) {
    return res.status(404).json({ error: "Document not found or has expired" });
  }

  // Check expiry
  if (document.shareExpiresAt && new Date(document.shareExpiresAt) < new Date()) {
    return res.status(410).json({ error: "This link has expired" });
  }

  // DEBUG: Log what's in the snapshotData
  console.log("[deposit-receipt-api] Document ID:", document._id);
  console.log("[deposit-receipt-api] snapshotData.notes:", document.snapshotData?.notes);
  console.log("[deposit-receipt-api] snapshotData.delivery:", JSON.stringify(document.snapshotData?.delivery, null, 2));
  console.log("[deposit-receipt-api] snapshotData.warranty:", JSON.stringify(document.snapshotData?.warranty, null, 2));

  // Return document data (sanitize sensitive fields)
  res.status(200).json({
    id: document._id.toString(),
    type: document.type,
    documentNumber: document.documentNumber,
    status: document.status,
    issuedAt: document.issuedAt,
    snapshotData: document.snapshotData,
  });
}
