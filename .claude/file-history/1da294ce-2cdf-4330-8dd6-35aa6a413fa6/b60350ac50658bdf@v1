import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import JobSheetShareLink from "@/models/JobSheetShareLink";
import User from "@/models/User";
import Vehicle from "@/models/Vehicle"; // Required for populate
import Contact from "@/models/Contact"; // Required for populate
import { withDealerContext } from "@/libs/authContext";

// Generate a secure random token (URL-safe base64)
function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// Hash token with SHA256
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default withDealerContext(async (req, res, ctx) => {
  await connectMongo();
  const { dealerId, userId, user } = ctx;
  const { id } = req.query; // aftercareCaseId

  // POST - Generate share link for warranty job sheet
  if (req.method === "POST") {
    try {
      const aftercareCase = await AftercareCase.findOne({ _id: id, dealerId });
      if (!aftercareCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const { expiresInDays = 60 } = req.body;

      // Generate token and hash it
      const token = generateToken();
      const tokenHash = hashToken(token);

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      // Get creator name
      const creator = await User.findById(userId).lean();
      const creatorName = creator?.name || user?.name || user?.email || "Unknown";

      // Create share link
      const link = await JobSheetShareLink.create({
        dealerId,
        tokenHash,
        type: "WARRANTY",
        aftercareCaseId: id,
        createdByUserId: userId,
        createdByName: creatorName,
        expiresAt,
        isActive: true,
      });

      // Return the raw token (only returned once!)
      return res.status(201).json({
        token,
        shareUrl: `/public/job/${token}`,
        expiresAt,
      });
    } catch (error) {
      console.error("Error creating warranty job sheet share link:", error);
      return res.status(500).json({ error: "Failed to create share link" });
    }
  }

  // GET - Get warranty job sheet data (authenticated)
  if (req.method === "GET") {
    try {
      const aftercareCase = await AftercareCase.findOne({ _id: id, dealerId })
        .populate("contactId")
        .populate("vehicleId")
        .lean();

      if (!aftercareCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      return res.status(200).json({
        case: aftercareCase,
      });
    } catch (error) {
      console.error("Error fetching warranty job sheet:", error);
      return res.status(500).json({ error: "Failed to fetch job sheet" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
