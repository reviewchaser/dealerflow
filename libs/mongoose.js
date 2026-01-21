import mongoose from "mongoose";

// Connection options for better reliability with MongoDB Atlas on Vercel
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
};

const connectMongo = async () => {
  // Already connected or connecting
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/dealerflow",
      connectionOptions
    );
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export default connectMongo;
