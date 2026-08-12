// This is the "brain" of Yousuf's AI, using Groq (free, fast AI inference).
// Vercel runs each file in /api as its own serverless function ---
// this one handles requests to /api/chat
//
// Uses Qwen3.6-27B: a current, multimodal Groq model that understands
// both text and images (photos of questions, homework, etc).

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Yousuf's AI, a friendly and helpful assistant.

When answering any math question (fractions, exponents/powers, equations, roots, etc.), always format the math using LaTeX so it can render properly:
- Wrap inline math in single dollar signs, like $\\frac{3}{4}$ or $x^2$
- Wrap standalone equations or multi-step work in double dollar signs on their own, like $$x^2 + 5x + 6 = 0$$
- Always use \\frac{numerator}{denominator} for fractions, ^{} for exponents, \\sqrt{} for roots, and standard LaTeX math notation.
- For plain conversational text (non-math), just write normally without LaTeX.

If the person sends a photo, look carefully at it. If it contains a question, problem, or equation, solve it step by step. If it's something else, describe or answer based on what's asked.`;

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

    const reply = completion.choices[0].message.content;

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error talking to Groq:", error);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
}
