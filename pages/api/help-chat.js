import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/libs/helpDocs";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, path, history = [] } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Anthropic API key not configured" });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    // Build system prompt with page context
    const systemPrompt = buildSystemPrompt(path || "/dashboard");

    // Convert history to Claude message format
    const messages = [
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Set up streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Create streaming message
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Stream the response
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    // Send done signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Help chat error:", error);

    // If headers already sent (streaming started), end the stream
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Failed to get response" });
    }
  }
}
