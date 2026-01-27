/**
 * Public File Upload API Route
 *
 * Used for public appraisal forms where users aren't authenticated.
 * Same functionality as /api/vehicles/upload but accessible publicly.
 */

import formidable from "formidable";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const REQUIRED_ENV_VARS = ["S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET", "S3_ENDPOINT"];

function isS3Configured() {
  return REQUIRED_ENV_VARS.every((key) => !!process.env[key]);
}

function validateR2Config() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
  }
}

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

async function uploadToS3(buffer, filename, contentType) {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = `public-appraisals/${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

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

async function uploadToLocal(buffer, filename) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "appraisals");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/appraisals/${filename}`;
}

function generateFilename(originalName, ext) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const safeExt = ext || ".jpg";
  return `${timestamp}-${randomId}${safeExt}`;
}

function getExtFromMimeType(mimeType) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  return map[mimeType] || ".bin";
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const useS3 = isS3Configured();

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      filter: ({ mimetype }) => ALLOWED_TYPES.includes(mimetype),
    });

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      if (parseError.code === 1009 || parseError.message?.includes("maxFileSize")) {
        return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
      }
      if (parseError.message?.includes("filter")) {
        return res.status(415).json({ error: "Invalid file type. Allowed: images, PDFs, Word docs." });
      }
      return res.status(400).json({ error: "Failed to parse upload" });
    }

    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mimeType = file.mimetype;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(415).json({ error: `Invalid file type: ${mimeType}` });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: "File too large. Maximum is 5MB." });
    }

    const buffer = fs.readFileSync(file.filepath);
    const ext = getExtFromMimeType(mimeType);
    const filename = generateFilename(file.originalFilename, ext);

    let url;
    let key;
    let isS3Upload = false;

    try {
      if (useS3) {
        key = await uploadToS3(buffer, filename, mimeType);
        url = await getS3SignedUrl(key, 86400);
        isS3Upload = true;
      } else {
        url = await uploadToLocal(buffer, filename);
      }
    } catch (storageError) {
      console.error("[Public Upload] Storage error:", storageError.message);
      return res.status(500).json({ error: "Failed to save file" });
    }

    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      // Non-critical
    }

    return res.status(200).json({
      url,
      key: isS3Upload ? key : undefined,
      filename: file.originalFilename,
      size: file.size,
      type: mimeType,
    });
  } catch (error) {
    console.error("[Public Upload] Error:", error.message);
    return res.status(500).json({ error: "Failed to upload file" });
  }
}
