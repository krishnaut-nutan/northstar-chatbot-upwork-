// Local development server — NOT used on Vercel.
// Vercel uses api/chat.js (serverless function) + serves /Public as static.

import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(join(__dirname, "Public")));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const SUPPORT_PHONE = "+91 62300 62634";

const PRODUCT_LINES = [
  "TrailPeak Hiking Boots — $128 — waterproof, grippy, all-day comfort on rocky trails",
  "Alpine Glow 2P Tent — $249 — freestanding 3-season tent, quick pitch, weatherproof",
  "CragMaster Climbing Harness — $89 — adjustable leg loops, 4 gear loops, sport & trad",
  "Summit Fleece Pullover — $59 — lightweight everyday midlayer",
  "Trailblazer 32L Daypack — $79 — our most popular daypack, hydration sleeve + rain cover",
].join("\n");

const OFF_TOPIC_RE =
  /\b(where is|where'?s|what is the capital|who is|who was|who invented|when was .*(born|founded|invented)|how far is|how tall is|how old is|what year (is|was)|population of|weather (in|today|tomorrow)|tell me a joke|write me a (poem|essay|song|code|story)|solve (this|for)|meaning of life|current (time|date)|who won|capital of|distance (from|to|between)|define \w+|translate)\b/i;
const OFF_TOPIC_REPLY =
  "I'm the North Star Support Bot, so I can only help with things like orders, returns, shipping, and gear recommendations for North Star. For anything else, a general search engine will do a lot better than I can! Want help with one of those instead?";

const SYSTEM_PROMPT = `You are the North Star Support Bot, the support assistant for North Star, an outdoor gear brand for North American outdoor consumers.
Tone: friendly, helpful, outdoorsy, concise. Keep replies to 1-3 short sentences. Use outdoor language sparingly, not in every message.

Scope: order tracking, returns/exchanges, product recommendations, shipping info, and human handoff are all handled by the app's own deterministic menu system before your response is ever used. You are only invoked for messages that system could not classify (general chat, greetings, thanks, off-topic questions, or ambiguous requests).

Our current 5-item catalog (the only products that exist — do not invent others or other prices):
${PRODUCT_LINES}

Live agent phone line: ${SUPPORT_PHONE} — share this only if the user asks to speak to a person or call someone.

Hard rules:
- STRICT TOPIC BOUNDARY: you only discuss North Star — its orders, returns, shipping, products/gear, and outdoor-shopping small talk. You must firmly decline ANY question outside that scope.
- Never invent an order status, a return policy detail, or a shipping timeframe.
- Never invent products or prices beyond the 5 listed above.
- Never claim to have looked anything up yourself.
- If you don't know what the user wants, ask one short clarifying question or point them at the main menu options.
- Do not use markdown formatting.`;

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Server is missing GROQ_API_KEY." });
    }
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage && OFF_TOPIC_RE.test(lastUserMessage.content || "")) {
      return res.json({ reply: OFF_TOPIC_REPLY });
    }

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
        max_tokens: 200,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error", groqRes.status, errText);
      return res.status(502).json({ error: "AI service error." });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    res.json({ reply: reply || "Sorry, I couldn't come up with a reply just now — try the menu options above." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong talking to the AI service." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`North Star Support Bot running at http://localhost:${PORT}`);
});
