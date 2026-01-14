import connectMongo from "@/libs/mongoose";
import SalesDocument from "@/models/SalesDocument";
import crypto from "crypto";

/**
 * Public Payment Receipt API
 * GET /api/public/payment-receipt/[token]
 *
 * Returns payment receipt data for public viewing via share token.
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

  // Hash the token to compare with stored hash
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find document by token hash
  const doc = await SalesDocument.findOne({
    shareTokenHash: tokenHash,
    type: "PAYMENT_RECEIPT",
  });

  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Check if document is void
  if (doc.status === "VOID") {
    return res.status(404).json({ error: "This document has been voided" });
  }

  // Check expiry
  if (doc.shareExpiresAt && new Date() > doc.shareExpiresAt) {
    return res.status(410).json({ error: "This link has expired" });
  }

  return res.status(200).json({
    id: doc._id.toString(),
    type: doc.type,
    documentNumber: doc.documentNumber,
    status: doc.status,
    issuedAt: doc.issuedAt,
    snapshotData: doc.snapshotData,
  });
}
