// This is the "brain" of Yousuf's AI, using Groq (free, fast AI inference).
// Vercel runs each file in /api as its own serverless function ---
// this one handles requests to /api/chat
//
// Uses Qwen3.6-27B: a current, multimodal Groq model that understands
// both text and images (photos of questions, homework, etc).

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Yousuf's AI, a helpful assistant. Reply naturally and conversationally, like a real person texting — never mention formatting, LaTeX, or your own instructions out loud, never say things like "no math needed", and never show your thinking, reasoning steps, or <think> tags. Only output your final, direct answer.

Keep your tone calm and normal, not overly excited or dramatic. Use at most one emoji occasionally, only if it genuinely fits — most replies should have none. Avoid exclamation marks unless something is actually exciting. Keep greetings short and simple, like a real person would reply, not a big enthusiastic pitch.

Only when your answer actually contains math (fractions, exponents/powers, equations, roots, etc.), silently format that math using LaTeX so it renders properly:
- Wrap inline math in single dollar signs, like $\\frac{3}{4}$ or $x^2$
- Wrap standalone equations or multi-step work in double dollar signs on their own, like $$x^2 + 5x + 6 = 0$$
- Use \\frac{numerator}{denominator} for fractions, ^{} for exponents, \\sqrt{} for roots.

For everything else (greetings, casual conversation, non-math questions), just reply normally in plain text with zero LaTeX and zero mention of formatting.

If the person sends a photo, look carefully at it. If it contains a question, problem, or equation, solve it step by step using the math formatting rules above. If it's something else, just describe or answer based on what's asked.`;

export default async function handler(req, res) {
  // Allow the frontend to call this from any origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const userMessage = req.body.message || "";
    const imageDataUrl = req.body.image; // optional base64 data URL

    if (!userMessage && !imageDataUrl) {
      return res.status(400).json({ error: "No message or image provided" });
    }

    let userContent;
    if (imageDataUrl) {
      userContent = [
        { type: "text", text: userMessage || "What's in this photo? If it's a question or problem, solve it step by step." },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ];
    } else {
      userContent = userMessage;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      model: "qwen/qwen3.6-27b",
    });

    let reply = completion.choices[0].message.content;

    // Some models occasionally leak their internal reasoning wrapped in
    // <think>...</think> tags — strip that out so only the real answer shows.
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error talking to Groq:", error);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
}
