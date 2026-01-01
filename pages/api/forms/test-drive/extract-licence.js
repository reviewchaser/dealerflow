/**
 * Extract Driving Licence Details via OpenAI Vision API
 *
 * POST /api/forms/test-drive/extract-licence
 *
 * Accepts a base64-encoded image of a UK driving licence and extracts
 * key details using OpenAI's vision model.
 *
 * Request body:
 * - image: base64-encoded image data (required)
 * - mimeType: image MIME type (optional, defaults to image/jpeg)
 *
 * Response:
 * - ok: boolean
 * - data: extracted fields if successful
 * - error: error message if failed
 */

import { withDealerContext } from "@/libs/authContext";
import { getOpenAIClient, getAIConfig } from "@/libs/openai";

const EXTRACTION_PROMPT = `You are an expert at reading UK driving licences. Analyse this image of a UK driving licence and extract the following information.

Return ONLY valid JSON with exactly these keys:
{
  "fullName": "The full name as shown on the licence (first name and surname)",
  "firstName": "The first name only",
  "lastName": "The surname/family name only",
  "dateOfBirth": "Date of birth in YYYY-MM-DD format if visible",
  "addressLine1": "First line of address",
  "addressLine2": "Second line of address (empty string if none)",
  "town": "Town/city name",
  "postcode": "Postcode",
  "licenceNumber": "The driving licence number (the long alphanumeric code)",
  "issueDate": "Issue date in YYYY-MM-DD format if visible (section 4a)",
  "expiryDate": "Expiry date in YYYY-MM-DD format if visible (section 4b)",
  "confidence": "HIGH, MEDIUM, or LOW - your confidence in the extraction accuracy",
  "missingFields": ["array of field names that could not be extracted"]
}

Important rules:
- Only extract what you can clearly read - do not guess
- For dates, use ISO format YYYY-MM-DD
- If a field is not visible or readable, use null and add it to missingFields
- The licence number is in section 5 and is usually 16+ characters
- UK postcodes are in format like "SW1A 1AA" or "M1 1AA"
- Return ONLY the JSON object, no markdown or explanations`;

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { isConfigured } = getAIConfig();
  if (!isConfigured) {
    return res.status(200).json({
      ok: false,
      errorCode: "NOT_CONFIGURED",
      error: "AI service is not configured. Please contact your administrator.",
    });
  }

  const client = getOpenAIClient();
  if (!client) {
    return res.status(200).json({
      ok: false,
      errorCode: "CLIENT_ERROR",
      error: "AI service is temporarily unavailable.",
    });
  }

  const { image, mimeType = "image/jpeg" } = req.body;

  if (!image) {
    return res.status(400).json({
      ok: false,
      error: "No image provided. Please upload a driving licence image.",
    });
  }

  // Validate base64 data
  if (typeof image !== "string" || image.length < 100) {
    return res.status(400).json({
      ok: false,
      error: "Invalid image data. Please upload a valid image.",
    });
  }

  try {
    // Prepare the image URL - support both raw base64 and data URLs
    let imageUrl = image;
    if (!image.startsWith("data:")) {
      imageUrl = `data:${mimeType};base64,${image}`;
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({
        ok: false,
        error: "Could not extract details from this image. Please try a clearer photo or enter details manually.",
      });
    }

    // Parse the JSON response
    let extracted;
    try {
      // Clean up the response - remove any markdown code fences
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      extracted = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("[Licence Extract] Failed to parse AI response:", content);
      return res.status(200).json({
        ok: false,
        error: "Could not read the licence details. Please try a clearer photo or enter details manually.",
      });
    }

    // Validate the extracted data has at least some useful fields
    const hasMinimumData =
      extracted.fullName ||
      extracted.firstName ||
      extracted.addressLine1 ||
      extracted.licenceNumber;

    if (!hasMinimumData) {
      return res.status(200).json({
        ok: false,
        error: "Could not extract enough details from this image. Please try a clearer photo or enter details manually.",
        data: extracted,
      });
    }

    // Return successful extraction
    return res.status(200).json({
      ok: true,
      data: {
        fullName: extracted.fullName || null,
        firstName: extracted.firstName || null,
        lastName: extracted.lastName || null,
        dateOfBirth: extracted.dateOfBirth || null,
        addressLine1: extracted.addressLine1 || null,
        addressLine2: extracted.addressLine2 || null,
        town: extracted.town || null,
        postcode: extracted.postcode || null,
        licenceNumber: extracted.licenceNumber || null,
        issueDate: extracted.issueDate || null,
        expiryDate: extracted.expiryDate || null,
        confidence: extracted.confidence || "MEDIUM",
        missingFields: extracted.missingFields || [],
      },
    });
  } catch (error) {
    console.error("[Licence Extract] Error:", error.message, error.status);

    if (error.status === 401) {
      return res.status(200).json({
        ok: false,
        errorCode: "AUTH_FAILED",
        error: "AI authentication failed. Please contact your administrator.",
      });
    }

    if (error.status === 429) {
      return res.status(200).json({
        ok: false,
        errorCode: "RATE_LIMIT",
        error: "Too many requests. Please wait a moment and try again.",
      });
    }

    return res.status(200).json({
      ok: false,
      error: "Failed to process the licence image. Please try again or enter details manually.",
    });
  }
}

export default withDealerContext(handler);
