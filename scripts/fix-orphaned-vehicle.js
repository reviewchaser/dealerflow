// Fix orphaned vehicles (created without dealerId) and reset their appraisals
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import connectMongo from "../libs/mongoose.js";
import Vehicle from "../models/Vehicle.js";
import Appraisal from "../models/Appraisal.js";
import CustomerPXAppraisal from "../models/CustomerPXAppraisal.js";
import VehicleTask from "../models/VehicleTask.js";
import VehicleIssue from "../models/VehicleIssue.js";
import VehicleDocument from "../models/VehicleDocument.js";

async function fixOrphanedVehicles() {
  console.log("Connecting to MongoDB...");
  await connectMongo();

  // Find vehicles without dealerId
  const orphanedVehicles = await Vehicle.find({ dealerId: null });
  console.log(`Found ${orphanedVehicles.length} orphaned vehicle(s)`);

  for (const vehicle of orphanedVehicles) {
    console.log(`\nProcessing vehicle: ${vehicle.regCurrent} (${vehicle._id})`);

    // Find and reset any appraisals pointing to this vehicle
    const appraisal = await Appraisal.findOne({ vehicleId: vehicle._id });
    if (appraisal) {
      console.log(`  - Resetting appraisal: ${appraisal._id}`);
      appraisal.vehicleId = null;
      appraisal.decision = "pending";
      appraisal.decidedAt = null;
      await appraisal.save();
    }

    const pxAppraisal = await CustomerPXAppraisal.findOne({ vehicleId: vehicle._id });
    if (pxAppraisal) {
      console.log(`  - Resetting customer PX appraisal: ${pxAppraisal._id}`);
      pxAppraisal.vehicleId = null;
      pxAppraisal.decision = "pending";
      pxAppraisal.decidedAt = null;
      await pxAppraisal.save();
    }

    // Delete related records
    const deletedTasks = await VehicleTask.deleteMany({ vehicleId: vehicle._id });
    const deletedIssues = await VehicleIssue.deleteMany({ vehicleId: vehicle._id });
    const deletedDocs = await VehicleDocument.deleteMany({ vehicleId: vehicle._id });
    console.log(`  - Deleted ${deletedTasks.deletedCount} tasks, ${deletedIssues.deletedCount} issues, ${deletedDocs.deletedCount} documents`);

    // Delete the orphaned vehicle
    await Vehicle.deleteOne({ _id: vehicle._id });
    console.log(`  - Deleted orphaned vehicle`);
  }

  console.log("\nDone! You can now re-convert the appraisal(s).");
  process.exit(0);
}

fixOrphanedVehicles().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
