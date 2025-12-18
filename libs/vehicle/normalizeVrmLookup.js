/**
 * Shared VRM/DVLA Lookup Normalizer
 *
 * All VRM lookups in the app should use this to produce a consistent shape:
 * - vrm (normalised)
 * - make
 * - model
 * - fuelType
 * - year
 * - colour
 * - motStatus
 * - motExpiryDate
 * - transmission
 * - engineCapacity
 */

/**
 * Normalize a VRM string (trim, uppercase, remove spaces)
 * @param {string} vrm - Raw VRM input
 * @returns {string} - Normalized VRM
 */
export function normalizeVrm(vrm) {
  if (!vrm) return "";
  return vrm.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Calculate MOT status from expiry date
 * @param {string|Date} motExpiryDate - MOT expiry date
 * @param {string} dvlaMotStatus - Status from DVLA API (if available)
 * @returns {{ status: string, daysRemaining: number|null, isExpired: boolean, isDueSoon: boolean }}
 */
export function calculateMotStatus(motExpiryDate, dvlaMotStatus = null) {
  if (!motExpiryDate) {
    return {
      status: dvlaMotStatus || "Unknown",
      daysRemaining: null,
      isExpired: false,
      isDueSoon: false,
    };
  }

  const expiry = new Date(motExpiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining < 0;
  const isDueSoon = !isExpired && daysRemaining <= 30;

  let status;
  if (isExpired) {
    status = "Expired";
  } else if (isDueSoon) {
    status = "Due Soon";
  } else {
    status = dvlaMotStatus || "Valid";
  }

  return {
    status,
    daysRemaining: isExpired ? 0 : daysRemaining,
    isExpired,
    isDueSoon,
  };
}

/**
 * Normalize DVLA API response to consistent vehicle shape
 * @param {object} dvlaData - Raw DVLA API response
 * @returns {object} - Normalized vehicle data
 */
export function normalizeDvlaResponse(dvlaData) {
  if (!dvlaData) {
    return null;
  }

  const vrm = normalizeVrm(dvlaData.registrationNumber);
  const motInfo = calculateMotStatus(dvlaData.motExpiryDate, dvlaData.motStatus);

  return {
    // Core fields
    vrm,
    make: dvlaData.make?.toUpperCase() || "",
    model: dvlaData.model?.toUpperCase() || "", // Note: DVLA often returns empty model
    year: dvlaData.yearOfManufacture || null,
    colour: dvlaData.colour?.toUpperCase() || "",
    fuelType: normalizeFuelType(dvlaData.fuelType),
    transmission: normalizeTransmission(dvlaData.transmission),
    engineCapacity: dvlaData.engineCapacity || null,

    // MOT information
    motStatus: motInfo.status,
    motExpiryDate: dvlaData.motExpiryDate || null,
    motDaysRemaining: motInfo.daysRemaining,
    motIsExpired: motInfo.isExpired,
    motIsDueSoon: motInfo.isDueSoon,

    // Tax information
    taxStatus: dvlaData.taxStatus || null,
    taxDueDate: dvlaData.taxDueDate || null,

    // Additional DVLA fields (for reference)
    co2Emissions: dvlaData.co2Emissions || null,
    euroStatus: dvlaData.euroStatus || null,
    markedForExport: dvlaData.markedForExport || false,
    monthOfFirstRegistration: dvlaData.monthOfFirstRegistration || null,
    dateOfLastV5CIssued: dvlaData.dateOfLastV5CIssued || null,

    // Metadata
    isDummy: dvlaData.isDummy || false,
    lookupTimestamp: new Date().toISOString(),
  };
}

/**
 * Normalize fuel type to consistent format
 * @param {string} fuelType - Raw fuel type from DVLA
 * @returns {string} - Normalized fuel type
 */
export function normalizeFuelType(fuelType) {
  if (!fuelType) return "";

  const normalized = fuelType.toUpperCase().trim();

  // Map common variations
  const fuelMap = {
    PETROL: "PETROL",
    DIESEL: "DIESEL",
    ELECTRIC: "ELECTRIC",
    HYBRID: "HYBRID",
    "HYBRID ELECTRIC": "HYBRID",
    "PLUG-IN HYBRID": "HYBRID",
    "PETROL/ELECTRIC HYBRID": "HYBRID",
    "DIESEL/ELECTRIC HYBRID": "HYBRID",
    GAS: "GAS",
    LPG: "LPG",
    CNG: "CNG",
    "BI FUEL": "BI FUEL",
    HYDROGEN: "HYDROGEN",
  };

  return fuelMap[normalized] || normalized;
}

/**
 * Normalize transmission to consistent format
 * @param {string} transmission - Raw transmission from DVLA
 * @returns {string} - Normalized transmission
 */
export function normalizeTransmission(transmission) {
  if (!transmission) return "";

  const normalized = transmission.toUpperCase().trim();

  // Map common variations
  const transMap = {
    MANUAL: "MANUAL",
    AUTOMATIC: "AUTOMATIC",
    AUTO: "AUTOMATIC",
    SEMI: "SEMI-AUTO",
    "SEMI-AUTOMATIC": "SEMI-AUTO",
    "SEMI-AUTO": "SEMI-AUTO",
    CVT: "CVT",
  };

  return transMap[normalized] || normalized;
}

/**
 * Check if model is missing and needs manual entry
 * @param {object} normalizedData - Normalized vehicle data from normalizeDvlaResponse
 * @returns {boolean} - True if model is missing/empty
 */
export function isModelMissing(normalizedData) {
  return !normalizedData?.model || normalizedData.model.trim() === "";
}

/**
 * Validate that required fields are present for vehicle creation
 * @param {object} vehicleData - Vehicle data to validate
 * @returns {{ valid: boolean, missingFields: string[] }}
 */
export function validateVehicleData(vehicleData) {
  const required = ["vrm", "make", "model"];
  const missingFields = required.filter((field) => !vehicleData?.[field]?.trim());

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export default {
  normalizeVrm,
  normalizeDvlaResponse,
  normalizeFuelType,
  normalizeTransmission,
  calculateMotStatus,
  isModelMissing,
  validateVehicleData,
};
