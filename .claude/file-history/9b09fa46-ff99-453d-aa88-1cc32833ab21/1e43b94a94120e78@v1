import connectMongo from "@/libs/mongoose";
import FormSubmission from "@/models/FormSubmission";
import FormSubmissionFile from "@/models/FormSubmissionFile";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    // Delete all submission files first
    const filesResult = await FormSubmissionFile.deleteMany({});

    // Delete all submissions
    const submissionsResult = await FormSubmission.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "All form submissions cleared",
      deletedSubmissions: submissionsResult.deletedCount,
      deletedFiles: filesResult.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing submissions:", error);
    return res.status(500).json({ error: error.message });
  }
}
