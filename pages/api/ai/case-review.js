import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import FormSubmission from "@/models/FormSubmission";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId, userId } = ctx;
  const { caseId } = req.body;

  if (!caseId) {
    return res.status(400).json({ error: "caseId is required" });
  }

  // Load case with populated fields
  const aftercareCase = await AftercareCase.findOne({ _id: caseId, dealerId })
    .populate("contactId")
    .populate("vehicleId")
    .lean();

  if (!aftercareCase) {
    return res.status(404).json({ error: "Case not found" });
  }

  // Build context for AI prompt
  const contextParts = [];

  // Customer info
  const contact = aftercareCase.contactId;
  if (contact) {
    contextParts.push(`Customer: ${contact.name || "Unknown"}`);
  }

  // Vehicle info
  const vehicle = aftercareCase.vehicleId;
  if (vehicle) {
    const vehicleInfo = [
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.engineSize,
      vehicle.fuelType,
      vehicle.mileage ? `${vehicle.mileage} miles` : null,
    ].filter(Boolean).join(" ");
    contextParts.push(`Vehicle: ${vehicleInfo}`);
    contextParts.push(`Registration: ${aftercareCase.regAtPurchase || vehicle.regCurrent || "Unknown"}`);
  } else if (aftercareCase.regAtPurchase) {
    contextParts.push(`Registration at purchase: ${aftercareCase.regAtPurchase}`);
  }

  // Warranty type
  if (aftercareCase.warrantyType) {
    contextParts.push(`Warranty type: ${aftercareCase.warrantyType}`);
  }

  // Issue summary/description
  if (aftercareCase.summary) {
    contextParts.push(`Issue summary: ${aftercareCase.summary}`);
  }

  // Details (may contain fault codes or additional info)
  if (aftercareCase.details) {
    if (typeof aftercareCase.details === "object") {
      if (aftercareCase.details.faultCodes) {
        contextParts.push(`Fault codes: ${aftercareCase.details.faultCodes}`);
      }
      if (aftercareCase.details.description) {
        contextParts.push(`Description: ${aftercareCase.details.description}`);
      }
    } else if (typeof aftercareCase.details === "string") {
      contextParts.push(`Details: ${aftercareCase.details}`);
    }
  }

  // Case attachments count
  const caseAttachmentCount = aftercareCase.attachments?.length || 0;
  if (caseAttachmentCount > 0) {
    const filenames = aftercareCase.attachments.map(a => a.filename).filter(Boolean).join(", ");
    contextParts.push(`Case attachments: ${caseAttachmentCount} file(s)${filenames ? ` (${filenames})` : ""}`);
  }

  // If linked to a vehicle, get recent tasks and issues
  if (vehicle?._id) {
    const recentTasks = await VehicleTask.find({ vehicleId: vehicle._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    if (recentTasks.length > 0) {
      const taskSummary = recentTasks.map(t =>
        `${t.name}: ${t.status}${t.notes ? ` - ${t.notes}` : ""}`
      ).join("; ");
      contextParts.push(`Recent vehicle tasks: ${taskSummary}`);
    }

    const recentIssues = await VehicleIssue.find({ vehicleId: vehicle._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    if (recentIssues.length > 0) {
      const issueSummary = recentIssues.map(i =>
        `${i.category}/${i.subcategory}: ${i.description} (${i.status})`
      ).join("; ");
      contextParts.push(`Recent vehicle issues: ${issueSummary}`);
    }
  }

  // If linked to form submissions, include key answers
  if (aftercareCase.linkedSubmissionIds?.length > 0) {
    const submissions = await FormSubmission.find({
      _id: { $in: aftercareCase.linkedSubmissionIds }
    }).populate("formId").lean();

    for (const sub of submissions) {
      const formName = sub.formId?.name || "Form";
      if (sub.rawAnswers && typeof sub.rawAnswers === "object") {
        // Extract key fields (skip internal fields)
        const keyAnswers = Object.entries(sub.rawAnswers)
          .filter(([key]) => !key.startsWith("_"))
          .map(([key, val]) => `${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`)
          .slice(0, 15) // Limit to avoid token explosion
          .join("; ");
        if (keyAnswers) {
          contextParts.push(`${formName} submission: ${keyAnswers}`);
        }
      }
    }
  }

  // Build the AI prompt
  const contextText = contextParts.join("\n");

  const prompt = `You are an expert automotive warranty specialist working for a UK car dealership. Analyse the following warranty/aftercare case and provide guidance.

CASE CONTEXT:
${contextText}

You MUST respond with valid JSON only. No markdown code fences, no explanation, no text outside the JSON object.
Output exactly this structure with all 6 keys:
{
  "summary": "A concise 2-3 sentence summary of the case and the reported issue",
  "possibleCauses": ["Possible cause 1", "Possible cause 2", "..."],
  "recommendedSteps": ["1. First step to take", "2. Second step", "..."],
  "warrantyConsiderations": ["Consideration 1 about warranty coverage", "..."],
  "draftCustomerReply": "A polite UK-tone reply to the customer acknowledging their issue and advising them not to undertake any work without prior authorisation from the dealership",
  "draftInternalNote": "A brief internal note summarising the case for staff reference"
}

Requirements:
- Use cautious language: "possible", "may", "suggest", "could indicate"
- Keep the customer reply professional and empathetic
- The customer reply MUST advise not to undertake work without authorisation
- Provide 2-5 items for each array field
- Be specific to this vehicle and issue where possible`;

  // Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "AI service not configured. Please set ANTHROPIC_API_KEY environment variable."
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return res.status(500).json({ error: "AI service error. Please try again." });
    }

    const data = await response.json();
    const aiText = data.content?.[0]?.text;

    if (!aiText) {
      return res.status(500).json({ error: "No response from AI service" });
    }

    // Parse and validate JSON response
    let payload;
    try {
      // Clean up potential markdown code fences
      const cleanedText = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      payload = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("AI response parse error:", aiText);
      return res.status(500).json({
        error: "AI returned invalid response format. Please try again."
      });
    }

    // Validate required keys exist
    const requiredKeys = [
      "summary",
      "possibleCauses",
      "recommendedSteps",
      "warrantyConsiderations",
      "draftCustomerReply",
      "draftInternalNote"
    ];

    const missingKeys = requiredKeys.filter(key => !(key in payload));
    if (missingKeys.length > 0) {
      console.error("AI response missing keys:", missingKeys, payload);
      return res.status(500).json({
        error: `AI response missing required fields: ${missingKeys.join(", ")}`
      });
    }

    // Ensure arrays are arrays
    if (!Array.isArray(payload.possibleCauses)) payload.possibleCauses = [payload.possibleCauses].filter(Boolean);
    if (!Array.isArray(payload.recommendedSteps)) payload.recommendedSteps = [payload.recommendedSteps].filter(Boolean);
    if (!Array.isArray(payload.warrantyConsiderations)) payload.warrantyConsiderations = [payload.warrantyConsiderations].filter(Boolean);

    // Save to case document
    const aiReview = {
      generatedAt: new Date(),
      generatedByUserId: userId,
      payload
    };

    // Also add timeline event
    const event = {
      type: "AI_REVIEW_GENERATED",
      createdAt: new Date(),
      createdByUserId: userId,
      summary: "AI case review generated"
    };

    await AftercareCase.findByIdAndUpdate(caseId, {
      aiReview,
      $push: { events: event }
    });

    return res.status(200).json({
      success: true,
      aiReview
    });

  } catch (error) {
    console.error("AI case review error:", error);
    return res.status(500).json({ error: "Failed to generate AI review" });
  }
}

export default withDealerContext(handler);
