// Fix orphaned vehicles (created without dealerId) and reset their appraisals
// DELETE THIS FILE AFTER USE
import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import Appraisal from "@/models/Appraisal";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import VehicleDocument from "@/models/VehicleDocument";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required. Call with: curl -X POST http://localhost:3000/api/fix-orphaned-vehicles" });
  }

  await connectMongo();

  const results = [];

  // Find vehicles without dealerId
  const orphanedVehicles = await Vehicle.find({ dealerId: null });
  results.push(`Found ${orphanedVehicles.length} orphaned vehicle(s)`);

  for (const vehicle of orphanedVehicles) {
    results.push(`Processing vehicle: ${vehicle.regCurrent} (${vehicle._id})`);

    // Find and reset any appraisals pointing to this vehicle
    const appraisal = await Appraisal.findOne({ vehicleId: vehicle._id });
    if (appraisal) {
      appraisal.vehicleId = null;
      appraisal.decision = "pending";
      appraisal.decidedAt = null;
      await appraisal.save();
      results.push(`  - Reset appraisal: ${appraisal._id}`);
    }

    const pxAppraisal = await CustomerPXAppraisal.findOne({ vehicleId: vehicle._id });
    if (pxAppraisal) {
      pxAppraisal.vehicleId = null;
      pxAppraisal.decision = "pending";
      pxAppraisal.decidedAt = null;
      await pxAppraisal.save();
      results.push(`  - Reset customer PX appraisal: ${pxAppraisal._id}`);
    }

    // Delete related records
    const deletedTasks = await VehicleTask.deleteMany({ vehicleId: vehicle._id });
    const deletedIssues = await VehicleIssue.deleteMany({ vehicleId: vehicle._id });
    const deletedDocs = await VehicleDocument.deleteMany({ vehicleId: vehicle._id });
    results.push(`  - Deleted ${deletedTasks.deletedCount} tasks, ${deletedIssues.deletedCount} issues, ${deletedDocs.deletedCount} documents`);

    // Delete the orphaned vehicle
    await Vehicle.deleteOne({ _id: vehicle._id });
    results.push(`  - Deleted orphaned vehicle`);
  }

  results.push("Done! You can now re-convert the appraisal(s).");

  return res.status(200).json({ success: true, results });
}
