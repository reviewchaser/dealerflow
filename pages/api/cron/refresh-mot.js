/**
 * Daily MOT Data Refresh Cron Job
 *
 * GET /api/cron/refresh-mot
 *
 * Runs daily at 3:00 AM UTC via Vercel Cron.
 * Refreshes MOT history from DVSA API for all in-stock vehicles
 * with stale or missing MOT data.
 *
 * Security: Requires CRON_SECRET header for authorization.
 * Rate limit: 2s delay between requests (30/min per DVSA API limits).
 * Batch size: ~25 vehicles per run to stay within 60s timeout.
 */

import connectMongo from "@/libs/mongoose";
import Dealer, { DEALER_STATUS, APPROVAL_STATUS } from "@/models/Dealer";
import Vehicle from "@/models/Vehicle";
import VehicleLabel from "@/models/VehicleLabel";
import VehicleLabelAssignment from "@/models/VehicleLabelAssignment";

// OAuth token cache
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get OAuth token for DVSA API
 */
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

  if (scope) {
    body.append("scope", scope);
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

/**
 * Fetch MOT data for a single vehicle
 */
async function fetchMotData(vrm, token, apiKey) {
  const cleanVrm = vrm.replace(/\s/g, "").toUpperCase();
  const apiBase = process.env.DVSA_API_BASE || "https://history.mot.api.gov.uk";
  const fullUrl = `${apiBase}/v1/trade/vehicles/registration/${cleanVrm}`;

  const response = await fetch(fullUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-API-Key": apiKey,
    },
  });

  if (response.status === 404) {
    return { notFound: true };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[cron/refresh-mot] DVSA error for ${cleanVrm}:`, response.status, errorText);
    return { error: true, status: response.status };
  }

  const motData = await response.json();
  const dvsaVehicle = Array.isArray(motData) ? motData[0] : motData;

  if (!dvsaVehicle) {
    return { notFound: true };
  }

  // Process MOT history
  const motHistory = (dvsaVehicle.motTests || []).map((test) => ({
    completedDate: test.completedDate || null,
    expiryDate: test.expiryDate || null,
    testResult: test.testResult || null,
    odometerValue: test.odometerValue || null,
    odometerUnit: test.odometerUnit || null,
    motTestNumber: test.motTestNumber || null,
    defects: (test.defects || []).map((d) => ({
      text: d.text || null,
      type: d.type || null,
      dangerous: d.dangerous || false,
    })),
  }));

  // Find most recent MOT expiry and result
  let motExpiry = null;
  let latestTestResult = null;
  if (dvsaVehicle.motTests && dvsaVehicle.motTests.length > 0) {
    const sortedTests = [...dvsaVehicle.motTests].sort(
      (a, b) => new Date(b.completedDate) - new Date(a.completedDate)
    );
    const latestTest = sortedTests[0];
    if (latestTest.expiryDate) {
      motExpiry = new Date(latestTest.expiryDate);
    }
    latestTestResult = latestTest.testResult;
  }

  return { motHistory, motExpiry, latestTestResult };
}

/**
 * Update MOT Failed label based on test result
 */
async function updateMotFailedLabel(vehicleId, dealerId, testResult) {
  const MOT_FAILED_LABEL_NAME = "MOT Failed";
  const MOT_FAILED_LABEL_COLOUR = "#ef4444";

  if (testResult === "FAILED") {
    // Find or create the label
    let motFailedLabel = await VehicleLabel.findOne({
      dealerId,
      name: MOT_FAILED_LABEL_NAME,
    });

    if (!motFailedLabel) {
      motFailedLabel = await VehicleLabel.create({
        dealerId,
        name: MOT_FAILED_LABEL_NAME,
        colour: MOT_FAILED_LABEL_COLOUR,
      });
    }

    // Add label if not already present
    const existingAssignment = await VehicleLabelAssignment.findOne({
      vehicleId,
      vehicleLabelId: motFailedLabel._id,
    });

    if (!existingAssignment) {
      await VehicleLabelAssignment.create({
        vehicleId,
        vehicleLabelId: motFailedLabel._id,
      });
    }
  } else if (testResult === "PASSED") {
    // Remove MOT Failed label if it exists
    const motFailedLabel = await VehicleLabel.findOne({
      dealerId,
      name: MOT_FAILED_LABEL_NAME,
    });

    if (motFailedLabel) {
      await VehicleLabelAssignment.deleteOne({
        vehicleId,
        vehicleLabelId: motFailedLabel._id,
      });
    }
  }
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify CRON_SECRET authorization
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error("[cron/refresh-mot] CRON_SECRET not configured");
    return res.status(500).json({ error: "CRON_SECRET not configured" });
  }

  if (authHeader !== expectedAuth) {
    console.error("[cron/refresh-mot] Unauthorized request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check DVSA API configuration
  const apiKey = process.env.DVSA_API_KEY;
  if (!apiKey) {
    console.error("[cron/refresh-mot] DVSA_API_KEY not configured");
    return res.status(500).json({ error: "DVSA_API_KEY not configured" });
  }

  const startTime = Date.now();
  const results = {
    dealers: 0,
    vehiclesProcessed: 0,
    vehiclesUpdated: 0,
    vehiclesNotFound: 0,
    vehiclesErrored: 0,
    errors: [],
  };

  try {
    await connectMongo();

    // Get OAuth token
    const token = await getOAuthToken();

    // Get all active dealers
    const dealers = await Dealer.find({
      status: DEALER_STATUS.ACTIVE,
      approvalStatus: APPROVAL_STATUS.APPROVED,
    }).lean();

    results.dealers = dealers.length;
    console.log(`[cron/refresh-mot] Processing ${dealers.length} dealers`);

    // 24 hours ago threshold
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Process each dealer
    for (const dealer of dealers) {
      // Get vehicles with stale or missing MOT data
      // Limit to 25 per dealer to stay within timeout
      const vehicles = await Vehicle.find({
        dealerId: dealer._id,
        status: "in_stock",
        $or: [
          { motHistoryFetchedAt: null },
          { motHistoryFetchedAt: { $lt: staleThreshold } },
        ],
      })
        .select("_id regCurrent")
        .limit(25)
        .lean();

      if (vehicles.length === 0) {
        continue;
      }

      console.log(
        `[cron/refresh-mot] Dealer ${dealer.name}: ${vehicles.length} vehicles to refresh`
      );

      for (const vehicle of vehicles) {
        if (!vehicle.regCurrent) {
          continue;
        }

        results.vehiclesProcessed++;

        try {
          const motResult = await fetchMotData(vehicle.regCurrent, token, apiKey);

          if (motResult.notFound) {
            results.vehiclesNotFound++;
            // Still update timestamp to avoid retrying too soon
            await Vehicle.findByIdAndUpdate(vehicle._id, {
              motHistoryFetchedAt: new Date(),
            });
          } else if (motResult.error) {
            results.vehiclesErrored++;
            results.errors.push({
              vrm: vehicle.regCurrent,
              error: `DVSA API error: ${motResult.status}`,
            });
          } else {
            // Update vehicle with MOT data
            await Vehicle.findByIdAndUpdate(vehicle._id, {
              motHistory: motResult.motHistory,
              motExpiryDate: motResult.motExpiry,
              motHistoryFetchedAt: new Date(),
            });

            // Update MOT Failed label
            await updateMotFailedLabel(
              vehicle._id,
              dealer._id,
              motResult.latestTestResult
            );

            results.vehiclesUpdated++;
          }
        } catch (err) {
          results.vehiclesErrored++;
          results.errors.push({
            vrm: vehicle.regCurrent,
            error: err.message,
          });
        }

        // Rate limit: 2 second delay between requests
        await sleep(2000);

        // Check if we're approaching timeout (50s safety margin)
        if (Date.now() - startTime > 50000) {
          console.log("[cron/refresh-mot] Approaching timeout, stopping early");
          break;
        }
      }

      // Check timeout after each dealer too
      if (Date.now() - startTime > 50000) {
        break;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[cron/refresh-mot] Completed in ${duration}s: ${results.vehiclesUpdated} updated, ${results.vehiclesNotFound} not found, ${results.vehiclesErrored} errors`
    );

    return res.status(200).json({
      success: true,
      duration: `${duration}s`,
      ...results,
    });
  } catch (error) {
    console.error("[cron/refresh-mot] Fatal error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      ...results,
    });
  }
}
