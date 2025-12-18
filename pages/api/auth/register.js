import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

export default async function handler(req, res) {
  // Always return JSON, never redirect
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Connect to MongoDB using shared connection util
    await connectMongo();
  } catch (dbError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Register] Database connection error:", dbError.message, dbError.stack);
    }
    return res.status(500).json({
      error: process.env.MONGODB_URI
        ? "Database connection failed"
        : "Database not configured"
    });
  }

  try {
    // Check if user already exists (include passwordHash to check if set)
    const existingUser = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (existingUser) {
      // If user exists but has no password (OAuth or invited user)
      if (!existingUser.passwordHash) {
        return res.status(409).json({
          error: "Account exists but has no password set. Use forgot password to set one.",
          code: "NO_PASSWORD_SET",
        });
      }
      // User exists with password
      return res.status(409).json({
        error: "An account with this email already exists. Please sign in instead.",
        code: "EMAIL_EXISTS",
      });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      name: name.trim(),
      fullName: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      userId: user._id.toString(),
    });
  } catch (error) {
    // Log full error in development
    if (process.env.NODE_ENV !== "production") {
      console.error("[Register] Error:", error.message, error.stack);
    } else {
      console.error("[Register] Error:", error.message);
    }

    // Handle MongoDB duplicate key error (in case of race condition)
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Return sanitized error message
    return res.status(500).json({ error: "Failed to create account. Please try again." });
  }
}
