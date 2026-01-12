import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import { requireDealerContext } from "@/libs/authContext";

/**
 * Migration script for Aftersales Costing - VAT handling update
 *
 * This migration:
 * 1. Migrates legacy partsCost/labourCost to new partsNet/labourNet fields
 * 2. Sets costingAddedAt for cases with costs but no costingAddedAt
 *    - Uses first COSTING_UPDATED event timestamp if available
 *    - Falls back to case updatedAt
 * 3. Sets default VAT treatment to STANDARD for migrated costs
 *
 * Run via: GET /api/admin/migrate-costing?dryRun=true (preview)
 *          GET /api/admin/migrate-costing (execute)
 */
export default async function handler(req, res) {
  await connectMongo();

  // Require dealer context for security
  let ctx;
  try {
    ctx = await requireDealerContext(req, res);
  } catch (error) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dryRun = req.query.dryRun === "true";
  const { dealerId } = ctx;

  try {
    // Find cases that need migration:
    // - Have legacy costs (partsCost or labourCost > 0)
    // - OR have new costs but no costingAddedAt
    const casesNeedingMigration = await AftercareCase.find({
      dealerId,
      $or: [
        // Legacy costs that need migration to new fields
        { "costing.partsCost": { $gt: 0 } },
        { "costing.labourCost": { $gt: 0 } },
        // New costs without costingAddedAt
        {
          $and: [
            { $or: [{ "costing.partsNet": { $gt: 0 } }, { "costing.labourNet": { $gt: 0 } }] },
            { costingAddedAt: { $exists: false } }
          ]
        }
      ]
    }).lean();

    const results = {
      totalCases: casesNeedingMigration.length,
      migratedCases: [],
      skippedCases: [],
      errors: []
    };

    for (const caseItem of casesNeedingMigration) {
      try {
        const updates = {};
        const caseId = caseItem._id;
        const costing = caseItem.costing || {};

        // Check if we need to migrate legacy fields
        const hasLegacyCosts = (costing.partsCost > 0 || costing.labourCost > 0);
        const hasNewCosts = (costing.partsNet > 0 || costing.labourNet > 0);
        const needsCostingAddedAt = !caseItem.costingAddedAt && (hasLegacyCosts || hasNewCosts);

        // Migrate legacy costs to new fields if needed
        if (hasLegacyCosts && !hasNewCosts) {
          updates["costing.partsNet"] = costing.partsCost || 0;
          updates["costing.labourNet"] = costing.labourCost || 0;
          updates["costing.partsVatTreatment"] = "STANDARD";
          updates["costing.labourVatTreatment"] = "STANDARD";
          updates["costing.partsVatRate"] = 0.2;
          updates["costing.labourVatRate"] = 0.2;
        }

        // Set costingAddedAt if needed
        if (needsCostingAddedAt) {
          // Look for first COSTING_UPDATED event
          let costingDate = null;
          const costingEvent = (caseItem.events || []).find(e => e.type === "COSTING_UPDATED");

          if (costingEvent?.createdAt) {
            costingDate = new Date(costingEvent.createdAt);
          } else if (caseItem.updatedAt) {
            costingDate = new Date(caseItem.updatedAt);
          } else {
            costingDate = new Date(caseItem.createdAt);
          }

          updates.costingAddedAt = costingDate;
        }

        // Skip if no updates needed
        if (Object.keys(updates).length === 0) {
          results.skippedCases.push({
            caseId: caseId.toString(),
            regAtPurchase: caseItem.regAtPurchase || caseItem.currentReg,
            reason: "No migration needed"
          });
          continue;
        }

        const migrationRecord = {
          caseId: caseId.toString(),
          regAtPurchase: caseItem.regAtPurchase || caseItem.currentReg,
          updates,
          legacyPartsCost: costing.partsCost || 0,
          legacyLabourCost: costing.labourCost || 0,
          newPartsNet: updates["costing.partsNet"] ?? costing.partsNet ?? 0,
          newLabourNet: updates["costing.labourNet"] ?? costing.labourNet ?? 0,
          costingAddedAt: updates.costingAddedAt?.toISOString()
        };

        if (!dryRun) {
          await AftercareCase.updateOne({ _id: caseId }, { $set: updates });
        }

        results.migratedCases.push(migrationRecord);
      } catch (error) {
        results.errors.push({
          caseId: caseItem._id.toString(),
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Dry run complete. ${results.migratedCases.length} cases would be migrated.`
        : `Migration complete. ${results.migratedCases.length} cases migrated.`,
      results
    });
  } catch (error) {
    console.error("[Migration Error]", error);
    return res.status(500).json({ error: error.message });
  }
}
