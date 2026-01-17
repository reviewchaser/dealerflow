/**
 * DVLA Vehicle Enquiry Service API
 *
 * POST /api/dvla/vehicle-enquiry
 * Body: { registrationNumber: string }
 *
 * Server-side proxy to DVLA VES API - key never hits browser.
 * https://developer-portal.driver-vehicle-licensing.api.gov.uk/
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

// Normalize VRM: trim, uppercase, remove spaces
function normalizeVrm(vrm) {
  if (!vrm) return "";
  return vrm.trim().toUpperCase().replace(/\s+/g, "");
}

// Format response fields for display
function formatDvlaResponse(data) {
  return {
    // Core vehicle identification
    registrationNumber: data.registrationNumber,
    make: data.make || null,
    colour: data.colour || null,
    yearOfManufacture: data.yearOfManufacture || null,

    // First registration date (convert YYYY-MM to YYYY-MM-01 for date storage)
    firstRegisteredDate: data.monthOfFirstRegistration
      ? `${data.monthOfFirstRegistration}-01`
      : null,

    // Extended DVLA details to store
    dvlaDetails: {
      co2Emissions: data.co2Emissions || null,
      engineCapacity: data.engineCapacity || null,
      fuelType: data.fuelType || null,
      markedForExport: data.markedForExport || false,
      monthOfFirstRegistration: data.monthOfFirstRegistration || null,
      motStatus: data.motStatus || null,
      motExpiryDate: data.motExpiryDate || null,
      revenueWeight: data.revenueWeight || null,
      taxDueDate: data.taxDueDate || null,
      taxStatus: data.taxStatus || null,
      yearOfManufacture: data.yearOfManufacture || null,
      euroStatus: data.euroStatus || null,
      dateOfLastV5CIssued: data.dateOfLastV5CIssued || null,
      wheelplan: data.wheelplan || null,
      typeApproval: data.typeApproval || null,
    },

    // Timestamp of this lookup
    lastDvlaFetchAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  // Require authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ ok: false, code: "UNAUTHORIZED" });
  }

  const { registrationNumber } = req.body;
  if (!registrationNumber) {
    return res.status(400).json({
      ok: false,
      code: "MISSING_VRM",
      message: "Registration number is required",
    });
  }

  const cleanVrm = normalizeVrm(registrationNumber);

  // Basic format validation (2-8 alphanumeric characters)
  if (cleanVrm.length < 2 || cleanVrm.length > 8 || !/^[A-Z0-9]+$/.test(cleanVrm)) {
    return res.status(400).json({
      ok: false,
      code: "INVALID_FORMAT",
      message: "Registration number must be 2-8 alphanumeric characters",
    });
  }

  // Support both DVLA_VES_API_KEY and DVLA_API_KEY for backwards compatibility
  const apiKey = process.env.DVLA_VES_API_KEY || process.env.DVLA_API_KEY;

  // Return dummy data in development if no API key
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[DVLA] API key not configured - returning dummy data");
      return res.status(200).json({
        ok: true,
        isDummy: true,
        data: generateDummyResponse(cleanVrm),
      });
    }
    return res.status(503).json({
      ok: false,
      code: "NOT_CONFIGURED",
      message: "DVLA integration not configured",
    });
  }

  try {
    const response = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ registrationNumber: cleanVrm }),
      }
    );

    // Handle DVLA API errors
    if (!response.ok) {
      const status = response.status;

      if (status === 404) {
        return res.status(404).json({
          ok: false,
          code: "NOT_FOUND",
          message: "No vehicle found with this registration number",
        });
      }

      if (status === 400) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_FORMAT",
          message: "Invalid registration number format",
        });
      }

      if (status === 429) {
        return res.status(429).json({
          ok: false,
          code: "RATE_LIMIT",
          message: "Too many requests. Please try again later.",
        });
      }

      if (status === 401 || status === 403) {
        console.error("[DVLA] Authentication/authorization error:", status);
        return res.status(503).json({
          ok: false,
          code: "DVLA_ERROR",
          message: "DVLA service authentication error",
        });
      }

      console.error("[DVLA] Unexpected error:", status);
      return res.status(503).json({
        ok: false,
        code: "DVLA_ERROR",
        message: "DVLA service unavailable",
      });
    }

    const rawData = await response.json();

    // Log raw DVLA response for debugging fuel/model mapping
    console.log("DVLA_RAW", JSON.stringify(rawData, null, 2));

    const formattedData = formatDvlaResponse(rawData);

    return res.status(200).json({
      ok: true,
      isDummy: false,
      data: formattedData,
    });
  } catch (error) {
    console.error("[DVLA] Network error:", error.message);

    // Fall back to dummy data in development
    if (process.env.NODE_ENV === "development") {
      console.warn("[DVLA] Falling back to dummy data due to network error");
      return res.status(200).json({
        ok: true,
        isDummy: true,
        data: generateDummyResponse(cleanVrm),
      });
    }

    return res.status(503).json({
      ok: false,
      code: "DVLA_ERROR",
      message: "Unable to connect to DVLA service",
    });
  }
}

/**
 * Generate dummy data for development/testing
 */
function generateDummyResponse(vrm) {
  const now = new Date();
  const motExpiry = new Date(now);
  motExpiry.setMonth(motExpiry.getMonth() + Math.floor(Math.random() * 12) + 1);

  const taxDue = new Date(now);
  taxDue.setMonth(taxDue.getMonth() + Math.floor(Math.random() * 12) + 1);

  return formatDvlaResponse({
    registrationNumber: vrm,
    make: "FORD",
    colour: "BLUE",
    yearOfManufacture: 2019,
    co2Emissions: 135,
    engineCapacity: 1498,
    fuelType: "Petrol",
    markedForExport: false,
    monthOfFirstRegistration: "2019-03",
    motStatus: "Valid",
    motExpiryDate: motExpiry.toISOString().split("T")[0],
    revenueWeight: null,
    taxDueDate: taxDue.toISOString().split("T")[0],
    taxStatus: "Taxed",
    euroStatus: "EURO 6",
    dateOfLastV5CIssued: "2023-06-15",
    wheelplan: "2 AXLE RIGID BODY",
    typeApproval: "M1",
  });
}
