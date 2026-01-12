// /pages/api/ai/case-review.js

import connectMongo from "@/libs/mongoose";
import { withDealerContext } from "@/libs/authContext";
import { getOpenAIClient, safeJsonParse } from "@/libs/openai";

import AftercareCase from "@/models/AftercareCase";
import AftercareCaseComment from "@/models/AftercareCaseComment";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import FormSubmission from "@/models/FormSubmission";

function clampArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [String(v)].filter(Boolean);
}

async function handler(req, res, ctx) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OpenAI not configured. Please set OPENAI_API_KEY in .env.local and restart the server.",
    });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return res.status(500).json({ error: "OpenAI client not available" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;

  const { caseId, regenerate = false } = req.body || {};
  if (!caseId) return res.status(400).json({ error: "caseId is required" });

  // Load the aftercare case
  const aftercareCase = await AftercareCase.findOne({ _id: caseId, dealerId })
    .populate("contactId", "name email phone")
    .populate("vehicleId", "make model regCurrent year mileage fuelType engineSize")
    .lean();

  if (!aftercareCase) return res.status(404).json({ error: "Case not found" });

  // If already generated and not regenerating, return cached
  if (aftercareCase.aiReview?.payload && !regenerate) {
    return res.status(200).json({
      ok: true,
      cached: true,
      aiReview: aftercareCase.aiReview,
    });
  }

  // Comments (useful context)
  const comments = await AftercareCaseComment.find({ aftercareCaseId: caseId })
    .sort({ createdAt: 1 })
    .lean();

  // If linked to a vehicle, include recent tasks/issues
  let recentTasks = [];
  let recentIssues = [];
  if (aftercareCase.vehicleId?._id) {
    recentTasks = await VehicleTask.find({ vehicleId: aftercareCase.vehicleId._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    recentIssues = await VehicleIssue.find({ vehicleId: aftercareCase.vehicleId._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();
  } else if (aftercareCase.vehicleId) {
    // In case it wasn't populated correctly for some reason
    const v = await Vehicle.findById(aftercareCase.vehicleId).lean();
    if (v?._id) {
      recentTasks = await VehicleTask.find({ vehicleId: v._id }).sort({ updatedAt: -1 }).limit(10).lean();
      recentIssues = await VehicleIssue.find({ vehicleId: v._id }).sort({ updatedAt: -1 }).limit(10).lean();
    }
  }

  // Linked form submissions (optional)
  let linkedSubmissions = [];
  if (aftercareCase.linkedSubmissionIds?.length) {
    linkedSubmissions = await FormSubmission.find({ _id: { $in: aftercareCase.linkedSubmissionIds } })
      .populate("formId", "name")
      .lean();
  }

  const customer = aftercareCase.contactId || {};
  const vehicle = aftercareCase.vehicleId || {};

  const issueText =
    aftercareCase.details?.issueDescription ||
    aftercareCase.issueDescription ||
    aftercareCase.summary ||
    aftercareCase.details?.description ||
    "No description provided";

  const daysOpen = Math.floor(
    (Date.now() - new Date(aftercareCase.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const context = {
    customer: {
      name: customer.name || "Unknown",
      email: customer.email || null,
      phone: customer.phone || null,
    },
    vehicle: {
      make: vehicle.make || aftercareCase.details?.vehicleMake || "Unknown",
      model: vehicle.model || aftercareCase.details?.vehicleModel || "",
      reg: aftercareCase.regAtPurchase || vehicle.regCurrent || "Unknown",
      year: vehicle.year || null,
      mileage: vehicle.mileage || aftercareCase.details?.mileageAtPurchase || null,
      fuelType: vehicle.fuelType || null,
      engineSize: vehicle.engineSize || null,
    },
    case: {
      warrantyType: aftercareCase.warrantyType || "Dealer Warranty",
      source: aftercareCase.source || "Manual",
      priority: aftercareCase.priority || "normal",
      status: aftercareCase.boardStatus || "not_booked_in",
      repairLocation: aftercareCase.repairLocationType || "WITH_CUSTOMER",
      partsRequired: !!aftercareCase.partsRequired,
      partsDetails: aftercareCase.partsDetails || aftercareCase.partsNotes || null,
      courtesyRequired: !!aftercareCase.courtesyRequired,
      purchaseDate: aftercareCase.purchaseDate || aftercareCase.details?.dateOfPurchase || null,
      daysOpen,
    },
    issueReported: issueText,
    recentComments: comments.slice(-6).map((c) => ({
      text: (c.text || "").slice(0, 700),
      isInternal: !!c.isInternal,
      createdAt: c.createdAt,
    })),
    recentVehicleTasks: recentTasks.slice(0, 10).map((t) => ({
      name: t.name,
      status: t.status,
      notes: t.notes ? String(t.notes).slice(0, 400) : null,
    })),
    recentVehicleIssues: recentIssues.slice(0, 10).map((i) => ({
      category: i.category,
      subcategory: i.subcategory,
      description: i.description ? String(i.description).slice(0, 400) : "",
      status: i.status,
    })),
    linkedSubmissions: linkedSubmissions.slice(0, 5).map((s) => {
      const formName = s.formId?.name || "Form";
      const answers = s.rawAnswers && typeof s.rawAnswers === "object" ? s.rawAnswers : {};
      const keyPairs = Object.entries(answers)
        .filter(([k]) => !k.startsWith("_"))
        .slice(0, 15)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
      return { formName, keyAnswers: keyPairs };
    }),
  };

  const prompt = `
You are an expert automotive aftersales/warranty specialist working for a UK car dealership.

Analyse this aftersales/warranty case and produce guidance that a service advisor can use.

You MUST return valid JSON ONLY (no markdown, no commentary) with EXACTLY these keys:
{
  "summary": "2-3 sentence summary of what’s happening and current status",
  "possibleCauses": ["2-5 plausible causes, cautious language"],
  "recommendedSteps": ["2-6 practical next steps for the dealership"],
  "warrantyConsiderations": ["2-5 points about warranty coverage / evidence needed / exclusions"],
  "draftCustomerReply": "A short professional UK-tone customer message. Must advise customer not to undertake work without dealer authorisation.",
  "draftInternalNote": "Internal staff note summarising facts + what to do next"
}

Case context (JSON):
${JSON.stringify(context, null, 2)}

Rules:
- Use cautious language: may, could, possible, suggests
- Be specific to the vehicle and issue where possible
- Customer reply must be empathetic and must include: do not authorise/undertake repairs without dealer approval
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Return JSON only. No markdown. No extra keys.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    let payload;
    try {
      payload = safeJsonParse(raw);
    } catch (parseError) {
      console.error("AI returned non-JSON:", raw);
      return res.status(500).json({ error: "AI returned invalid JSON. Try again." });
    }

    // normalize / validate shape defensively
    const normalized = {
      summary: payload.summary ? String(payload.summary).trim() : "",
      possibleCauses: clampArray(payload.possibleCauses),
      recommendedSteps: clampArray(payload.recommendedSteps),
      warrantyConsiderations: clampArray(payload.warrantyConsiderations),
      draftCustomerReply: payload.draftCustomerReply ? String(payload.draftCustomerReply).trim() : "",
      draftInternalNote: payload.draftInternalNote ? String(payload.draftInternalNote).trim() : "",
    };

    const aiReview = {
      payload: normalized,
      generatedAt: new Date(),
      generatedByUserId: userId,
      model: "gpt-4o-mini",
    };

    const event = {
      type: "AI_REVIEW_GENERATED",
      createdAt: new Date(),
      createdByUserId: userId,
      summary: "AI case review generated",
    };

    await AftercareCase.updateOne(
      { _id: caseId, dealerId },
      {
        $set: { aiReview },
        $push: { events: event },
      }
    );

    return res.status(200).json({
      ok: true,
      cached: false,
      aiReview,
    });
  } catch (err) {
    console.error("OpenAI case-review error:", err);
    return res.status(500).json({ error: "Failed to generate AI review" });
  }
}

export default withDealerContext(handler);
