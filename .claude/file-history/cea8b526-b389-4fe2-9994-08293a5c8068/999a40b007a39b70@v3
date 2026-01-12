/**
 * Generate Signed URLs for S3 Photos
 *
 * This endpoint converts S3 keys to signed URLs that can be displayed in the browser.
 * Handles both single keys and arrays of keys.
 *
 * POST /api/photos/signed-url
 * Body: { key: "uploads/..." } or { keys: ["uploads/...", "uploads/..."] }
 * Returns: { url: "https://..." } or { urls: ["https://...", "https://..."] }
 *
 * IMPORTANT: In local dev without S3 configured, returns 400 with code "S3_NOT_CONFIGURED"
 * and the client should gracefully fall back to using original URLs.
 */

import { getS3SignedUrl } from "../vehicles/upload";

// Check if S3 is configured
function isS3Configured() {
  return !!(
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_BUCKET
  );
}

// Check if a string is an S3 key (starts with "uploads/")
function isS3Key(value) {
  return typeof value === "string" && value.startsWith("uploads/");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Fast check: If S3 is not configured, return immediately
  // This prevents slow timeouts in local dev
  if (!isS3Configured()) {
    return res.status(400).json({
      error: "S3 not configured",
      code: "S3_NOT_CONFIGURED",
    });
  }

  try {
    const { key, keys } = req.body;

    // Handle single key
    if (key) {
      if (!isS3Key(key)) {
        // Not an S3 key, return as-is (probably a local URL or full URL)
        return res.status(200).json({ url: key });
      }
      const url = await getS3SignedUrl(key, 3600); // 1 hour expiry for viewing
      return res.status(200).json({ url });
    }

    // Handle multiple keys
    if (keys && Array.isArray(keys)) {
      const urls = await Promise.all(
        keys.map(async (k) => {
          if (!isS3Key(k)) {
            return k; // Not an S3 key, return as-is
          }
          try {
            return await getS3SignedUrl(k, 3600);
          } catch (err) {
            console.error(`Failed to sign key ${k}:`, err.message);
            return k; // Return original key on error
          }
        })
      );
      return res.status(200).json({ urls });
    }

    return res.status(400).json({ error: "Provide 'key' or 'keys' in request body" });
  } catch (error) {
    console.error("[SignedUrl] Error:", error.message);
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }
}
