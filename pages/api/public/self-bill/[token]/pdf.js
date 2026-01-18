import { generatePdf } from "@/libs/pdfGenerator";
import connectMongo from "@/libs/mongoose";
import SalesDocument from "@/models/SalesDocument";
import crypto from "crypto";

/**
 * Purchase Invoice PDF Download API
 * GET /api/public/self-bill/[token]/pdf
 *
 * Generates and returns a PDF of the purchase invoice using server-side rendering.
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
    type: "SELF_BILL_INVOICE",
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
    const protocol = req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "development" ? "http" : "https");
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const pdfUrl = `${baseUrl}/public/self-bill/${token}?render=html`;

    console.log("Generating Purchase Invoice PDF from URL:", pdfUrl);

    // Generate PDF from the public self-bill page
    const pdfBuffer = await generatePdf(pdfUrl);

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Purchase-Invoice-${document.documentNumber}.pdf"`
    );

    return res.end(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("PDF generation error:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({ error: "Failed to generate PDF", details: error.message });
  }
}

// Increase timeout for PDF generation
export const config = {
  api: {
    responseLimit: false,
  },
};
