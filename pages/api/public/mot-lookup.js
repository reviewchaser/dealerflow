/**
 * Public MOT History Lookup API
 *
 * This endpoint is for public forms (appraisals, PX submissions) that don't have authentication.
 * Rate-limited by IP address to prevent abuse.
 */

// In-memory token cache (shared with authenticated endpoint via module scope)
let cachedToken = null;
let tokenExpiresAt = 0;

// Simple in-memory rate limiter by IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP (stricter than authenticated)

async function getOAuthToken() {
  // Check if we have a valid cached token (with 60s safety margin)
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const tokenUrl = process.env.DVSA_TOKEN_URL;
  const clientId = process.env.DVSA_CLIENT_ID;
  const clientSecret = process.env.DVSA_CLIENT_SECRET;
  const scope = process.env.DVSA_SCOPE;

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error("Missing DVSA OAuth configuration");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  if (scope) {
    body.append("scope", scope);
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to obtain OAuth token");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000) - 60000;

  return cachedToken;
}

function getClientIp(req) {
  // Get IP from various headers (for proxied requests)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const key = `ip:${ip}`;

  let entry = rateLimitMap.get(key);
  if (!entry || entry.windowStart + RATE_LIMIT_WINDOW < now) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    return false;
  }

  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.windowStart + RATE_LIMIT_WINDOW < now) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIp = getClientIp(req);

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests. Please wait a moment."
    });
  }

  const { vrm } = req.query;

  if (!vrm) {
    return res.status(400).json({ error: "VRM parameter required" });
  }

  // Normalize VRM: strip spaces, uppercase
  const cleanVrm = vrm.trim().toUpperCase().replace(/\s+/g, "");

  if (cleanVrm.length < 2 || cleanVrm.length > 8) {
    return res.status(400).json({ error: "Invalid VRM format" });
  }

  try {
    const token = await getOAuthToken();
    const apiKey = process.env.DVSA_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: "MOT API not configured",
        errorCode: "CONFIG_ERROR"
      });
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "X-API-Key": apiKey,
    };

    const apiBase = process.env.DVSA_API_BASE || "https://history.mot.api.gov.uk";
    const fullUrl = `${apiBase}/v1/trade/vehicles/registration/${cleanVrm}`;

    const motResponse = await fetch(fullUrl, { headers });

    if (motResponse.status === 404) {
      return res.status(404).json({
        error: "Vehicle not found",
        errorCode: "NOT_FOUND"
      });
    }

    if (!motResponse.ok) {
      return res.status(502).json({
        error: "Failed to fetch MOT data",
        errorCode: "DVSA_ERROR"
      });
    }

    const motData = await motResponse.json();
    const vehicle = Array.isArray(motData) ? motData[0] : motData;

    if (!vehicle) {
      return res.status(404).json({
        error: "Vehicle not found",
        errorCode: "NOT_FOUND"
      });
    }

    // Find the most recent MOT test to get expiry date
    let motExpiry = null;
    if (vehicle.motTests && vehicle.motTests.length > 0) {
      const sortedTests = [...vehicle.motTests].sort((a, b) =>
        new Date(b.completedDate) - new Date(a.completedDate)
      );
      const latestTest = sortedTests[0];
      if (latestTest.expiryDate) {
        motExpiry = latestTest.expiryDate;
      }
    }

    // Return normalized response (same format as authenticated endpoint)
    // Note: VIN and transmission are NOT available from DVSA API
    return res.status(200).json({
      registration: cleanVrm,
      make: vehicle.make || null,
      model: vehicle.model || null,
      fuelType: vehicle.fuelType || null,
      primaryColour: vehicle.primaryColour || null,
      engineSize: vehicle.engineSize ? String(vehicle.engineSize) : null,
      motExpiry: motExpiry,
      manufactureYear: vehicle.manufactureYear || null,
      firstUsedDate: vehicle.firstUsedDate || null,
      vin: null, // DVSA API does not return VIN
      transmission: null, // DVSA API does not return transmission
    });
  } catch (error) {
    console.error("[Public MOT API] Error:", error.message);
    return res.status(500).json({
      error: "Internal server error",
      errorCode: "INTERNAL_ERROR"
    });
  }
}
