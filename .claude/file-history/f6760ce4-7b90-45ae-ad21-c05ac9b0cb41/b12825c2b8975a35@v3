import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 client using AWS S3 SDK
 * Uses environment variables for configuration (no secrets in code)
 *
 * CORS CONFIGURATION REQUIRED IN CLOUDFLARE R2:
 * If browser PUT uploads fail with CORS errors, apply this policy in Cloudflare R2 bucket settings:
 *
 * [
 *   {
 *     "AllowedOrigins": ["https://dealerflow-george-arnold.vercel.app", "http://localhost:3000"],
 *     "AllowedMethods": ["PUT", "GET", "HEAD"],
 *     "AllowedHeaders": ["*"],
 *     "ExposeHeaders": ["ETag"],
 *     "MaxAgeSeconds": 3000
 *   }
 * ]
 *
 * For testing, use AllowedOrigins: ["*"] to confirm CORS is the blocker.
 */

// Validate required environment variables
const requiredEnvVars = ["S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_ENDPOINT", "S3_BUCKET"];

export function validateR2Config() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
  }

  // Validate endpoint format
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint.startsWith("https://")) {
    console.warn("[R2] Warning: S3_ENDPOINT should start with https://");
  }
}

// Get endpoint hostname for logging (safe, no secrets)
export function getEndpointHostname() {
  try {
    const endpoint = process.env.S3_ENDPOINT || "";
    const url = new URL(endpoint);
    return url.hostname;
  } catch {
    return "invalid-endpoint";
  }
}

// Create and export the S3 client for R2
let r2Client = null;

export function getR2Client() {
  if (r2Client) return r2Client;

  validateR2Config();

  const endpoint = process.env.S3_ENDPOINT;

  r2Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    // forcePathStyle is NOT needed for R2 - R2 uses virtual-hosted style by default
    // Only enable if you have issues with bucket URL resolution
  });

  console.log(`[R2] Client initialized for endpoint hostname: ${getEndpointHostname()}`);

  return r2Client;
}

// Get the bucket name
export function getBucket() {
  return process.env.S3_BUCKET;
}

// Generate a public URL for an object (only works if bucket is public)
export function getPublicUrl(key) {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;

  // R2 public URL format: https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key>
  // Note: This only works if the bucket has public access enabled
  // If bucket is private, use getSignedGetUrl() instead
  return `${endpoint}/${bucket}/${key}`;
}

// Generate a signed GET URL for viewing private objects
export async function getSignedGetUrl(key, expiresIn = 3600) {
  const r2Client = getR2Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

// Upload a file directly from server (fallback for CORS issues)
export async function uploadToR2(key, body, contentType) {
  const r2Client = getR2Client();
  const bucket = getBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  return await r2Client.send(command);
}

// Delete an object from R2
export async function deleteFromR2(key) {
  const r2Client = getR2Client();
  const bucket = getBucket();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await r2Client.send(command);
}

// Allowed image content types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Max file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Validate content type
export function isAllowedImageType(contentType) {
  return ALLOWED_IMAGE_TYPES.includes(contentType);
}

// Get file extension from content type
export function getExtensionFromContentType(contentType) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[contentType] || "jpg";
}

// Sanitize filename (remove special characters, keep extension)
export function sanitizeFileName(fileName) {
  // Remove path separators and special characters
  const sanitized = fileName
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return sanitized;
}

export default getR2Client;
