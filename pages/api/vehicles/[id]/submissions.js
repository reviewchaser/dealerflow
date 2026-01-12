import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import FormSubmission from "@/models/FormSubmission";
import Form from "@/models/Form";
import { withDealerContext } from "@/libs/authContext";

/**
 * Vehicle Submissions API
 * GET /api/vehicles/[id]/submissions
 *
 * Returns all form submissions linked to a vehicle.
 * Links can be:
 * - Direct linkedVehicleId reference
 * - VRM match in rawAnswers.vrm field
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid vehicle ID" });
  }

  // Verify vehicle belongs to dealer
  const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  // Normalize VRM for matching (uppercase, no spaces)
  const normalizedVrm = vehicle.regCurrent?.toUpperCase().replace(/\s/g, "");

  // Fetch submissions that are linked to this vehicle
  // They could be linked via linkedVehicleId or via rawAnswers.vrm matching
  const submissions = await FormSubmission.find({
    dealerId,
    $or: [
      { linkedVehicleId: id },
      ...(normalizedVrm ? [
        { "rawAnswers.vrm": { $regex: new RegExp(`^${normalizedVrm}$`, "i") } },
        { "rawAnswers.vrm": { $regex: new RegExp(`^${normalizedVrm.replace(/(.{2,4})$/, " $1")}$`, "i") } }, // With space variant
      ] : []),
    ],
    status: { $ne: "DELETED" },
  })
    .populate("formId", "name type")
    .sort({ createdAt: -1 })
    .lean();

  // Format response with form type from populated formId
  const formattedSubmissions = submissions.map((sub) => ({
    id: sub._id.toString(),
    formType: sub.formId?.type || null,
    formName: sub.formId?.name || null,
    status: sub.status,
    createdAt: sub.createdAt,
    submittedAt: sub.submittedAt,
  }));

  return res.status(200).json({
    submissions: formattedSubmissions,
  });
}

export default withDealerContext(handler);
