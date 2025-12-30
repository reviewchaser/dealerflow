import connectMongo from "@/libs/mongoose";
import { withDealerContext } from "@/libs/authContext";
import { getOpenAIClient, safeJsonParse } from "@/libs/openai";

// CHANGE THIS import if your model name differs:
import Appraisal from "@/models/Appraisal";

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
  const { appraisalId, regenerate } = req.body || {};

  if (!appraisalId) {
    return res.status(400).json({ error: "appraisalId is required" });
  }

  try {
    const appraisal = await Appraisal.findOne({ _id: appraisalId, dealerId }).lean();

    if (!appraisal) {
      return res.status(404).json({ error: "Appraisal not found" });
    }

    // Return cached unless regenerate
    if (appraisal.aiSummary?.payload && !regenerate) {
      return res.status(200).json({
        ok: true,
        summary: appraisal.aiSummary.payload,
        cached: true,
        generatedAt: appraisal.aiSummary.generatedAt,
      });
    }

    // Build compact input context (adjust field names to match your model)
    const context = {
      vrm: appraisal.vrm || appraisal.reg || null,
      make: appraisal.make || null,
      model: appraisal.model || null,
      derivative: appraisal.derivative || null,
      year: appraisal.year || null,
      fuel: appraisal.fuel || null,
      mileage: appraisal.mileage || null,
      transmission: appraisal.transmission || null,
      owners: appraisal.owners || null,
      serviceHistory: appraisal.serviceHistory || appraisal.service || null,
      motExpiry: appraisal.motExpiry || null,
      conditionNotes: (appraisal.conditionNotes || appraisal.notes || "").slice(0, 2000),
      // If you store issues/damage from appraisal
      issues: (appraisal.issues || []).slice(0, 20),
      photosCount: Array.isArray(appraisal.photos) ? appraisal.photos.length : null,
      source: appraisal.source || null,
    };

    const prompt = `You are a UK used car dealer appraisal assistant.
Return VALID JSON only.

You are helping a dealer decide what to pay for a vehicle and what prep is likely needed.
Be practical, conservative, and avoid guessing specific prices unless data supports it.

APPRAISAL DATA:
${JSON.stringify(context, null, 2)}

Respond with JSON:
{
  "overallAssessment": "Short paragraph",
  "keyPositives": ["0-6 bullets"],
  "keyNegatives": ["0-10 bullets"],
  "recommendedChecks": ["0-8 bullets"],
  "reconditioningJobs": [
    { "title": "Job", "why": "Reason", "roughCostBand": "£ | ££ | £££" }
  ],
  "pricingNotes": ["0-6 bullets"],
  "recommendedDecision": "BUY | BUY_IF_PRICE_RIGHT | AVOID",
  "confidence": "LOW | MED | HIGH"
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
      temperature: 0.6,
      max_tokens: 1100,
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

    await Appraisal.updateOne(
      { _id: appraisalId, dealerId },
      {
        $set: {
          aiSummary: {
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
    console.error("Error generating appraisal summary:", error);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
}

export default withDealerContext(handler);
