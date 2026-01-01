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
  getEndpointHostname,
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
 *
 * CORS NOTE:
 * If browser PUT to uploadUrl fails with CORS, the R2 bucket needs CORS configuration.
 * This is NOT an API bug - it's a Cloudflare R2 bucket setting.
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

    // Log request details (no secrets)
    console.log("[Presign] Request:", {
      scope,
      entityId,
      fileName,
      contentType,
      dealerId,
      endpointHostname: getEndpointHostname(),
      bucket: getBucket(),
    });

    // Validate required fields
    if (!scope || !entityId || !fileName || !contentType) {
      console.log("[Presign] Missing fields:", { scope, entityId, fileName, contentType });
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
      console.log("[Presign] Invalid content type:", contentType);
      return res.status(400).json({
        error: "Invalid content type. Allowed: image/jpeg, image/png, image/webp, image/gif",
      });
    }

    // Validate entityId format (MongoDB ObjectId)
    if (!/^[a-f\d]{24}$/i.test(entityId)) {
      console.log("[Presign] Invalid entityId format:", entityId);
      return res.status(400).json({
        error: "Invalid entityId format",
      });
    }

    // Generate unique key for the object
    const timestamp = Date.now();
    const randomId = nanoid(8);
    const extension = getExtensionFromContentType(contentType);

    // Key format: vehicles/<dealerId>/<vehicleId>/<timestamp>-<random>.<ext>
    // Including dealerId in path for tenant isolation
    const key = `vehicles/${dealerId}/${entityId}/${timestamp}-${randomId}.${extension}`;

    console.log("[Presign] Generated key:", key);

    // Get R2 client and bucket
    const r2Client = getR2Client();
    const bucket = getBucket();

    // Create the PutObject command
    // IMPORTANT: ContentType must match what browser sends in PUT request
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL (expires in 5 minutes for more leeway)
    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 300, // 5 minutes
    });

    console.log("[Presign] Generated presigned URL (first 100 chars):", uploadUrl.substring(0, 100));

    // Generate the public URL
    const publicUrl = getPublicUrl(key);

    console.log("[Presign] Success - key:", key);

    return res.status(200).json({
      uploadUrl,
      publicUrl,
      key,
      // Include content type so client can verify it matches
      contentType,
    });
  } catch (error) {
    console.error("[Presign] Error generating presigned URL:", error);
    console.error("[Presign] Error stack:", error.stack);

    // Check for specific error types
    if (error.message?.includes("Missing required R2")) {
      return res.status(500).json({
        error: "Storage service not configured",
        details: "R2 environment variables are missing",
      });
    }

    if (error.name === "CredentialsProviderError") {
      return res.status(500).json({
        error: "Storage credentials error",
        details: "Check S3_ACCESS_KEY and S3_SECRET_KEY",
      });
    }

    return res.status(500).json({
      error: "Failed to generate upload URL",
      details: error.message,
    });
  }
}
