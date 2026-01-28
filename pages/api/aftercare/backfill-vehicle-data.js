import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import { withDealerContext } from "@/libs/authContext";
import { lookupVehicleByVrm } from "@/libs/motLookup";

async function handler(req, res, ctx) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId } = ctx;

  // Find cases that have a VRM but no make/model in details
  const cases = await AftercareCase.find({
    dealerId,
    $and: [
      { $or: [
        { "details.make": { $exists: false } },
        { "details.make": null },
        { "details.make": "" },
      ]},
      { $or: [
        { regAtPurchase: { $exists: true, $ne: null, $ne: "" } },
        { "details.vehicleReg": { $exists: true, $ne: null, $ne: "" } },
      ]},
    ],
    // Skip cases with a linked vehicle (they already have make/model from vehicleId)
    vehicleId: null,
  }).lean();

  let updated = 0;
  let failed = 0;

  for (const c of cases) {
    const vrm = c.regAtPurchase || c.details?.vehicleReg;
    if (!vrm) continue;

    const motData = await lookupVehicleByVrm(vrm);
    if (motData && (motData.make || motData.model)) {
      await AftercareCase.findByIdAndUpdate(c._id, {
        $set: {
          "details.make": motData.make,
          "details.model": motData.model,
        },
      });
      updated++;
    } else {
      failed++;
    }

    // Rate limit: 2 second delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return res.status(200).json({
    total: cases.length,
    updated,
    failed,
  });
}

export default withDealerContext(handler);
