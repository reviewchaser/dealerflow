import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import AppraisalShareLink from "@/models/AppraisalShareLink";
import User from "@/models/User";
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

  // GET - List share links for this dealer
  if (req.method === "GET") {
    try {
      const links = await AppraisalShareLink.find({ dealerId })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json(links);
    } catch (error) {
      console.error("Error fetching share links:", error);
      return res.status(500).json({ error: "Failed to fetch share links" });
    }
  }

  // POST - Create new share link
  if (req.method === "POST") {
    try {
      const { expiresInDays, linkType } = req.body;

      // Generate token and hash it
      const token = generateToken();
      const tokenHash = hashToken(token);

      // Calculate expiry (default: 90 days)
      let expiresAt = null;
      if (expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
      }

      // Get creator name
      const creator = await User.findById(userId).lean();
      const creatorName = creator?.name || user?.name || user?.email || "Unknown";

      // Validate linkType
      const validLinkType = ["customer_px", "agent_appraisal"].includes(linkType) ? linkType : "customer_px";

      const link = await AppraisalShareLink.create({
        dealerId,
        tokenHash,
        createdByUserId: userId,
        createdByName: creatorName,
        expiresAt,
        isActive: true,
        linkType: validLinkType,
      });

      // Return the link info along with the raw token (only returned once!)
      return res.status(201).json({
        id: link._id,
        token, // Raw token - only returned on creation
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
        createdByName: link.createdByName,
        isActive: link.isActive,
        linkType: link.linkType,
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      return res.status(500).json({ error: "Failed to create share link" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
