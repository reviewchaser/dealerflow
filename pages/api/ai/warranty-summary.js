import connectMongo from "@/libs/mongoose";
import AftercareCase from "@/models/AftercareCase";
import AftercareCaseComment from "@/models/AftercareCaseComment";
import { withDealerContext } from "@/libs/authContext";
import { getOpenAIClient, safeJsonParse } from "@/libs/openai";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
  const { caseId, regenerate } = req.body || {};

  if (!caseId) {
    return res.status(400).json({ error: "caseId is required" });
  }

  try {
    // Fetch the case with all details (scoped to dealer)
    const aftercareCase = await AftercareCase.findOne({ _id: caseId, dealerId })
      .populate("contactId", "name email phone")
      .populate("vehicleId", "make model regCurrent year mileage")
      .lean();

    if (!aftercareCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    // Return cached AI review unless explicitly regenerating
    if (aftercareCase.aiReview?.payload && !regenerate) {
      return res.status(200).json({
        ok: true,
        summary: aftercareCase.aiReview.payload,
        cached: true,
        generatedAt: aftercareCase.aiReview.generatedAt,
      });
    }

    // Fetch comments for additional context (dealer scoped)
    const comments = await AftercareCaseComment.find({
      aftercareCaseId: caseId,
      dealerId,
    })
      .sort({ createdAt: 1 })
      .lean();

    // Build compact context for AI (cap lengths to control tokens/cost)
    const safeIssue =
      (aftercareCase.details?.issueDescription ||
        aftercareCase.issueDescription ||
        "No description provided") + "";

    const caseContext = {
      customer: aftercareCase.contactId?.name || "Unknown customer",
      customerEmail: aftercareCase.contactId?.email || null,
      customerPhone: aftercareCase.contactId?.phone || null,
      vehicle: {
        make:
          aftercareCase.vehicleId?.make ||
          aftercareCase.details?.vehicleMake ||
          "Unknown",
        model:
          aftercareCase.vehicleId?.model ||
          aftercareCase.details?.vehicleModel ||
          "",
        reg:
          aftercareCase.regAtPurchase ||
          aftercareCase.vehicleId?.regCurrent ||
          "Unknown",
        year: aftercareCase.vehicleId?.year || null,
        mileage:
          aftercareCase.vehicleId?.mileage ||
          aftercareCase.details?.mileageAtPurchase ||
          null,
      },
      issue: safeIssue.slice(0, 2000),
      source: aftercareCase.source || "Manual",
      priority: aftercareCase.priority || "normal",
      status: aftercareCase.boardStatus || "not_booked_in",
      warrantyType: aftercareCase.warrantyType || "Dealer Warranty",
      purchaseDate:
        aftercareCase.purchaseDate || aftercareCase.details?.dateOfPurchase || null,
      daysOpen: Math.floor(
        (Date.now() - new Date(aftercareCase.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      repairLocation: aftercareCase.repairLocationType || "WITH_CUSTOMER",
      partsRequired: !!aftercareCase.partsRequired,
      partsDetails: aftercareCase.partsDetails || null,
      courtesyRequired: !!aftercareCase.courtesyRequired,
      timeline: (aftercareCase.events || [])
        .slice(-10)
        .map((e) => ({
          type: e.type,
          summary: (e.summary || "").slice(0, 200),
          date: e.createdAt,
        })),
      comments: (comments || [])
        .slice(-5)
        .map((c) => ({
          text: (c.text || "").slice(0, 400),
          isInternal: !!c.isInternal,
          date: c.createdAt,
        })),
    };

    const prompt = `You are an expert automotive warranty/aftersales case analyst for a UK car dealership.
Return VALID JSON only (no markdown, no extra commentary).

CASE DETAILS:
- Customer: ${caseContext.customer}
- Vehicle: ${caseContext.vehicle.year || ""} ${caseContext.vehicle.make} ${caseContext.vehicle.model} (${caseContext.vehicle.reg})
- Mileage: ${caseContext.vehicle.mileage || "Unknown"}
- Purchase Date: ${
      caseContext.purchaseDate
        ? new Date(caseContext.purchaseDate).toLocaleDateString()
        : "Unknown"
    }
- Warranty Type: ${caseContext.warrantyType}
- Days Open: ${caseContext.daysOpen}
- Priority: ${caseContext.priority}
- Current Status: ${caseContext.status}
- Repair Location: ${caseContext.repairLocation}
- Parts Required: ${caseContext.partsRequired ? "Yes" : "No"}
${caseContext.partsDetails ? `- Parts Details: ${caseContext.partsDetails}` : ""}
- Courtesy Car Required: ${caseContext.courtesyRequired ? "Yes" : "No"}

ISSUE REPORTED:
${caseContext.issue}

${
  caseContext.comments.length > 0
    ? `RECENT COMMENTS:
${caseContext.comments
  .map((c) => `- ${c.text} (${c.isInternal ? "Internal" : "Customer"})`)
  .join("\n")}`
    : ""
}

${
  caseContext.timeline.length > 0
    ? `RECENT ACTIVITY:
${caseContext.timeline.map((t) => `- ${t.summary}`).join("\n")}`
    : ""
}

Respond with JSON:
{
  "summary": "2-3 sentence summary of the case and current status",
  "assessment": "Is this likely warranty, wear & tear, customer misuse, etc. (keep balanced)",
  "recommendedActions": ["2-5 concrete next steps in order"],
  "estimatedComplexity": "LOW | MEDIUM | HIGH",
  "riskLevel": "LOW | MEDIUM | HIGH",
  "draftCustomerReply": "Short empathetic UK customer message (2-4 sentences)",
  "draftInternalNote": "Short internal note for staff"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Return JSON only. No markdown. No extra keys.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices?.[0]?.message?.content || "";
    let aiResponse;
    try {
      aiResponse = safeJsonParse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", responseText);
      return res.status(500).json({ error: "Failed to parse AI response JSON" });
    }

    const generatedAt = new Date();

    // Store result on the case
    await AftercareCase.updateOne(
      { _id: caseId, dealerId },
      {
        $set: {
          aiReview: {
            payload: aiResponse,
            generatedAt,
            generatedByUserId: userId,
          },
        },
      }
    );

    return res.status(200).json({
      ok: true,
      summary: aiResponse,
      cached: false,
      generatedAt: generatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error generating warranty summary:", error);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
}

export default withDealerContext(handler);
