/**
 * File Upload API Route
 *
 * Supports:
 * - AWS S3 (private bucket with signed URLs) when configured
 * - Local filesystem in development (public/uploads)
 *
 * Validates:
 * - File type (images only: png, jpeg, webp, gif)
 * - File size (max 5MB)
 *
 * Note: This is a general upload endpoint. For dealer logo uploads
 * that require tenant scoping, use /api/dealer/logo instead.
 */

import formidable from "formidable";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Disable body parsing so Next.js doesn't consume the request body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Allowed image MIME types
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Check if S3 is configured
 */
function isS3Configured() {
  return !!(
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_BUCKET
  );
}

/**
 * Get S3 client
 */
function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "eu-west-2",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });
}

/**
 * Upload file to S3 (private bucket)
 * Returns the S3 key (not a public URL)
 */
async function uploadToS3(buffer, filename, contentType) {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = `uploads/${filename}`;

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
export async function getS3SignedUrl(key, expiresIn = 3600) {
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
 * Upload file to local filesystem (dev only)
 */
async function uploadToLocal(buffer, filename) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

/**
 * Generate unique filename
 */
function generateFilename(originalName, ext) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const safeExt = ext || ".jpg";
  return `${timestamp}-${randomId}${safeExt}`;
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
  };
  return map[mimeType] || ".jpg";
}

export default async function handler(req, res) {
  // Always return JSON
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  // Log storage configuration (not secrets)
  const useS3 = isS3Configured();
  console.log(`[Upload] Storage: ${useS3 ? "S3 (private)" : "Local"}`);

  try {
    // Configure formidable
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      filter: ({ mimetype }) => {
        // Only accept allowed image types
        return ALLOWED_TYPES.includes(mimetype);
      },
    });

    // Parse the form data
    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      console.error("[Upload] Parse error:", parseError.message);

      // Check for file size error
      if (parseError.code === 1009 || parseError.message?.includes("maxFileSize")) {
        return res.status(413).json({
          error: "File too large. Maximum size is 5MB.",
          code: "FILE_TOO_LARGE",
        });
      }

      // Check for file type error
      if (parseError.message?.includes("filter")) {
        return res.status(415).json({
          error: "Invalid file type. Only PNG, JPEG, WebP, and GIF are allowed.",
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
      console.log("[Upload] No file in request. Fields:", Object.keys(files));
      return res.status(400).json({
        error: "No file uploaded",
        code: "NO_FILE",
      });
    }

    // Validate file type again (belt and suspenders)
    const mimeType = file.mimetype;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      console.log("[Upload] Invalid MIME type:", mimeType);
      return res.status(415).json({
        error: `Invalid file type: ${mimeType}. Only images are allowed.`,
        code: "INVALID_FILE_TYPE",
      });
    }

    // Validate file size again
    if (file.size > MAX_FILE_SIZE) {
      console.log("[Upload] File too large:", file.size);
      return res.status(413).json({
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 5MB.`,
        code: "FILE_TOO_LARGE",
      });
    }

    // Read file into buffer
    const buffer = fs.readFileSync(file.filepath);

    // Generate unique filename
    const ext = getExtFromMimeType(mimeType);
    const filename = generateFilename(file.originalFilename, ext);

    // Upload to appropriate storage
    let url;
    let key;
    let isS3Upload = false;

    try {
      if (useS3) {
        console.log("[Upload] Uploading to S3 (private)...");
        key = await uploadToS3(buffer, filename, mimeType);
        // Generate signed URL for immediate use
        url = await getS3SignedUrl(key, 86400); // 24 hour expiry
        isS3Upload = true;
        console.log("[Upload] S3 upload success, key:", key);
      } else {
        // Local upload (dev mode)
        if (process.env.NODE_ENV === "production") {
          console.warn("[Upload] WARNING: No S3 configured in production. Upload will not persist!");
        }
        console.log("[Upload] Uploading to local filesystem...");
        url = await uploadToLocal(buffer, filename);
        console.log("[Upload] Local upload success:", url);
      }
    } catch (storageError) {
      console.error("[Upload] Storage error:", storageError.message, storageError.stack);
      return res.status(500).json({
        error: "Failed to save file to storage",
        code: "STORAGE_ERROR",
        details: process.env.NODE_ENV !== "production" ? storageError.message : undefined,
      });
    }

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      // Non-critical, just log
      console.warn("[Upload] Failed to clean up temp file:", cleanupError.message);
    }

    return res.status(200).json({
      url,
      key: isS3Upload ? key : undefined, // Include key for S3 uploads (for storing in DB)
      message: "File uploaded successfully",
      filename: file.originalFilename,
      size: file.size,
      type: mimeType,
      storage: isS3Upload ? "s3" : "local",
    });
  } catch (error) {
    console.error("[Upload] Unexpected error:", error.message, error.stack);
    return res.status(500).json({
      error: "Failed to upload file",
      code: "UPLOAD_ERROR",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
}
