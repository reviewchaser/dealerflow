import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client using AWS S3 SDK
 * Uses environment variables for configuration (no secrets in code)
 */

// Validate required environment variables
const requiredEnvVars = ["S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_ENDPOINT", "S3_BUCKET"];

export function validateR2Config() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
  }
}

// Create and export the S3 client for R2
let r2Client = null;

export function getR2Client() {
  if (r2Client) return r2Client;

  validateR2Config();

  r2Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });

  return r2Client;
}

// Get the bucket name
export function getBucket() {
  return process.env.S3_BUCKET;
}

// Generate a public URL for an object
export function getPublicUrl(key) {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;

  // R2 public URL format: https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key>
  // Or if using custom domain: https://<custom-domain>/<key>
  // We'll use the endpoint + bucket + key format
  return `${endpoint}/${bucket}/${key}`;
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
