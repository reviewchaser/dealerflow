import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
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
  const { dealerId } = ctx;
  const { id } = req.query;

  // POST - Generate share link for this appraisal
  if (req.method === "POST") {
    try {
      const appraisal = await Appraisal.findOne({ _id: id, dealerId });

      if (!appraisal) {
        return res.status(404).json({ error: "Appraisal not found" });
      }

      const { expiresInDays = 60 } = req.body;

      // Generate token and hash it
      const token = generateToken();
      const tokenHash = hashToken(token);

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      // Update appraisal with share token
      appraisal.shareTokenHash = tokenHash;
      appraisal.shareExpiresAt = expiresAt;
      appraisal.shareCreatedAt = new Date();
      await appraisal.save();

      // Return the raw token (only returned once!)
      return res.status(201).json({
        token, // Raw token - only returned on creation
        expiresAt,
        shareUrl: `/public/appraisal/${token}`,
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      return res.status(500).json({ error: "Failed to create share link" });
    }
  }

  // DELETE - Revoke share link
  if (req.method === "DELETE") {
    try {
      const appraisal = await Appraisal.findOne({ _id: id, dealerId });

      if (!appraisal) {
        return res.status(404).json({ error: "Appraisal not found" });
      }

      appraisal.shareTokenHash = null;
      appraisal.shareExpiresAt = null;
      appraisal.shareCreatedAt = null;
      await appraisal.save();

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error revoking share link:", error);
      return res.status(500).json({ error: "Failed to revoke share link" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
