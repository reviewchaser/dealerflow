/**
 * OpenAI Client Helper
 *
 * Server-side only helper for OpenAI API access.
 * Provides a singleton client and helper functions.
 */

import OpenAI from "openai";

// Singleton client - created once and reused
let _client = null;

/**
 * Get or create the OpenAI client singleton
 * Always call this function - don't use a top-level export
 * because env vars may not be available at module load time.
 * @returns {OpenAI | null}
 */
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[OpenAI] OPENAI_API_KEY not set - AI features disabled");
    return null;
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: apiKey,
    });
  }
  return _client;
}

/**
 * Get the OpenAI API key from environment
 * @returns {{ apiKey: string | null, isConfigured: boolean }}
 */
export function getAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  return {
    apiKey,
    isConfigured: !!apiKey,
  };
}

/**
 * Safely parse JSON from AI response
 * Strips code fences if present and throws clear error if parsing fails
 * @param {string} text - Raw text from AI
 * @returns {object} Parsed JSON object
 * @throws {Error} If parsing fails
 */
export function safeJsonParse(text) {
  if (!text) {
    throw new Error("Empty AI response - cannot parse JSON");
  }

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse AI JSON response: ${e.message}. Raw text: ${cleaned.slice(0, 200)}...`);
  }
}

/**
 * Standard AI suggestion response schema
 */
export const AI_SUGGESTION_SCHEMA = {
  suspected_issues: [{ title: "", why: "", urgency: "low|med|high" }],
  checks_to_run: [{ step: "", tools: "", time_estimate_mins: 0 }],
  questions_for_customer: [{ question: "", why: "" }],
  parts_to_consider: [{ part: "", notes: "" }],
  safety_notes: [{ note: "" }],
};

/**
 * Call OpenAI API with structured JSON output
 * @param {string} systemPrompt - System message for context
 * @param {string} userPrompt - User message with the request
 * @param {object} options - Additional options
 * @returns {Promise<object>} Parsed JSON response
 */
export async function callOpenAI(systemPrompt, userPrompt, options = {}) {
  const { isConfigured } = getAIConfig();

  if (!isConfigured) {
    return {
      success: false,
      error: "OpenAI not configured. Please set OPENAI_API_KEY in .env.local and restart the server.",
      errorCode: "NOT_CONFIGURED",
      isDummy: true,
      data: generateDummySuggestions(),
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    return {
      success: false,
      error: "OpenAI client not available",
      errorCode: "CLIENT_ERROR",
      isDummy: true,
      data: generateDummySuggestions(),
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: options.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 1500,
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "Empty AI response",
        errorCode: "EMPTY_RESPONSE",
        isDummy: true,
        data: generateDummySuggestions(),
      };
    }

    // Parse JSON response
    const parsed = safeJsonParse(content);
    return {
      success: true,
      isDummy: false,
      data: parsed,
    };
  } catch (error) {
    console.error("[OpenAI] Error:", error.message, error.status);

    // Handle specific OpenAI error types
    if (error.status === 401) {
      return {
        success: false,
        error: "OpenAI authentication failed. Check your API key.",
        errorCode: "AUTH_FAILED",
        isDummy: true,
        data: generateDummySuggestions(),
      };
    }

    if (error.status === 429) {
      return {
        success: false,
        error: "Rate limit exceeded. Please try again in a moment.",
        errorCode: "RATE_LIMIT",
        isDummy: true,
        data: generateDummySuggestions(),
      };
    }

    if (error.status === 500 || error.status === 502 || error.status === 503) {
      return {
        success: false,
        error: "OpenAI service is temporarily unavailable. Please try again later.",
        errorCode: "SERVICE_UNAVAILABLE",
        isDummy: true,
        data: generateDummySuggestions(),
      };
    }

    if (error.status === 400) {
      return {
        success: false,
        error: "Invalid request to OpenAI API.",
        errorCode: "BAD_REQUEST",
        isDummy: true,
        data: generateDummySuggestions(),
      };
    }

    return {
      success: false,
      error: error.message || "OpenAI service error",
      errorCode: "SERVICE_ERROR",
      isDummy: true,
      data: generateDummySuggestions(),
    };
  }
}

/**
 * Generate dummy suggestions when AI is not available
 */
function generateDummySuggestions() {
  return {
    suspected_issues: [
      {
        title: "Unable to generate AI suggestions",
        why: "OpenAI service is not configured or unavailable. Please set OPENAI_API_KEY.",
        urgency: "low",
      },
    ],
    checks_to_run: [],
    questions_for_customer: [],
    parts_to_consider: [],
    safety_notes: [],
  };
}

/**
 * UK used car dealer context for AI prompts
 */
export const UK_DEALER_CONTEXT = `You are an expert automotive diagnostic assistant for a UK used car dealership.
Your role is to help service advisors and technicians diagnose vehicle issues.

Important constraints:
- UK context: Use British terminology (bonnet not hood, boot not trunk, etc.)
- Used car dealer context: Practical, cost-effective advice
- Practical tone: Clear, actionable guidance
- DO NOT invent facts or make assumptions without evidence
- If information is insufficient, ask questions rather than guess
- Focus on common issues and realistic scenarios
- Always consider customer safety`;
