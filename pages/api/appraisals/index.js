import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
import Contact from "@/models/Contact";
import Vehicle from "@/models/Vehicle";
import Notification from "@/models/Notification";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const { decision } = req.query;
    let query = { dealerId };
    if (decision && decision !== "all") query.decision = decision;

    const appraisals = await Appraisal.find(query)
      .populate("contactId")
      .populate("vehicleId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(appraisals);
  }

  if (req.method === "POST") {
    const {
      vehicleReg, vehicleMake, vehicleModel, vehicleYear,
      mileage, colour, fuelType, transmission, conditionNotes, proposedPurchasePrice, aiHintText,
      damagePhotos, faultCodePhotos, v5Url, serviceHistoryUrl, otherDocuments, prepTemplateId
    } = req.body;

    if (!vehicleReg) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    // Build appraisal data - only include fields that have values
    const appraisalData = {
      dealerId,
      vehicleReg: vehicleReg.toUpperCase().replace(/\s/g, ""),
      damagePhotos: damagePhotos || [],
      faultCodePhotos: faultCodePhotos || [],
    };

    // Add optional fields only if they have values
    if (vehicleMake) appraisalData.vehicleMake = vehicleMake;
    if (vehicleModel) appraisalData.vehicleModel = vehicleModel;
    if (vehicleYear) appraisalData.vehicleYear = vehicleYear;
    if (mileage) appraisalData.mileage = Number(mileage);
    if (colour) appraisalData.colour = colour;
    if (fuelType) appraisalData.fuelType = fuelType;
    if (transmission) appraisalData.transmission = transmission;
    if (conditionNotes) appraisalData.conditionNotes = conditionNotes;
    if (proposedPurchasePrice) appraisalData.proposedPurchasePrice = Number(proposedPurchasePrice);
    if (aiHintText) appraisalData.aiHintText = aiHintText;
    if (v5Url) appraisalData.v5Url = v5Url;
    if (serviceHistoryUrl) appraisalData.serviceHistoryUrl = serviceHistoryUrl;
    if (otherDocuments) appraisalData.otherDocuments = otherDocuments;
    if (prepTemplateId && prepTemplateId !== "default") appraisalData.prepTemplateId = prepTemplateId;

    const appraisal = await Appraisal.create(appraisalData);

    // Create notification for new appraisal (broadcasts to all dealer users)
    const vehicleDisplay = [vehicleMake, vehicleModel].filter(Boolean).join(" ") || "Unknown Vehicle";
    await Notification.create({
      dealerId,
      userId: null, // broadcasts to all users in dealer
      type: "NEW_APPRAISAL",
      title: "New Appraisal Created",
      message: `${vehicleReg} - ${vehicleDisplay}`,
      relatedAppraisalId: appraisal._id,
      isRead: false,
    });

    const populated = await Appraisal.findById(appraisal._id).populate("contactId").lean();
    // Transform _id to id for frontend
    const result = {
      ...populated,
      id: populated._id.toString(),
      _id: undefined,
    };
    return res.status(201).json(result);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
