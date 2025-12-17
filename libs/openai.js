/**
 * OpenAI Client Helper
 *
 * Server-side only helper for OpenAI API access.
 * Reads API key from environment variables.
 */

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
  const { apiKey, isConfigured } = getAIConfig();

  if (!isConfigured) {
    return {
      success: false,
      error: "AI not configured",
      errorCode: "NOT_CONFIGURED",
      isDummy: true,
      data: generateDummySuggestions(),
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI] API error:", response.status, errorText);

      if (response.status === 401) {
        return {
          success: false,
          error: "AI authentication failed",
          errorCode: "AUTH_FAILED",
          isDummy: true,
          data: generateDummySuggestions(),
        };
      }

      return {
        success: false,
        error: "AI service error",
        errorCode: "SERVICE_ERROR",
        isDummy: true,
        data: generateDummySuggestions(),
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
    const parsed = JSON.parse(content);
    return {
      success: true,
      isDummy: false,
      data: parsed,
    };
  } catch (error) {
    console.error("[OpenAI] Error:", error.message);
    return {
      success: false,
      error: "AI service unavailable",
      errorCode: "NETWORK_ERROR",
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
        why: "AI service is not configured or unavailable",
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
