import { generatePdf } from "@/libs/pdfGenerator";
import connectMongo from "@/libs/mongoose";
import SalesDocument from "@/models/SalesDocument";
import crypto from "crypto";

/**
 * Deposit Receipt PDF Download API
 * GET /api/public/deposit-receipt/[token]/pdf
 *
 * Generates and returns a PDF of the deposit receipt using server-side rendering.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  await connectMongo();

  // Hash the token for lookup
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find the document
  const document = await SalesDocument.findOne({
    shareTokenHash: tokenHash,
    type: "DEPOSIT_RECEIPT",
    status: { $ne: "VOID" },
  }).lean();

  if (!document) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Check expiry
  if (document.shareExpiresAt && new Date(document.shareExpiresAt) < new Date()) {
    return res.status(410).json({ error: "This link has expired" });
  }

  try {
    // Determine base URL
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

    // Generate PDF from the public deposit receipt page
    const pdfBuffer = await generatePdf(`${baseUrl}/public/deposit-receipt/${token}?render=html`);

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Deposit-Receipt-${document.documentNumber}.pdf"`
    );

    return res.end(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("PDF generation error:", error);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
}

// Increase timeout for PDF generation
export const config = {
  api: {
    responseLimit: false,
  },
};
