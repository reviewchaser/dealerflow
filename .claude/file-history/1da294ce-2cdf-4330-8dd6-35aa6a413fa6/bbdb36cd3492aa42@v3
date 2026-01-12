/**
 * DVLA Vehicle Enquiry Service API Integration
 *
 * Uses the official DVLA VES API to lookup vehicle details by registration number.
 * API Documentation: https://developer-portal.driver-vehicle-licensing.api.gov.uk/
 *
 * Returns normalized vehicle data using shared normalizer.
 */

import { normalizeVrm, normalizeDvlaResponse } from "@/libs/vehicle/normalizeVrmLookup";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleReg } = req.body;
  if (!vehicleReg) {
    return res.status(400).json({ error: "Vehicle registration required" });
  }

  // Normalize VRM: trim, uppercase, remove all spaces
  const cleanReg = vehicleReg.trim().toUpperCase().replace(/\s+/g, "");

  // Basic format validation
  if (cleanReg.length < 2 || cleanReg.length > 8) {
    return res.status(400).json({
      error: "Invalid registration format",
      errorCode: "INVALID_FORMAT",
      message: "Registration number must be between 2 and 8 characters",
    });
  }

  const apiKey = process.env.DVLA_API_KEY;

  // If no API key, return dummy data for development
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[DVLA] API key not configured - returning dummy data");
      return res.status(200).json(generateDummyData(cleanReg));
    }
    // In production, return proper error
    return res.status(503).json({
      error: "DVLA integration not configured",
      errorCode: "NOT_CONFIGURED",
      message: "DVLA lookup is not available. Please contact support.",
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
        body: JSON.stringify({
          registrationNumber: cleanReg,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV === "development") {
        console.log(`[DVLA] Response status: ${response.status}`);
      }
      console.error("[DVLA] API error:", response.status, errorText);

      // Handle specific error codes
      if (response.status === 404) {
        return res.status(404).json({
          error: "VRM not found",
          errorCode: "NOT_FOUND",
          message: "No vehicle found with this registration number. Please check the VRM and try again.",
        });
      }

      if (response.status === 400) {
        return res.status(400).json({
          error: "Invalid registration",
          errorCode: "INVALID_FORMAT",
          message: "The registration number format is invalid.",
        });
      }

      if (response.status === 401) {
        return res.status(503).json({
          error: "DVLA integration not configured",
          errorCode: "AUTH_FAILED",
          message: "DVLA API authentication failed. Please contact support.",
        });
      }

      if (response.status === 403) {
        return res.status(503).json({
          error: "DVLA integration not configured",
          errorCode: "ACCESS_DENIED",
          message: "DVLA API access denied. Please contact support.",
        });
      }

      return res.status(503).json({
        error: "DVLA service unavailable",
        errorCode: "SERVICE_ERROR",
        message: "Unable to retrieve vehicle details. Please try again later.",
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[DVLA] Response status: ${response.status} - Success`);
    }

    const data = await response.json();

    // Use shared normalizer for consistent response shape
    const normalizedData = normalizeDvlaResponse(data);

    // Also include legacy field names for backwards compatibility
    const vehicleData = {
      ...normalizedData,
      // Legacy field mappings
      isDummy: false,
      registrationNumber: normalizedData.vrm,
      yearOfManufacture: normalizedData.year,
      // Flag if model is missing (needs manual entry)
      modelMissing: !normalizedData.model || normalizedData.model.trim() === "",
    };

    return res.status(200).json(vehicleData);
  } catch (error) {
    console.error("[DVLA] Network error:", error.message);

    // In development, fall back to dummy data
    if (process.env.NODE_ENV === "development") {
      console.warn("[DVLA] Falling back to dummy data due to connection error");
      return res.status(200).json(generateDummyData(cleanReg));
    }

    // In production, return service unavailable
    return res.status(503).json({
      error: "DVLA service unavailable",
      errorCode: "NETWORK_ERROR",
      message: "Unable to connect to DVLA service. Please try again later.",
    });
  }
}

/**
 * Generate dummy data for development when API key is not configured
 */
function generateDummyData(vehicleReg) {
  // Generate varied MOT dates for testing
  const rand = Math.random();
  let daysOffset;
  let motStatus;

  if (rand < 0.3) {
    daysOffset = -Math.floor(Math.random() * 90);
    motStatus = "Not valid";
  } else if (rand < 0.5) {
    daysOffset = Math.floor(Math.random() * 30);
    motStatus = "Valid";
  } else {
    daysOffset = Math.floor(Math.random() * 365) + 30;
    motStatus = "Valid";
  }

  const motExpiryDate = new Date();
  motExpiryDate.setDate(motExpiryDate.getDate() + daysOffset);
  const motExpiryStr = motExpiryDate.toISOString().split("T")[0];

  // Create raw DVLA-like data
  const rawData = {
    registrationNumber: vehicleReg,
    make: "FORD",
    model: "FOCUS",
    colour: "BLUE",
    yearOfManufacture: 2019,
    engineCapacity: 1500,
    fuelType: "PETROL",
    transmission: "MANUAL",
    taxStatus: "Taxed",
    taxDueDate: "2025-03-01",
    motStatus: motStatus,
    motExpiryDate: motExpiryStr,
  };

  // Normalize using shared normalizer
  const normalizedData = normalizeDvlaResponse(rawData);

  return {
    ...normalizedData,
    isDummy: true,
    message: "DVLA API not configured - showing demo data",
    // Legacy field mappings
    registrationNumber: normalizedData.vrm,
    yearOfManufacture: normalizedData.year,
    modelMissing: false,
  };
}
