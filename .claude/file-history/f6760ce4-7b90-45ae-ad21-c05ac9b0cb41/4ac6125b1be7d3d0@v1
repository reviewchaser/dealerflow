import { IncomingForm } from "formidable";
import fs from "fs";
import { nanoid } from "nanoid";
import {
  uploadToR2,
  getPublicUrl,
  isAllowedImageType,
  getExtensionFromContentType,
  MAX_FILE_SIZE,
} from "@/libs/r2Client";
import { requireDealerContext } from "@/libs/authContext";

/**
 * POST /api/uploads/vehicle-image-server
 *
 * Server-side upload fallback for when presigned URLs fail due to CORS.
 * This endpoint accepts multipart form data and uploads directly to R2.
 *
 * GATED: Only enabled when ENABLE_SERVER_UPLOAD_FALLBACK=true
 *
 * Request: multipart/form-data with:
 * - file: The image file
 * - vehicleId: The vehicle ID to attach the image to
 *
 * Response:
 * {
 *   "publicUrl": "<url>",
 *   "key": "<r2-key>"
 * }
 */

// Disable Next.js body parser for multipart
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if fallback is enabled
  if (process.env.ENABLE_SERVER_UPLOAD_FALLBACK !== "true") {
    console.log("[ServerUpload] Fallback disabled - ENABLE_SERVER_UPLOAD_FALLBACK not set to true");
    return res.status(403).json({
      error: "Server-side upload is disabled",
      details: "Set ENABLE_SERVER_UPLOAD_FALLBACK=true to enable this endpoint"
    });
  }

  try {
    // Require authentication
    const ctx = await requireDealerContext(req, res);
    const { dealerId } = ctx;

    console.log("[ServerUpload] Starting server-side upload for dealer:", dealerId);

    // Parse the multipart form
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Get vehicleId from fields (formidable v3 returns arrays)
    const vehicleId = Array.isArray(fields.vehicleId)
      ? fields.vehicleId[0]
      : fields.vehicleId;

    // Get file (formidable v3 returns arrays)
    const fileArray = files.file;
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!vehicleId) {
      return res.status(400).json({ error: "No vehicleId provided" });
    }

    // Validate vehicleId format
    if (!/^[a-f\d]{24}$/i.test(vehicleId)) {
      return res.status(400).json({ error: "Invalid vehicleId format" });
    }

    console.log("[ServerUpload] File received:", {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      vehicleId,
    });

    // Validate content type
    if (!isAllowedImageType(file.mimetype)) {
      return res.status(400).json({
        error: "Invalid file type. Allowed: image/jpeg, image/png, image/webp, image/gif"
      });
    }

    // Generate key
    const timestamp = Date.now();
    const randomId = nanoid(8);
    const extension = getExtensionFromContentType(file.mimetype);
    const key = `vehicles/${dealerId}/${vehicleId}/${timestamp}-${randomId}.${extension}`;

    console.log("[ServerUpload] Generated key:", key);

    // Read file contents
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to R2
    console.log("[ServerUpload] Uploading to R2...");
    await uploadToR2(key, fileBuffer, file.mimetype);

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupErr) {
      console.warn("[ServerUpload] Failed to clean up temp file:", cleanupErr.message);
    }

    // Generate public URL
    const publicUrl = getPublicUrl(key);

    console.log("[ServerUpload] Upload complete - key:", key);

    return res.status(200).json({
      publicUrl,
      key,
    });
  } catch (error) {
    console.error("[ServerUpload] Error:", error);
    console.error("[ServerUpload] Stack:", error.stack);

    if (error.message?.includes("maxFileSize")) {
      return res.status(400).json({
        error: "File too large",
        details: `Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }

    return res.status(500).json({
      error: "Server upload failed",
      details: error.message,
    });
  }
}
