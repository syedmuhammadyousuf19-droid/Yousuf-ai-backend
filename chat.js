// This is the "brain" of Yousuf's AI, rewritten for Vercel.
// Vercel runs each file in /api as its own serverless function ---
// this one handles requests to /api/chat

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

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
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({ error: "No message provided" });
    }

    const result = await model.generateContent(userMessage);
    const reply = result.response.text();

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error talking to Gemini:", error);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
}
