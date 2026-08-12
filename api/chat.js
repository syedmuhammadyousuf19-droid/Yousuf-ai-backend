import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Yousuf's AI, a helpful assistant.

CRITICAL INSTRUCTIONS:
1. Never output thinking tags, <think> blocks, or internal reasoning under any circumstances.
2. Keep responses concise, direct, and short (1-3 sentences) unless explicitly asked for detailed information.
3. If an image is provided, respond directly to the user's prompt (e.g. give short captions) without describing the entire image unless asked.
4. Keep the tone natural and calm.

Only format math using LaTeX when necessary ($x^2$ or $$x^2 + 5 = 0$$).`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST requests allowed" });

  try {
    const history = req.body.history || [];
    const latestMessage = req.body.message || "";
    const imageDataUrl = req.body.image;

    if (!latestMessage && !imageDataUrl && history.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const formattedMessages = history.map((msg) => {
      const role = msg.sender === "user" ? "user" : "assistant";
      if (msg.image && msg.sender === "user") {
        return {
          role,
          content: [
            { type: "text", text: msg.text || "Attached photo" },
            { type: "image_url", image_url: { url: msg.image } }
          ]
        };
      }
      return { role, content: msg.text || "" };
    });

    let currentContent;
    if (imageDataUrl) {
      currentContent = [
        { type: "text", text: latestMessage || "What is in this photo?" },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ];
    } else {
      currentContent = latestMessage;
    }

    formattedMessages.push({ role: "user", content: currentContent });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...formattedMessages
      ],
      model: "qwen/qwen3.6-27b",
    });

    let reply = completion.choices[0].message.content || "";

    // Remove any <think> tags or leftover reasoning completely
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "");
    reply = reply.replace(/<think>[\s\S]*/gi, "");
    reply = reply.replace(/Thinking Process:[\s\S]*/gi, "");
    reply = reply.trim();

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error talking to Groq:", error);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
}
