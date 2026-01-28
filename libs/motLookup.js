/**
 * Shared DVSA MOT API lookup helper
 * Used by form submissions, aftercare API, and backfill scripts
 */

let cachedToken = null;
let tokenExpiresAt = 0;

async function getOAuthToken() {
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
  if (scope) body.append("scope", scope);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) throw new Error("Failed to obtain OAuth token");

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000) - 60000;
  return cachedToken;
}

/**
 * Look up vehicle make/model from VRM via DVSA MOT API
 * @param {string} vrm - Vehicle registration mark
 * @returns {Promise<{make: string, model: string} | null>} - Vehicle data or null on failure
 */
export async function lookupVehicleByVrm(vrm) {
  try {
    const cleanVrm = vrm.trim().toUpperCase().replace(/\s+/g, "");
    if (cleanVrm.length < 2 || cleanVrm.length > 8) return null;

    const token = await getOAuthToken();
    const apiKey = process.env.DVSA_API_KEY;
    if (!apiKey) return null;

    const apiBase = process.env.DVSA_API_BASE || "https://history.mot.api.gov.uk";
    const response = await fetch(`${apiBase}/v1/trade/vehicles/registration/${cleanVrm}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const vehicle = Array.isArray(data) ? data[0] : data;
    if (!vehicle) return null;

    return {
      make: vehicle.make || null,
      model: vehicle.model || null,
    };
  } catch (err) {
    console.error("[motLookup] Error looking up VRM:", err.message);
    return null;
  }
}
