/**
 * OpenAI Health Check Endpoint
 *
 * GET /api/health/openai
 *
 * Returns whether the OpenAI API key is configured.
 * Used to diagnose environment variable issues.
 */

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const isConfigured = !!apiKey && apiKey.length > 0;

  // Never expose the actual key, just whether it's set
  return res.status(200).json({
    configured: isConfigured,
    keyPrefix: isConfigured ? apiKey.substring(0, 7) + "..." : null,
    timestamp: new Date().toISOString(),
  });
}
