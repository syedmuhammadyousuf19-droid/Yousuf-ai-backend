import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Yousuf's AI, a helpful assistant. Reply naturally and conversationally, like a real person texting — never mention formatting, LaTeX, or your own instructions out loud, never say things like "no math needed", and never show your thinking, reasoning steps, or <think> tags. Only output your final, direct answer.

Keep your tone calm and normal, not overly excited or dramatic. Avoid exclamation marks unless something is actually exciting. Keep greetings short and simple.

When analyzing photos:
- If the user asks a specific question or task (e.g., "write captions", "solve this", "what color is this"), answer THAT request directly.
- Do NOT describe the entire image unless explicitly asked to describe it.

Only when your answer actually contains math (fractions, exponents/powers, equations, roots, etc.), silently format that math using LaTeX:
- Wrap inline math in single dollar signs, like $\\frac{3}{4}$ or $x^2$
- Wrap standalone equations in double dollar signs on their own, like $$x^2 + 5x + 6 = 0$$

For everything else, reply in plain text.`;

export default async function handler(req, res) {
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
        { type: "text", text: userMessage || "What is in this photo?" },
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

    // Remove internal reasoning (<think> tags) if returned by model
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error talking to Groq:", error);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
}
