/**
 * AI Warranty Suggestions API
 *
 * POST - Generate AI suggestions for warranty/aftercare cases
 * Returns structured JSON with diagnostic guidance
 */

import { withDealerContext } from "@/libs/authContext";
import { callOpenAI, UK_DEALER_CONTEXT } from "@/libs/openai";

const SYSTEM_PROMPT = `${UK_DEALER_CONTEXT}

You are helping diagnose a warranty claim or aftercare issue. Based on the information provided, generate practical diagnostic suggestions.

CRITICAL: You must respond with ONLY valid JSON. No markdown, no code fences, no prose outside the JSON.
The JSON must have exactly these 5 keys:
- suspected_issues: array of {title, why, urgency} where urgency is "low", "med", or "high"
- checks_to_run: array of {step, tools, time_estimate_mins}
- questions_for_customer: array of {question, why}
- parts_to_consider: array of {part, notes}
- safety_notes: array of {note}

Rules:
- If you don't have enough information, populate questions_for_customer instead of guessing
- Be practical and cost-conscious (used car dealer context)
- Time estimates should be realistic workshop times
- Always include relevant safety considerations
- Maximum 5 items per array`;

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    vehicleMake,
    vehicleModel,
    vehicleYear,
    mileage,
    fuelType,
    symptomDescription,
    faultCodes,
    warrantyType,
    additionalContext,
  } = req.body;

  if (!symptomDescription) {
    return res.status(400).json({ error: "Symptom description is required" });
  }

  // Build context for AI
  const contextParts = [];

  if (vehicleMake || vehicleModel) {
    contextParts.push(`Vehicle: ${[vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ")}`);
  }
  if (mileage) {
    contextParts.push(`Mileage: ${mileage}`);
  }
  if (fuelType) {
    contextParts.push(`Fuel type: ${fuelType}`);
  }
  if (warrantyType) {
    contextParts.push(`Warranty: ${warrantyType}`);
  }
  if (faultCodes) {
    contextParts.push(`Fault codes: ${faultCodes}`);
  }
  if (additionalContext) {
    contextParts.push(`Additional info: ${additionalContext}`);
  }

  const userPrompt = `Please analyse this warranty/aftercare issue and provide diagnostic suggestions.

${contextParts.length > 0 ? "VEHICLE & CONTEXT:\n" + contextParts.join("\n") + "\n\n" : ""}REPORTED SYMPTOMS:
${symptomDescription}

Generate your response as valid JSON with the exact schema specified.`;

  const result = await callOpenAI(SYSTEM_PROMPT, userPrompt);

  if (result.isDummy) {
    return res.status(200).json({
      success: true,
      isDummy: true,
      message: result.error || "AI not configured - showing placeholder",
      suggestions: result.data,
    });
  }

  return res.status(200).json({
    success: true,
    isDummy: false,
    suggestions: result.data,
  });
}

export default withDealerContext(handler);
