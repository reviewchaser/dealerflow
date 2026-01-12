import { withDealerContext } from "@/libs/authContext";

// In-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0;

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per dealer

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
    const errorText = await response.text();
    console.error("[MOT API] OAuth token error:", response.status, errorText);
    throw new Error("Failed to obtain OAuth token");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Calculate expiry time (subtract 60s safety margin)
  tokenExpiresAt = now + (data.expires_in * 1000) - 60000;

  return cachedToken;
}

function checkRateLimit(dealerId) {
  const now = Date.now();
  const key = `dealer:${dealerId}`;

  // Get or create rate limit entry
  let entry = rateLimitMap.get(key);
  if (!entry || entry.windowStart + RATE_LIMIT_WINDOW < now) {
    // Start new window
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

async function handler(req, res, ctx) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dealerId } = ctx;

  // Check rate limit
  if (!checkRateLimit(dealerId)) {
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
    const apiBase = process.env.DVSA_API_BASE;
    const apiKey = process.env.DVSA_API_KEY;

    if (!apiBase) {
      throw new Error("Missing DVSA_API_BASE configuration");
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    };

    // Add API key header if configured
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const motResponse = await fetch(
      `${apiBase}/trade/vehicles/mot-tests?registration=${cleanVrm}`,
      { headers }
    );

    if (motResponse.status === 404) {
      return res.status(404).json({
        error: "Vehicle not found",
        errorCode: "NOT_FOUND"
      });
    }

    if (!motResponse.ok) {
      const errorText = await motResponse.text();
      console.error("[MOT API] DVSA API error:", motResponse.status, errorText);
      return res.status(502).json({
        error: "Failed to fetch MOT data",
        errorCode: "DVSA_ERROR"
      });
    }

    const motData = await motResponse.json();

    // Extract vehicle from response (DVSA returns array)
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
      // Sort by completed date descending to get most recent
      const sortedTests = [...vehicle.motTests].sort((a, b) =>
        new Date(b.completedDate) - new Date(a.completedDate)
      );
      const latestTest = sortedTests[0];
      if (latestTest.expiryDate) {
        motExpiry = latestTest.expiryDate;
      }
    }

    // Return normalized response
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
    });
  } catch (error) {
    console.error("[MOT API] Error:", error.message);
    return res.status(500).json({
      error: "Internal server error",
      errorCode: "INTERNAL_ERROR"
    });
  }
}

export default withDealerContext(handler);
