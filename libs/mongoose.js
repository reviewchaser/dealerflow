import mongoose from "mongoose";

// Connection options for better reliability with MongoDB Atlas on Vercel
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// Track connection state
let isConnecting = false;
let connectionPromise = null;

const connectMongo = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Connection in progress - wait for it
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = (async () => {
    try {
      // Close any stale connection
      if (mongoose.connection.readyState === 2) {
        await mongoose.connection.close();
      }

      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/dealerflow",
        connectionOptions
      );
      console.log("✅ MongoDB Connected");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      // Reset state on failure to allow retry
      isConnecting = false;
      connectionPromise = null;
      throw error;
    } finally {
      isConnecting = false;
    }
  })();

  return connectionPromise;
};

export default connectMongo;
