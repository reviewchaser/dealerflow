/**
 * Dealer Logo Upload API Route (Tenant-Scoped)
 *
 * POST: Upload logo to S3 (private bucket), store key on dealer record
 * GET: Return signed URL for dealer's logo
 *
 * Multi-tenant safe: Uses withDealerContext to scope to current dealer
 */

import formidable from "formidable";
import fs from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withDealerContext } from "@/libs/authContext";
import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";

// Disable body parsing so formidable can handle multipart
export const config = {
  api: {
    bodyParser: false,
  },
};

// Allowed image MIME types for logos
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

// Max logo size: 2MB (logos should be small)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Required R2/S3 environment variables
 */
const REQUIRED_ENV_VARS = ["S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET", "S3_ENDPOINT"];

/**
 * Check if S3/R2 is configured
 */
function isS3Configured() {
  return REQUIRED_ENV_VARS.every((key) => !!process.env[key]);
}

/**
 * Validate R2 config and throw with clear error if missing
 */
function validateR2Config() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
  }
}

/**
 * Get S3 client configured for Cloudflare R2
 */
function getS3Client() {
  validateR2Config();

  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });
}

/**
 * Upload logo to S3 (private bucket)
 * Returns the S3 key
 */
async function uploadToS3(buffer, dealerId, contentType) {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET;
  const ext = getExtFromMimeType(contentType);
  const key = `dealers/${dealerId}/logo${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // No ACL - bucket is private by default
    })
  );

  return key;
}

/**
 * Generate signed URL for private S3 object
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {Promise<string>} Signed URL
 */
async function getS3SignedUrl(key, expiresIn = 3600) {
  if (!isS3Configured()) {
    throw new Error("S3 not configured");
  }

  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Get file extension from MIME type
 */
function getExtFromMimeType(mimeType) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  return map[mimeType] || ".jpg";
}

/**
 * Handle POST - Upload logo
 */
async function handleUpload(req, res, ctx) {
  const { dealerId } = ctx;

  // Check S3 configuration
  const useS3 = isS3Configured();
  if (!useS3) {
    // In production without S3, we can't store logos persistently
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        error: "File storage not configured. Please configure S3.",
        code: "STORAGE_NOT_CONFIGURED",
      });
    }
  }

  try {
    // Configure formidable
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      filter: ({ mimetype }) => ALLOWED_TYPES.includes(mimetype),
    });

    // Parse the form data
    let files;
    try {
      [, files] = await form.parse(req);
    } catch (parseError) {
      console.error("[Dealer Logo] Parse error:", parseError.message);

      if (parseError.code === 1009 || parseError.message?.includes("maxFileSize")) {
        return res.status(413).json({
          error: "Logo too large. Maximum size is 2MB.",
          code: "FILE_TOO_LARGE",
        });
      }

      if (parseError.message?.includes("filter")) {
        return res.status(415).json({
          error: "Invalid file type. Only PNG, JPEG, WebP, GIF, and SVG are allowed.",
          code: "INVALID_FILE_TYPE",
        });
      }

      return res.status(400).json({
        error: "Failed to parse upload",
        code: "PARSE_ERROR",
      });
    }

    // Get the uploaded file (support both 'file' and 'logo' field names)
    const file = files.file?.[0] || files.logo?.[0];

    if (!file) {
      return res.status(400).json({
        error: "No file uploaded",
        code: "NO_FILE",
      });
    }

    // Validate file type again
    const mimeType = file.mimetype;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(415).json({
        error: `Invalid file type: ${mimeType}. Only images are allowed.`,
        code: "INVALID_FILE_TYPE",
      });
    }

    // Read file into buffer
    const buffer = fs.readFileSync(file.filepath);

    // Upload to S3 (scoped to this dealer)
    let logoKey;
    let logoUrl;

    if (useS3) {
      console.log(`[Dealer Logo] Uploading to S3 for dealer ${dealerId}...`);
      logoKey = await uploadToS3(buffer, dealerId, mimeType);
      // Generate signed URL for immediate use (24 hour expiry)
      logoUrl = await getS3SignedUrl(logoKey, 86400);
      console.log(`[Dealer Logo] S3 upload success, key: ${logoKey}`);
    } else {
      // Local development fallback - save to public/uploads
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "dealers", dealerId.toString());

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = getExtFromMimeType(mimeType);
      const filename = `logo${ext}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, buffer);

      logoUrl = `/uploads/dealers/${dealerId}/logo${ext}`;
      logoKey = null; // No S3 key for local uploads
      console.log(`[Dealer Logo] Local upload success: ${logoUrl}`);
    }

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn("[Dealer Logo] Failed to clean up temp file:", cleanupError.message);
    }

    // Update dealer record with logo key
    await connectMongo();
    await Dealer.updateOne(
      { _id: dealerId },
      {
        $set: {
          logoKey: logoKey,
          logoUrl: logoUrl, // For backwards compatibility
        },
      }
    );

    console.log(`[Dealer Logo] Updated dealer ${dealerId} with logoKey: ${logoKey}`);

    return res.status(200).json({
      success: true,
      url: logoUrl,
      key: logoKey,
      message: "Logo uploaded successfully",
      storage: useS3 ? "s3" : "local",
    });
  } catch (error) {
    console.error("[Dealer Logo] Upload error:", error.message, error.stack);
    return res.status(500).json({
      error: "Failed to upload logo",
      code: "UPLOAD_ERROR",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
}

/**
 * Handle GET - Return signed URL for dealer's logo
 */
async function handleGet(req, res, ctx) {
  const { dealerId, dealer } = ctx;

  // Check if dealer has a logo
  if (!dealer.logoKey && !dealer.logoUrl) {
    return res.status(404).json({
      error: "No logo found",
      code: "NO_LOGO",
    });
  }

  // If we have an S3 key, generate a fresh signed URL
  if (dealer.logoKey && isS3Configured()) {
    try {
      const signedUrl = await getS3SignedUrl(dealer.logoKey, 3600); // 1 hour expiry
      return res.status(200).json({
        url: signedUrl,
        key: dealer.logoKey,
        source: "s3",
      });
    } catch (error) {
      console.error("[Dealer Logo] Failed to generate signed URL:", error.message);
      // Fall back to stored logoUrl if available
      if (dealer.logoUrl) {
        return res.status(200).json({
          url: dealer.logoUrl,
          source: "fallback",
        });
      }
      return res.status(500).json({
        error: "Failed to retrieve logo",
        code: "S3_ERROR",
      });
    }
  }

  // Return stored logoUrl (for local development or legacy data)
  return res.status(200).json({
    url: dealer.logoUrl,
    source: "local",
  });
}

/**
 * Main handler
 */
async function handler(req, res, ctx) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "POST") {
    return handleUpload(req, res, ctx);
  }

  if (req.method === "GET") {
    return handleGet(req, res, ctx);
  }

  return res.status(405).json({
    error: "Method not allowed",
    code: "METHOD_NOT_ALLOWED",
  });
}

export default withDealerContext(handler);
