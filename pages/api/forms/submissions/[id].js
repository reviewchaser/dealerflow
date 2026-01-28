import connectMongo from "@/libs/mongoose";
import FormSubmission from "@/models/FormSubmission";
import FormSubmissionFile from "@/models/FormSubmissionFile";
import FormField from "@/models/FormField";
import Dealer from "@/models/Dealer";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      // Validate ID format
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid submission ID" });
      }

      const submission = await FormSubmission.findById(id)
        .populate("formId")
        .populate("submittedByContactId")
        .populate("linkedVehicleId")
        .populate("linkedVehicleSaleId")
        .populate("linkedAftercareCaseId")
        .lean();

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Get associated files
      const files = await FormSubmissionFile.find({ formSubmissionId: id }).lean();

      // Get form fields for proper display (only if formId exists)
      let fields = [];
      if (submission.formId && submission.formId._id) {
        fields = await FormField.find({ formId: submission.formId._id }).sort({ order: 1 }).lean();
      }

      // Get dealer info for PDF export
      const dealer = await Dealer.findOne().lean();

      return res.status(200).json({
        submission,
        files,
        fields,
        dealer: dealer ? { name: dealer.companyName || dealer.name, logoUrl: dealer.logoUrl, address: dealer.companyAddress, phone: dealer.companyPhone } : null,
      });
    } catch (error) {
      console.error("Error fetching submission:", error);
      return res.status(500).json({ error: "Failed to fetch submission: " + error.message });
    }
  }

  // PATCH - Mark as viewed or update status
  if (req.method === "PATCH") {
    try {
      // Auth optional for now - can be enabled when NextAuth is fully configured
      let session = null;
      try {
        session = await getServerSession(req, res, authOptions);
      } catch (e) {
        // Auth not configured, continue without session
      }

      const userId = session?.user?.id || null;

      // Validate ID format
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid submission ID" });
      }

      const { viewed, status } = req.body;
      const updateData = {};

      if (viewed !== undefined) {
        updateData.viewed = viewed;
        if (viewed && !updateData.viewedAt) {
          updateData.viewedAt = new Date();
          // Only add userId if it's a valid ObjectId
          if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
            updateData.viewedByUserId = userId;
          }
        }
      }

      if (status) {
        updateData.status = status;
        // Auto-set viewed when status changes from "new"
        if (status !== "new" && !updateData.viewed) {
          updateData.viewed = true;
          updateData.viewedAt = new Date();
          // Only add userId if it's a valid ObjectId
          if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
            updateData.viewedByUserId = userId;
          }
        }
      }

      const submission = await FormSubmission.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: false }
      ).populate("formId");

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      return res.status(200).json(submission);
    } catch (error) {
      console.error("Error updating submission:", error);
      return res.status(500).json({ error: "Failed to update submission: " + error.message });
    }
  }

  // PUT - Edit submission answers
  if (req.method === "PUT") {
    try {
      // Auth optional for now - can be enabled when NextAuth is fully configured
      let session = null;
      try {
        session = await getServerSession(req, res, authOptions);
      } catch (e) {
        // Auth not configured, continue without session
      }

      const userId = session?.user?.id || null;
      const userName = session?.user?.name || session?.user?.email || "System";

      const { rawAnswers } = req.body;

      if (!rawAnswers) {
        return res.status(400).json({ error: "rawAnswers required" });
      }

      // Validate ID format
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid submission ID" });
      }

      // Get current submission
      const currentSubmission = await FormSubmission.findById(id);
      if (!currentSubmission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Store previous answers in edit history (without userId if not available)
      const editEntry = {
        editedAt: new Date(),
        editedByName: userName,
        previousAnswers: currentSubmission.rawAnswers,
      };
      // Only add userId if it's a valid ObjectId
      if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
        editEntry.editedByUserId = userId;
      }

      // Build update object
      const updateObj = {
        rawAnswers,
        lastEditedAt: new Date(),
        lastEditedByName: userName,
      };
      // Only add userId if it's a valid ObjectId
      if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
        updateObj.lastEditedByUserId = userId;
      }

      const submission = await FormSubmission.findByIdAndUpdate(
        id,
        {
          ...updateObj,
          $push: { editHistory: editEntry },
        },
        { new: true, runValidators: false }
      ).populate("formId");

      return res.status(200).json(submission);
    } catch (error) {
      console.error("Error editing submission:", error);
      return res.status(500).json({ error: "Failed to edit submission: " + error.message });
    }
  }

  // DELETE - Delete submission
  if (req.method === "DELETE") {
    try {
      // Auth optional for now - can be enabled when NextAuth is fully configured
      // const session = await getServerSession(req, res, authOptions).catch(() => null);

      const submission = await FormSubmission.findByIdAndDelete(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Delete associated files
      await FormSubmissionFile.deleteMany({ formSubmissionId: id });

      return res.status(200).json({ message: "Submission deleted" });
    } catch (error) {
      console.error("Error deleting submission:", error);
      return res.status(500).json({ error: "Failed to delete submission" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
