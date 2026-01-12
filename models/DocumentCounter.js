import mongoose from "mongoose";

/**
 * DocumentCounter Model
 *
 * Provides atomic document number allocation for Sales Documents.
 * Uses MongoDB's findOneAndUpdate with $inc for atomic increment.
 *
 * Each dealer has separate counters for each document type.
 */

const documentCounterSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },
    type: {
      type: String,
      enum: ["INVOICE", "DEPOSIT_RECEIPT"],
      required: true,
    },
    nextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    prefix: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Unique compound index to ensure one counter per dealer/type
documentCounterSchema.index({ dealerId: 1, type: 1 }, { unique: true });

/**
 * Atomically allocate the next document number
 * Includes retry mechanism for race conditions and duplicate handling
 *
 * @param {ObjectId} dealerId - The dealer ID
 * @param {string} type - Document type (INVOICE or DEPOSIT_RECEIPT)
 * @param {string} defaultPrefix - Default prefix if counter doesn't exist
 * @param {number} maxRetries - Maximum retry attempts on duplicate (default 5)
 * @returns {Promise<{number: number, prefix: string, documentNumber: string}>}
 */
documentCounterSchema.statics.allocateNumber = async function (
  dealerId,
  type,
  defaultPrefix = "",
  maxRetries = 5
) {
  const SalesDocument = mongoose.models.SalesDocument;

  // First time setup: sync counter with existing documents
  const existingCounter = await this.findOne({ dealerId, type });
  if (!existingCounter && SalesDocument) {
    // Find the highest existing document number for this dealer/type
    const latestDoc = await SalesDocument.findOne({ dealerId, type })
      .sort({ documentNumber: -1 })
      .select("documentNumber")
      .lean();

    if (latestDoc?.documentNumber) {
      // Extract number from document number (e.g., "DEP00005" -> 5)
      const match = latestDoc.documentNumber.match(/(\d+)$/);
      if (match) {
        const highestNumber = parseInt(match[1], 10);
        // Initialize counter to start after the highest existing number
        await this.findOneAndUpdate(
          { dealerId, type },
          { $setOnInsert: { nextNumber: highestNumber + 1, prefix: defaultPrefix } },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }
  }

  let attempts = 0;

  while (attempts < maxRetries) {
    // Atomic increment - returns the document AFTER the update
    const counter = await this.findOneAndUpdate(
      { dealerId, type },
      {
        $inc: { nextNumber: 1 },
        $setOnInsert: { prefix: defaultPrefix }
      },
      {
        new: true,       // Return the updated document
        upsert: true,    // Create if doesn't exist
        setDefaultsOnInsert: true,
      }
    );

    // The number we return is (nextNumber - 1) because we incremented first
    const allocatedNumber = counter.nextNumber - 1;
    const prefix = counter.prefix || defaultPrefix;
    const documentNumber = `${prefix}${String(allocatedNumber).padStart(5, "0")}`;

    // Check if this document number already exists (handles legacy data)
    if (SalesDocument) {
      const existingDoc = await SalesDocument.findOne({
        dealerId,
        type,
        documentNumber,
        status: { $ne: "VOID" }
      }).lean();

      if (existingDoc) {
        // Document number already exists, try next number
        attempts++;
        console.warn(`[DocumentCounter] Document ${documentNumber} already exists, retrying (attempt ${attempts}/${maxRetries})`);
        continue;
      }
    }

    return {
      number: allocatedNumber,
      prefix,
      documentNumber,
    };
  }

  throw new Error(`Failed to allocate unique document number after ${maxRetries} attempts`);
};

/**
 * Initialize counter from dealer settings (for migration)
 *
 * @param {ObjectId} dealerId - The dealer ID
 * @param {string} type - Document type
 * @param {number} startNumber - Starting number
 * @param {string} prefix - Prefix string
 */
documentCounterSchema.statics.initializeCounter = async function (
  dealerId,
  type,
  startNumber,
  prefix
) {
  await this.findOneAndUpdate(
    { dealerId, type },
    {
      $setOnInsert: {
        nextNumber: startNumber || 1,
        prefix: prefix || ""
      }
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
};

export default mongoose.models?.DocumentCounter ||
  mongoose.model("DocumentCounter", documentCounterSchema);
