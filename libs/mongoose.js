import mongoose from "mongoose";

// Connection options optimized for serverless (Vercel) + MongoDB Atlas Flex tier
// Flex tier has limited connections - keep pool small to avoid exhaustion
const connectionOptions = {
  maxPoolSize: 1, // Reduced from 10 - serverless functions are short-lived
  minPoolSize: 0, // Allow pool to fully close when idle
  maxIdleTimeMS: 10000, // Close idle connections after 10 seconds
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// Cache connection promise to reuse across hot reloads in development
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectMongo = async () => {
  // Return cached connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // If already connecting, wait for that promise
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Create new connection
  cached.promise = mongoose
    .connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/dealerflow",
      connectionOptions
    )
    .then((mongoose) => {
      console.log("✅ MongoDB Connected (poolSize: 1)");
      return mongoose;
    })
    .catch((error) => {
      cached.promise = null; // Reset on error so next call retries
      console.error("❌ MongoDB connection error:", error);
      throw error;
    });

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectMongo;
