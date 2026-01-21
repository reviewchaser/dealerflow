import { getSignedGetUrl } from "@/libs/r2Client";
import { requireDealerContext } from "@/libs/authContext";

/**
 * GET /api/uploads/signed-get?key=<r2-key>
 *
 * Generate a signed GET URL for viewing private R2 objects.
 * Use this when public URLs return 403 (bucket is private).
 *
 * Query params:
 * - key: The R2 object key (e.g., vehicles/dealer123/vehicle456/123-abc.jpg)
 * - expiresIn: Optional TTL in seconds (default 3600, max 86400)
 *
 * Response:
 * {
 *   "signedUrl": "<signed-get-url>",
 *   "expiresIn": 3600
 * }
 *
 * Security:
 * - Validates that the requesting user has access to the dealerId in the key path
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Require authentication
    const ctx = await requireDealerContext(req, res);
    const { dealerId } = ctx;

    const { key, expiresIn: expiresInParam } = req.query;

    if (!key) {
      return res.status(400).json({ error: "Missing required query param: key" });
    }

    // Validate key format and extract dealerId from path
    const keyParts = key.split("/");

    // Allow two formats:
    // 1. vehicles/<dealerId>/<vehicleId>/<filename> - tenant-scoped
    // 2. uploads/<filename> - generic uploads (still requires auth)
    if (keyParts[0] === "vehicles") {
      // Tenant-scoped format - validate dealer access
      if (keyParts.length < 4) {
        return res.status(400).json({ error: "Invalid key format" });
      }
      const keyDealerId = keyParts[1];
      if (keyDealerId !== dealerId) {
        console.log("[SignedGet] Access denied - dealer mismatch:", { keyDealerId, userDealerId: dealerId });
        return res.status(403).json({ error: "Access denied" });
      }
    } else if (keyParts[0] === "uploads") {
      // Generic uploads - authentication required but no tenant validation
      if (keyParts.length < 2) {
        return res.status(400).json({ error: "Invalid key format" });
      }
    } else {
      return res.status(400).json({ error: "Invalid key format" });
    }

    // Parse and validate expiresIn
    let expiresIn = 3600; // default 1 hour
    if (expiresInParam) {
      expiresIn = parseInt(expiresInParam, 10);
      if (isNaN(expiresIn) || expiresIn < 60 || expiresIn > 86400) {
        return res.status(400).json({
          error: "Invalid expiresIn. Must be between 60 and 86400 seconds"
        });
      }
    }

    console.log("[SignedGet] Generating signed URL for key:", key, "expiresIn:", expiresIn);

    // Generate signed URL
    const signedUrl = await getSignedGetUrl(key, expiresIn);

    return res.status(200).json({
      signedUrl,
      expiresIn,
    });
  } catch (error) {
    console.error("[SignedGet] Error:", error);

    if (error.message?.includes("Missing required R2")) {
      return res.status(500).json({
        error: "Storage service not configured",
        details: "R2 environment variables are missing",
      });
    }

    return res.status(500).json({
      error: "Failed to generate signed URL",
      details: error.message,
    });
  }
}
