import connectMongo from "@/libs/mongoose";
import mongoose from "mongoose";
import Form from "@/models/Form";
import FormSubmission from "@/models/FormSubmission";
import Dealer from "@/models/Dealer";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    let { dealerId } = req.query;

    // If no valid dealerId provided, get the first dealer
    if (!dealerId || dealerId === "000000000000000000000000") {
      const firstDealer = await Dealer.findOne().lean();
      if (firstDealer) {
        dealerId = firstDealer._id;
      } else {
        return res.status(400).json({ error: "No dealer found" });
      }
    } else {
      dealerId = new mongoose.Types.ObjectId(dealerId);
    }

    // Get all forms
    const forms = await Form.find({ dealerId });
    const totalForms = forms.length;
    const publicForms = forms.filter(f => f.isPublic).length;

    // Get all submissions
    const submissions = await FormSubmission.find({
      dealerId,
    }).populate("formId");
    const totalSubmissions = submissions.length;

    // Get submissions this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const submissionsThisWeek = submissions.filter(
      s => new Date(s.submittedAt) >= oneWeekAgo
    ).length;

    // Get forms by type with submission counts
    const formsByType = [];
    const formTypes = [...new Set(forms.map(f => f.type))];

    for (const type of formTypes) {
      const typeForms = forms.filter(f => f.type === type);
      const typeFormIds = typeForms.map(f => f._id.toString());
      const typeSubmissions = submissions.filter(s =>
        typeFormIds.includes(s.formId?._id?.toString())
      );

      const latestSubmission = typeSubmissions.length > 0
        ? typeSubmissions.reduce((a, b) =>
            new Date(a.submittedAt) > new Date(b.submittedAt) ? a : b
          ).submittedAt
        : null;

      formsByType.push({
        _id: type,
        count: typeForms.length,
        submissions: typeSubmissions.length,
        lastSubmission: latestSubmission,
      });
    }

    // Get recent submissions (last 10)
    const recentSubmissions = await FormSubmission.find({ dealerId })
      .populate("formId")
      .sort({ submittedAt: -1 })
      .limit(10);

    return res.status(200).json({
      totalForms,
      totalSubmissions,
      submissionsThisWeek,
      publicForms,
      formsByType,
      recentSubmissions,
    });
  } catch (error) {
    console.error("Error fetching form stats:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}
