import { PDFDocument } from "pdf-lib";
import { generatePdf } from "@/libs/pdfGenerator";
import { withDealerContext } from "@/libs/authContext";
import Deal from "@/models/Deal";
import SalesDocument from "@/models/SalesDocument";
import FormSubmission from "@/models/FormSubmission";
import Form from "@/models/Form";
import connectMongo from "@/libs/mongoose";

/**
 * Generate Handover Pack API
 * GET /api/deals/[id]/generate-handover-pack
 *
 * Generates a combined PDF containing Invoice + PDI + Service Receipt (whichever are available).
 * Requires both customer and dealer signatures on the invoice.
 */
async function handler(req, res, ctx) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { id } = req.query;
  const { dealerId } = ctx;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid deal ID" });
  }

  // Get deal with vehicle populated
  const deal = await Deal.findOne({ _id: id, dealerId }).populate("vehicleId");
  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }

  // Check signatures - both parties must have signed
  if (!deal.signature?.dealerSignedAt || !deal.signature?.customerSignedAt) {
    return res.status(400).json({
      error: "Invoice must be signed by both parties before generating handover pack",
    });
  }

  // Get invoice document
  const invoice = await SalesDocument.findOne({
    dealId: id,
    type: "INVOICE",
    status: { $ne: "VOID" },
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  // Get linked submissions (PDI, Service Receipt) for the vehicle
  const vehicleId = deal.vehicleId?._id || deal.vehicleId;
  const normalizedVrm = deal.vehicleId?.regCurrent?.toUpperCase().replace(/\s/g, "");

  // Find PDI and SERVICE_RECEIPT forms for this dealer
  const forms = await Form.find({
    dealerId,
    type: { $in: ["PDI", "SERVICE_RECEIPT"] },
  }).lean();

  const pdiForm = forms.find((f) => f.type === "PDI");
  const serviceReceiptForm = forms.find((f) => f.type === "SERVICE_RECEIPT");

  // Build query for submissions
  const vrmMatchConditions = normalizedVrm
    ? [
        { "rawAnswers.vrm": { $regex: new RegExp(`^${normalizedVrm}$`, "i") } },
        { "rawAnswers.vrm": { $regex: new RegExp(`^${normalizedVrm.replace(/(.{2,4})$/, " $1")}$`, "i") } },
        { "rawAnswers.vehicle_reg": { $regex: new RegExp(`^${normalizedVrm}$`, "i") } },
        { "rawAnswers.registration": { $regex: new RegExp(`^${normalizedVrm}$`, "i") } },
      ]
    : [];

  // Get PDI submission
  let pdiSubmission = null;
  if (pdiForm) {
    pdiSubmission = await FormSubmission.findOne({
      dealerId,
      formId: pdiForm._id,
      status: { $ne: "DELETED" },
      $or: [{ linkedVehicleId: vehicleId }, ...vrmMatchConditions],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get Service Receipt submission
  let serviceSubmission = null;
  if (serviceReceiptForm) {
    serviceSubmission = await FormSubmission.findOne({
      dealerId,
      formId: serviceReceiptForm._id,
      status: { $ne: "DELETED" },
      $or: [{ linkedVehicleId: vehicleId }, ...vrmMatchConditions],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get deposit receipt document (if exists)
  const depositReceipt = await SalesDocument.findOne({
    dealId: id,
    type: "DEPOSIT_RECEIPT",
    status: { $ne: "VOID" },
  });

  // Generate PDFs
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const pdfs = [];

  try {
    // Deposit Receipt PDF (first in pack if exists)
    if (depositReceipt?.shareToken) {
      const depositUrl = `${baseUrl}/public/deposit-receipt/${depositReceipt.shareToken}?render=html`;
      const depositPdf = await generatePdf(depositUrl);
      pdfs.push({ name: "Deposit Receipt", buffer: depositPdf });
    }

    // Invoice PDF (always included)
    const invoiceUrl = `${baseUrl}/public/invoice/${invoice.shareToken}?render=html`;
    const invoicePdf = await generatePdf(invoiceUrl);
    pdfs.push({ name: "Invoice", buffer: invoicePdf });

    // PDI PDF (if exists)
    if (pdiSubmission) {
      const pdiUrl = `${baseUrl}/public/submission/${pdiSubmission._id}?print=1`;
      const pdiPdf = await generatePdf(pdiUrl);
      pdfs.push({ name: "PDI", buffer: pdiPdf });
    }

    // Service Receipt PDF (if exists)
    if (serviceSubmission) {
      const serviceUrl = `${baseUrl}/public/submission/${serviceSubmission._id}?print=1`;
      const servicePdf = await generatePdf(serviceUrl);
      pdfs.push({ name: "Service Receipt", buffer: servicePdf });
    }
  } catch (pdfError) {
    console.error("[generate-handover-pack] PDF generation error:", pdfError);
    return res.status(500).json({
      error: "Failed to generate PDF",
      details: pdfError.message,
    });
  }

  // Merge PDFs using pdf-lib
  try {
    const mergedPdf = await PDFDocument.create();

    for (const { buffer } of pdfs) {
      const pdf = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBuffer = await mergedPdf.save();

    // Generate filename
    const vrm = deal.vehicleId?.regCurrent?.replace(/\s/g, "") || "";
    const dealNumber = deal.dealNumber || deal._id.toString().slice(-6);
    const filename = `handover-pack-${vrm || dealNumber}.pdf`;

    // Return the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(mergedBuffer));
  } catch (mergeError) {
    console.error("[generate-handover-pack] PDF merge error:", mergeError);
    return res.status(500).json({
      error: "Failed to merge PDFs",
      details: mergeError.message,
    });
  }
}

export default withDealerContext(handler);
