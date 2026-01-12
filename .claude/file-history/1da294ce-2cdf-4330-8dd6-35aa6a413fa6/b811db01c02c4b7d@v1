/**
 * Dev-only endpoint to set password for an existing user
 *
 * Guarded by ENABLE_ADMIN_RECOVERY=true env var
 * Use this to recover accounts that have no password set
 *
 * POST /api/dev/set-password
 * Body: { email, newPassword }
 */

import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

export default async function handler(req, res) {
  // Always return JSON
  res.setHeader("Content-Type", "application/json");

  // Only allow when ENABLE_ADMIN_RECOVERY is true
  if (process.env.ENABLE_ADMIN_RECOVERY !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and newPassword are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    await connectMongo();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash new password
    const passwordHash = await User.hashPassword(newPassword);

    // Update user with new password
    user.passwordHash = passwordHash;
    user.status = "ACTIVE"; // Ensure user is active
    await user.save();

    console.log(`[Dev] Password set for user: ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: `Password updated for ${normalizedEmail}`,
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error("[Dev Set Password] Error:", error.message, error.stack);
    return res.status(500).json({ error: "Failed to set password" });
  }
}
