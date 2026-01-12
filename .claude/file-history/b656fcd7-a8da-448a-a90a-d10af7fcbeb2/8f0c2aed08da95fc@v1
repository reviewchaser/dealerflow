import connectMongo from "@/libs/mongoose";
import AIHintCache from "@/models/AIHintCache";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { getOpenAIClient, safeJsonParse } from "@/libs/openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await connectMongo();

    const { make, model, year, engineSize, fuelType, mileage } = req.body;

    if (!make || !model) {
      return res.status(400).json({ error: "Make and model are required" });
    }

    // Try to find cached hints
    const cached = await AIHintCache.findOne({
      make: { $regex: new RegExp(`^${make}$`, "i") },
      model: { $regex: new RegExp(`^${model}$`, "i") },
      engineSize: engineSize || null,
      fuelType: fuelType || null,
      yearFrom: { $lte: year || 9999 },
      yearTo: { $gte: year || 0 },
    });

    if (cached) {
      // Parse hintsText into array of hints
      const hintsArray = parseHintsToArray(cached.hintsText);
      return res.status(200).json({
        hints: hintsArray,
        source: "cache",
        isDummy: false,
      });
    }

    // Generate new hints using OpenAI
    const hintsText = await generateHints({ make, model, year, engineSize, fuelType, mileage });

    // Cache the result
    await AIHintCache.create({
      make,
      model,
      engineSize: engineSize || null,
      fuelType: fuelType || null,
      yearFrom: year ? year - 2 : 0,
      yearTo: year ? year + 2 : 9999,
      hintsText,
    });

    // Parse hintsText into array of hints
    const hintsArray = parseHintsToArray(hintsText);
    return res.status(200).json({
      hints: hintsArray,
      source: "ai",
      isDummy: !process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error("Error generating AI hints:", error);
    return res.status(500).json({ error: "Failed to generate hints" });
  }
}

// Parse hints text (bullet points or newlines) into an array
function parseHintsToArray(hintsText) {
  if (!hintsText) return [];
  if (Array.isArray(hintsText)) return hintsText;

  // Split by newlines and filter out empty lines
  return hintsText
    .split(/\n/)
    .map(line => line.replace(/^[•\-\*]\s*/, "").trim()) // Remove bullet characters
    .filter(line => line.length > 0);
}

async function generateHints({ make, model, year, engineSize, fuelType, mileage }) {
  const openai = getOpenAIClient();

  if (!openai) {
    // Return generic hints if no API key
    return `Common things to check on ${make} ${model}:\n• Service history and MOT history\n• Brake pads and discs condition\n• Tyre tread depth and condition\n• Fluid levels (oil, coolant, brake fluid)\n• Electrical systems and warning lights\n• Previous accident or bodywork damage`;
  }

  const prompt = `You are an expert automotive technician. A used car dealer in the UK is appraising a ${year || ""} ${make} ${model}${engineSize ? ` ${engineSize}` : ""}${fuelType ? ` ${fuelType}` : ""}${mileage ? ` with ${mileage} miles` : ""}.

Please provide 3-6 specific, actionable things the appraiser should check for this vehicle, focusing on:
- Common issues or faults specific to this make/model
- Expensive repairs this model is known for
- Critical wear items to inspect
- Known recalls or common problems

Format your response as a simple bullet list using • as bullets. Be concise and specific to this vehicle.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices?.[0]?.message?.content || getGenericHints(make, model);
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Return generic hints as fallback
    return getGenericHints(make, model);
  }
}

function getGenericHints(make, model) {
  return `Common things to check on ${make} ${model}:\n• Service history and MOT history\n• Brake pads and discs condition\n• Tyre tread depth and condition\n• Fluid levels (oil, coolant, brake fluid)\n• Electrical systems and warning lights\n• Previous accident or bodywork damage`;
}
