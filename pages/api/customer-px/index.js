import connectMongo from "@/libs/mongoose";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";
import Dealer from "@/models/Dealer";
import Vehicle from "@/models/Vehicle";
import Contact from "@/models/Contact";
import { withDealerContext, requireDealerContext } from "@/libs/authContext";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

// This endpoint supports both authenticated (GET/admin POST) and public (POST from forms)
export default async function handler(req, res) {
  await connectMongo();

  // GET requires authentication
  if (req.method === "GET") {
    try {
      const ctx = await requireDealerContext(req, res);
      const { dealerId } = ctx;
      const { decision } = req.query;
      let query = { dealerId };
      if (decision && decision !== "all") query.decision = decision;

      const appraisals = await CustomerPXAppraisal.find(query)
        .populate("contactId")
        .populate("vehicleId")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json(appraisals);
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }
  }

  // POST can be public (from form submissions) or authenticated
  if (req.method === "POST") {
    const {
      vehicleReg, vehicleMake, vehicleModel, vehicleYear,
      mileage, colour, fuelType, conditionNotes, proposedPurchasePrice,
      outstandingFinanceAmount, aiHintText, v5Url, serviceHistoryUrl,
      otherDocuments, prepTemplateId, customerName, customerEmail, customerPhone,
      conditionRating, formSubmissionId, interestedInVehicle, dealerSlug, dealerId: bodyDealerId,
      photos
    } = req.body;

    if (!vehicleReg) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    // Determine dealer ID - check if authenticated first
    let dealerId = null;
    const session = await getServerSession(req, res, authOptions);

    if (session?.user?.id) {
      // Authenticated user - use their dealer context
      try {
        const ctx = await requireDealerContext(req, res);
        dealerId = ctx.dealerId;
      } catch (e) {
        // Fall through to public dealer lookup
      }
    }

    // If no authenticated dealer, try to find by slug/ID (public form submission)
    if (!dealerId) {
      let dealer = null;
      if (dealerSlug) {
        dealer = await Dealer.findOne({ slug: dealerSlug }).lean();
        if (!dealer) {
          dealer = await Dealer.findById(dealerSlug).lean();
        }
      } else if (bodyDealerId) {
        dealer = await Dealer.findById(bodyDealerId).lean();
      }

      if (!dealer) {
        return res.status(400).json({ error: "Dealer not found" });
      }
      dealerId = dealer._id;
    }

    const appraisalData = {
      vehicleReg: vehicleReg.toUpperCase().replace(/\s/g, ""),
      dealerId,
    };

    // Add optional fields only if they have values
    if (vehicleMake) appraisalData.vehicleMake = vehicleMake;
    if (vehicleModel) appraisalData.vehicleModel = vehicleModel;
    if (vehicleYear) appraisalData.vehicleYear = vehicleYear;
    if (mileage) appraisalData.mileage = Number(mileage);
    if (colour) appraisalData.colour = colour;
    if (fuelType) appraisalData.fuelType = fuelType;
    if (conditionNotes) appraisalData.conditionNotes = conditionNotes;
    if (proposedPurchasePrice) appraisalData.proposedPurchasePrice = Number(proposedPurchasePrice);
    if (outstandingFinanceAmount) appraisalData.outstandingFinanceAmount = Number(outstandingFinanceAmount);
    if (aiHintText) appraisalData.aiHintText = aiHintText;
    if (v5Url) appraisalData.v5Url = v5Url;
    if (serviceHistoryUrl) appraisalData.serviceHistoryUrl = serviceHistoryUrl;
    if (otherDocuments) appraisalData.otherDocuments = otherDocuments;
    if (prepTemplateId && prepTemplateId !== "default") appraisalData.prepTemplateId = prepTemplateId;
    if (customerName) appraisalData.customerName = customerName;
    if (customerEmail) appraisalData.customerEmail = customerEmail;
    if (customerPhone) appraisalData.customerPhone = customerPhone;
    if (conditionRating) appraisalData.conditionRating = conditionRating;
    if (formSubmissionId) appraisalData.formSubmissionId = formSubmissionId;
    if (interestedInVehicle) appraisalData.interestedInVehicle = interestedInVehicle;
    if (photos) {
      appraisalData.photos = {
        exterior: photos.exterior || [],
        interior: photos.interior || [],
        dashboard: photos.dashboard || null,
        odometer: photos.odometer || null,
      };
    }

    const appraisal = await CustomerPXAppraisal.create(appraisalData);

    const populated = await CustomerPXAppraisal.findById(appraisal._id).populate("contactId").lean();
    const result = {
      ...populated,
      id: populated._id.toString(),
      _id: undefined,
    };
    return res.status(201).json(result);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
