/**
 * Migration Script: Convert User.dealerId to DealerMembership
 *
 * This script:
 * 1. Finds all users with a dealerId
 * 2. Creates OWNER membership for the first user of each dealer (by createdAt)
 * 3. Creates STAFF membership for subsequent users
 * 4. Ensures every dealer has at least one OWNER
 *
 * Run with: node scripts/migrate-to-memberships.js
 *
 * Safe to run multiple times - skips existing memberships
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Import models
import User from "../models/User.js";
import Dealer from "../models/Dealer.js";
import DealerMembership from "../models/DealerMembership.js";

async function migrate() {
  console.log("🚀 Starting membership migration...\n");

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not found in environment");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  try {
    // Get all dealers
    const dealers = await Dealer.find().lean();
    console.log(`📊 Found ${dealers.length} dealer(s)\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const dealer of dealers) {
      console.log(`\n🏢 Processing dealer: ${dealer.name} (${dealer._id})`);

      // Find all users linked to this dealer (sorted by createdAt)
      const users = await User.find({ dealerId: dealer._id })
        .sort({ createdAt: 1 })
        .lean();

      console.log(`   Found ${users.length} user(s) with dealerId`);

      // Check if dealer already has an owner
      const existingOwnerCount = await DealerMembership.countDocuments({
        dealerId: dealer._id,
        role: "OWNER",
        removedAt: null,
      });

      let isFirstOwnerAssigned = existingOwnerCount > 0;

      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        // First user for this dealer becomes OWNER (if no owner exists)
        const role = !isFirstOwnerAssigned ? "OWNER" : "STAFF";

        // Use upsert for true idempotency - atomic operation
        // $setOnInsert ensures we only set fields on creation, not on update
        const result = await DealerMembership.updateOne(
          { dealerId: dealer._id, userId: user._id },
          {
            $setOnInsert: {
              dealerId: dealer._id,
              userId: user._id,
              role,
              lastActiveAt: new Date(),
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          console.log(`   ✅ Created: ${user.email || user.name} as ${role}`);
          totalCreated++;
          if (role === "OWNER") {
            isFirstOwnerAssigned = true;
          }
        } else {
          console.log(`   ⏭️  Skipped: ${user.email || user.name} (membership exists)`);
          totalSkipped++;
          // Check if existing membership is OWNER (for tracking)
          if (!isFirstOwnerAssigned) {
            const existing = await DealerMembership.findOne({
              dealerId: dealer._id,
              userId: user._id,
              role: "OWNER",
            });
            if (existing) isFirstOwnerAssigned = true;
          }
        }
      }

      // If dealer still has no owner after processing users, check for any user to promote
      if (!isFirstOwnerAssigned) {
        // Find any existing membership for this dealer
        const anyMembership = await DealerMembership.findOne({
          dealerId: dealer._id,
          removedAt: null,
        });

        if (anyMembership) {
          anyMembership.role = "OWNER";
          await anyMembership.save();
          console.log(`   ⬆️  Promoted existing member to OWNER`);
        } else {
          console.log(`   ⚠️  Warning: Dealer has no users/members!`);
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log(`   Created: ${totalCreated} membership(s)`);
    console.log(`   Skipped: ${totalSkipped} (already existed)`);
    console.log("=".repeat(50) + "\n");

    // Verify invariant: every dealer has at least one owner
    console.log("🔍 Verifying all dealers have at least one OWNER...");
    const dealersWithoutOwner = [];

    for (const dealer of dealers) {
      const ownerCount = await DealerMembership.countDocuments({
        dealerId: dealer._id,
        role: "OWNER",
        removedAt: null,
      });

      if (ownerCount === 0) {
        console.log(`   ❌ ${dealer.name}: NO OWNER`);
        dealersWithoutOwner.push(dealer.name);
      } else {
        console.log(`   ✅ ${dealer.name}: ${ownerCount} owner(s)`);
      }
    }

    // ABORT if any dealer has no owner - this is a critical invariant
    if (dealersWithoutOwner.length > 0) {
      throw new Error(
        `CRITICAL: ${dealersWithoutOwner.length} dealer(s) have no OWNER: ${dealersWithoutOwner.join(", ")}. ` +
        `Migration aborted. Manual intervention required.`
      );
    }

    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run migration
migrate();
