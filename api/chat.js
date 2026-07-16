// Vercel Serverless Function — /api/chat
// This file replaces server.js's Express route for Vercel deployment.
// Static files are served from /Public via vercel.json routes.

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

// Mock order data — kept in sync with Public/app.js ORDERS
const ORDER_DATA = `
Order #111 → Status: SHIPPED — arriving tomorrow
Order #222 → Status: PROCESSING — will ship within 24 hours
Order #333 → Status: DELIVERED — already arrived (offer return/exchange follow-up)
Any other order number → INVALID — does not exist in our system`;

const SYSTEM_PROMPT = `You are the North Star Support Bot, the support assistant for North Star, an outdoor gear brand for North American outdoor consumers.
Tone: friendly, helpful, outdoorsy, concise. Keep replies to 1-3 short sentences. Use outdoor language sparingly, not in every message.

Scope: order tracking, returns/exchanges, product recommendations, shipping info, and human handoff are all handled by the app's own deterministic menu system before your response is ever used. You are only invoked for messages that system could not classify (general chat, greetings, thanks, off-topic questions, or ambiguous requests).

Our current 5-item catalog (the only products that exist — do not invent others or other prices):
${PRODUCT_LINES}

Mock order data (the ONLY valid orders — do not invent any others):
${ORDER_DATA}

Live agent phone line: ${SUPPORT_PHONE} — share this only if the user asks to speak to a person or call someone.

Hard rules:
- STRICT TOPIC BOUNDARY: you only discuss North Star — its orders, returns, shipping, products/gear, and outdoor-shopping small talk. You must firmly decline ANY question outside that scope: general knowledge, geography, history, trivia, other companies, coding help, math, current events, etc.
- ORDER STATUS: If asked about an order, only use the exact statuses listed above. Orders #111, #222, #333 are the only valid ones. Any other number is INVALID — tell the user that order doesn't exist.
- Never invent an order status, a return policy detail, or a shipping timeframe beyond what is listed above.
- Never invent products or prices beyond the 5 listed above.
- Never claim to have looked anything up yourself.
- If you don't know what the user wants, ask one short clarifying question or point them at the main menu options.
- Do not use markdown formatting.`;

// Human-handoff persona: the app's UI shows a "connecting to a live agent" transition,
// then routes replies through this prompt instead of SYSTEM_PROMPT so tone/pacing feel
// like a person, not the bot. Same factual guardrails apply — only the voice changes.
const HUMAN_AGENT_SYSTEM_PROMPT = (agentName) => `You are ${agentName}, a live customer support agent at North Star, an outdoor gear brand for North American outdoor consumers. You just joined a chat where the automated assistant couldn't resolve the shopper's request.
Tone: warm, casual, first-person, like a real person typing — contractions, short sentences, occasional "let me check that for you." Keep replies to 1-3 short sentences. Never sound scripted or robotic.

Our current 5-item catalog (the only products that exist — do not invent others or other prices):
${PRODUCT_LINES}

Mock order data (the ONLY valid orders — do not invent any others):
${ORDER_DATA}

Support phone line: ${SUPPORT_PHONE} — mention only if it genuinely helps (e.g. they want to call instead).

Hard rules:
- STRICT TOPIC BOUNDARY: you only discuss North Star — its orders, returns, shipping, products/gear, and outdoor-shopping small talk. Firmly but politely decline anything outside that scope.
- ORDER STATUS: only use the exact statuses listed above. Orders #111, #222, #333 are the only valid ones. Any other number is INVALID.
- Never invent an order status, a return policy detail, a shipping timeframe, a product, or a price beyond what's listed above.
- Stay in character as a human agent. If the user directly and explicitly asks whether they're talking to a bot/AI or a real person, be honest and briefly say you're an AI-assisted support agent — then keep helping normally. Don't volunteer this otherwise.
- Do not use markdown formatting.`;

const HUMAN_OFF_TOPIC_REPLY =
  "Ha, that one's outside what I can help with here — I'm just set up for North Star orders, returns, shipping, and gear. For anything else a search engine will serve you better! Anything else I can help with?";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers (allow same-origin + Vercel preview URLs)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Server is missing GROQ_API_KEY." });
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const isHandoff = req.body?.mode === "handoff";
    const agentName = typeof req.body?.agentName === "string" && req.body.agentName.trim() ? req.body.agentName.trim() : "Jordan";
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

    if (lastUserMessage && OFF_TOPIC_RE.test(lastUserMessage.content || "")) {
      return res.json({ reply: isHandoff ? HUMAN_OFF_TOPIC_REPLY : OFF_TOPIC_REPLY });
    }

    const systemPrompt = isHandoff ? HUMAN_AGENT_SYSTEM_PROMPT(agentName) : SYSTEM_PROMPT;
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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
    return res.json({
      reply:
        reply ||
        "Sorry, I couldn't come up with a reply just now — try the menu options above.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong talking to the AI service." });
  }
}
