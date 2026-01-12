import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import {
  getR2Client,
  getBucket,
  getPublicUrl,
  isAllowedImageType,
  getExtensionFromContentType,
  sanitizeFileName,
} from "@/libs/r2Client";
import { requireDealerContext } from "@/libs/authContext";

/**
 * POST /api/uploads/presign
 * Generate a presigned URL for uploading files to R2
 *
 * Request body:
 * {
 *   "scope": "vehicle",
 *   "entityId": "<vehicleId>",
 *   "fileName": "photo.jpg",
 *   "contentType": "image/jpeg"
 * }
 *
 * Response:
 * {
 *   "uploadUrl": "<signedPutUrl>",
 *   "publicUrl": "<publicUrl>",
 *   "key": "<key>"
 * }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Require authentication
    const ctx = await requireDealerContext(req, res);
    const { dealerId } = ctx;

    const { scope, entityId, fileName, contentType } = req.body;

    // Validate required fields
    if (!scope || !entityId || !fileName || !contentType) {
      return res.status(400).json({
        error: "Missing required fields: scope, entityId, fileName, contentType",
      });
    }

    // Validate scope
    if (scope !== "vehicle") {
      return res.status(400).json({
        error: "Invalid scope. Currently only 'vehicle' is supported.",
      });
    }

    // Validate content type
    if (!isAllowedImageType(contentType)) {
      return res.status(400).json({
        error: "Invalid content type. Allowed: image/jpeg, image/png, image/webp, image/gif",
      });
    }

    // Validate entityId format (MongoDB ObjectId)
    if (!/^[a-f\d]{24}$/i.test(entityId)) {
      return res.status(400).json({
        error: "Invalid entityId format",
      });
    }

    // Generate unique key for the object
    const timestamp = Date.now();
    const randomId = nanoid(8);
    const extension = getExtensionFromContentType(contentType);
    const sanitizedName = sanitizeFileName(fileName);

    // Key format: vehicles/<dealerId>/<vehicleId>/<timestamp>-<random>.<ext>
    // Including dealerId in path for tenant isolation
    const key = `vehicles/${dealerId}/${entityId}/${timestamp}-${randomId}.${extension}`;

    // Get R2 client and bucket
    const r2Client = getR2Client();
    const bucket = getBucket();

    // Create the PutObject command
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL (expires in 60 seconds)
    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 60,
    });

    // Generate the public URL
    const publicUrl = getPublicUrl(key);

    return res.status(200).json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error("[Presign] Error generating presigned URL:", error.message);

    // Don't expose internal errors to client
    if (error.message?.includes("Missing required R2")) {
      return res.status(500).json({
        error: "Storage service not configured",
      });
    }

    return res.status(500).json({
      error: "Failed to generate upload URL",
    });
  }
}
