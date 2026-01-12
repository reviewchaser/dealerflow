/**
 * AI Health Check Endpoint
 *
 * GET /api/ai/health
 *
 * Returns the status of the OpenAI configuration.
 * Used for diagnostics and debugging.
 *
 * Response:
 * - ok: boolean - whether AI is configured and ready
 * - provider: "openai" - the AI provider (always OpenAI)
 * - model: string - the default model used
 * - hasOpenAIKey: boolean - whether the key is present
 * - keyPrefix: string - first 7 chars of the key for verification
 * - message: string - human-readable status message
 * - error: string - error code if not ok
 */

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      provider: "openai",
      model: model,
      hasOpenAIKey: false,
      keyPrefix: null,
      error: "missing OPENAI_API_KEY",
      message: "OpenAI is not configured. Set OPENAI_API_KEY in .env.local and restart the server.",
    });
  }

  // Check key format (should start with sk-)
  if (!apiKey.startsWith("sk-")) {
    return res.status(200).json({
      ok: false,
      provider: "openai",
      model: model,
      hasOpenAIKey: true,
      keyPrefix: apiKey.slice(0, 7) + "...",
      error: "invalid OPENAI_API_KEY format",
      message: "OPENAI_API_KEY should start with 'sk-'. Check your .env.local file.",
    });
  }

  return res.status(200).json({
    ok: true,
    provider: "openai",
    model: model,
    hasOpenAIKey: true,
    keyPrefix: apiKey.slice(0, 7) + "...",
    message: "OpenAI is configured and ready",
  });
}
