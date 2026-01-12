import connectMongo from "@/libs/mongoose";
import ReviewRequest from "@/models/ReviewRequest";
import ReviewResponse from "@/models/ReviewResponse";
import Vehicle from "@/models/Vehicle"; // Required for populate
import Contact from "@/models/Contact"; // Required for populate
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const requests = await ReviewRequest.find({ dealerId })
      .populate("contactId")
      .populate("vehicleId")
      .sort({ createdAt: -1 })
      .lean();

    // Get responses for each request
    for (let request of requests) {
      request.response = await ReviewResponse.findOne({ reviewRequestId: request._id }).lean();
    }

    return res.status(200).json(requests);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
