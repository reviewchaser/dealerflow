import crypto from "crypto";
import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import PrepSummaryShareLink from "@/models/PrepSummaryShareLink";
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
  const { id } = req.query; // vehicleId

  // POST - Generate share link for prep summary
  if (req.method === "POST") {
    try {
      const vehicle = await Vehicle.findOne({ _id: id, dealerId });
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
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
      await PrepSummaryShareLink.create({
        dealerId,
        tokenHash,
        vehicleId: id,
        createdByUserId: userId,
        createdByName: creatorName,
        expiresAt,
        isActive: true,
      });

      // Return the raw token (only returned once!)
      return res.status(201).json({
        token,
        shareUrl: `/public/prep-summary/${token}`,
        expiresAt,
      });
    } catch (error) {
      console.error("Error creating prep summary share link:", error);
      return res.status(500).json({ error: "Failed to create share link" });
    }
  }

  // GET - Get prep summary data (authenticated)
  if (req.method === "GET") {
    try {
      const vehicle = await Vehicle.findOne({ _id: id, dealerId }).lean();
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }

      const tasksRaw = await VehicleTask.find({ vehicleId: id }).sort({ createdAt: 1 }).lean();
      const tasks = tasksRaw.map(task => ({ ...task, id: task._id.toString() }));
      const issues = await VehicleIssue.find({
        vehicleId: id,
        status: { $in: ["outstanding", "ordered", "Outstanding", "Ordered"] }
      }).sort({ createdAt: -1 }).lean();

      return res.status(200).json({
        vehicle,
        tasks,
        issues,
      });
    } catch (error) {
      console.error("Error fetching prep summary:", error);
      return res.status(500).json({ error: "Failed to fetch prep summary" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
