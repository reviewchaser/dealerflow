import connectMongo from "@/libs/mongoose";
import SalesDocument from "@/models/SalesDocument";
import crypto from "crypto";

/**
 * Public Purchase Invoice API
 * GET /api/public/self-bill/[token]
 *
 * Returns purchase invoice data for public viewing (no auth required).
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
    type: "SELF_BILL_INVOICE",
    status: { $ne: "VOID" },
  }).lean();

  if (!document) {
    return res.status(404).json({ error: "Document not found or has expired" });
  }

  // Check expiry
  if (document.shareExpiresAt && new Date(document.shareExpiresAt) < new Date()) {
    return res.status(410).json({ error: "This link has expired" });
  }

  // Return document data (sanitize sensitive fields)
  return res.status(200).json({
    id: document._id.toString(),
    type: document.type,
    documentNumber: document.documentNumber,
    status: document.status,
    issuedAt: document.issuedAt,
    snapshotData: document.snapshotData,
  });
}
