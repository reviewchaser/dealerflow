import { withDealerContext } from "@/libs/authContext";
import Vehicle from "@/models/Vehicle";
import VehicleLabel from "@/models/VehicleLabel";
import VehicleLabelAssignment from "@/models/VehicleLabelAssignment";

// In-memory token cache (shared with mot.js via module)
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

async function handler(req, res, { dealerId }) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  try {
    // Get the vehicle
    const vehicle = await Vehicle.findOne({ _id: id, dealerId });
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vrm = vehicle.regCurrent;
    if (!vrm) {
      return res.status(400).json({ error: "Vehicle has no registration number" });
    }

    const cleanVrm = vrm.replace(/\s/g, "").toUpperCase();

    // Get OAuth token
    const token = await getOAuthToken();
    const apiKey = process.env.DVSA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "DVSA API key not configured" });
    }

    // Call DVSA MOT API
    const apiBase = process.env.DVSA_API_BASE || "https://history.mot.api.gov.uk";
    const fullUrl = `${apiBase}/v1/trade/vehicles/registration/${cleanVrm}`;

    const motResponse = await fetch(fullUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-API-Key": apiKey,
      },
    });

    if (motResponse.status === 404) {
      return res.status(404).json({ error: "Vehicle not found in MOT database" });
    }

    if (!motResponse.ok) {
      return res.status(502).json({ error: "Failed to fetch MOT data from DVSA" });
    }

    const motData = await motResponse.json();
    const dvsaVehicle = Array.isArray(motData) ? motData[0] : motData;

    if (!dvsaVehicle) {
      return res.status(404).json({ error: "Vehicle not found in MOT database" });
    }

    // Process MOT history
    const motHistory = (dvsaVehicle.motTests || []).map(test => ({
      completedDate: test.completedDate || null,
      expiryDate: test.expiryDate || null,
      testResult: test.testResult || null,
      odometerValue: test.odometerValue || null,
      odometerUnit: test.odometerUnit || null,
      motTestNumber: test.motTestNumber || null,
      defects: (test.defects || []).map(d => ({
        text: d.text || null,
        type: d.type || null,
        dangerous: d.dangerous || false
      }))
    }));

    // Find most recent MOT expiry and test result
    let motExpiry = null;
    let latestTestResult = null;
    if (dvsaVehicle.motTests && dvsaVehicle.motTests.length > 0) {
      const sortedTests = [...dvsaVehicle.motTests].sort((a, b) =>
        new Date(b.completedDate) - new Date(a.completedDate)
      );
      const latestTest = sortedTests[0];
      if (latestTest.expiryDate) {
        motExpiry = new Date(latestTest.expiryDate);
      }
      latestTestResult = latestTest.testResult;
    }

    // Update vehicle with MOT data
    await Vehicle.findByIdAndUpdate(id, {
      motHistory,
      motExpiryDate: motExpiry,
      motHistoryFetchedAt: new Date(),
    });

    // Auto-manage "MOT Failed" label based on latest test result
    const MOT_FAILED_LABEL_NAME = "MOT Failed";
    const MOT_FAILED_LABEL_COLOUR = "#ef4444"; // red-500

    if (latestTestResult === "FAILED") {
      // Find or create the "MOT Failed" label for this dealer
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

      // Check if vehicle already has this label
      const existingAssignment = await VehicleLabelAssignment.findOne({
        vehicleId: id,
        vehicleLabelId: motFailedLabel._id,
      });

      if (!existingAssignment) {
        await VehicleLabelAssignment.create({
          vehicleId: id,
          vehicleLabelId: motFailedLabel._id,
        });
      }
    } else if (latestTestResult === "PASSED") {
      // Remove "MOT Failed" label if it exists
      const motFailedLabel = await VehicleLabel.findOne({
        dealerId,
        name: MOT_FAILED_LABEL_NAME,
      });

      if (motFailedLabel) {
        await VehicleLabelAssignment.deleteOne({
          vehicleId: id,
          vehicleLabelId: motFailedLabel._id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      motHistoryCount: motHistory.length,
      motExpiry: motExpiry ? motExpiry.toISOString() : null,
      latestTestResult,
    });
  } catch (error) {
    console.error("[refresh-mot] Error:", error.message);
    return res.status(500).json({ error: "Failed to refresh MOT data" });
  }
}

export default withDealerContext(handler);
