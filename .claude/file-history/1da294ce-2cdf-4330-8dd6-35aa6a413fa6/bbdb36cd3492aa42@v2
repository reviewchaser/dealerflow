/**
 * DVLA Vehicle Enquiry Service API Integration
 *
 * Uses the official DVLA VES API to lookup vehicle details by registration number.
 * API Documentation: https://developer-portal.driver-vehicle-licensing.api.gov.uk/
 */

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

    // Transform DVLA response to our format
    const vehicleData = {
      isDummy: false,
      registrationNumber: data.registrationNumber,
      make: data.make,
      model: data.model || "", // DVLA doesn't always return model
      colour: data.colour,
      yearOfManufacture: data.yearOfManufacture,
      engineCapacity: data.engineCapacity,
      fuelType: data.fuelType,
      transmission: data.transmission || "",
      taxStatus: data.taxStatus,
      taxDueDate: data.taxDueDate,
      motStatus: data.motStatus,
      motExpiryDate: data.motExpiryDate,
      // Additional fields from DVLA
      co2Emissions: data.co2Emissions,
      euroStatus: data.euroStatus,
      markedForExport: data.markedForExport,
      typeApproval: data.typeApproval,
      wheelplan: data.wheelplan,
      monthOfFirstRegistration: data.monthOfFirstRegistration,
      dateOfLastV5CIssued: data.dateOfLastV5CIssued,
      revenueWeight: data.revenueWeight,
      realDrivingEmissions: data.realDrivingEmissions,
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

  return {
    isDummy: true,
    message: "DVLA API not configured - showing demo data",
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
    motExpiryDate: motExpiryDate.toISOString().split("T")[0],
  };
}
