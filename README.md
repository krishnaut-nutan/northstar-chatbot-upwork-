# North Star Support Bot

A hybrid customer support chatbot for a North American outdoor gear brand: a deterministic rule engine handles the four graded use cases exactly against the provided mock data, and a real LLM (via Groq) handles natural fallback conversation on top of it. Redesigned UI: dark theme, glowing orb avatar, neon action cards — matching the reference mockup in `public/image.png`.

Two versions ship in this repo:

| Version | Where | AI-powered? | Setup |
|---|---|---|---|
| **Full app (recommended)** | `server.js` + `public/` | Yes — real Groq LLM fallback | `npm install && npm start` |
| **Static fallback** | `static-fallback/index.html` | No — rule-based only | Open the file, nothing else |

## How to run the full app

```bash
npm install
npm start
```

Then open **http://localhost:3000** — this is now a full marketing landing page for North Star, not the bare chatbot. The chatbot lives behind a floating "💬" launcher fixed in the bottom-right corner, visible immediately with no scrolling required; clicking it slides in the full chat as a panel over the page (loaded via `<iframe src="/chatbot.html">`, so it's the exact same app, just embedded). Press Escape or the ✕ to close it. The raw chat app is still reachable directly at `/chatbot.html` if you want to test it full-screen.

The Groq API key lives in `.env` (already filled in for this submission) and is only ever read by `server.js` — it is never sent to the browser. The frontend calls our own `/api/chat` endpoint, which proxies to Groq server-side.

> **Security note:** `.env` is git-ignored. If you push this repo anywhere public (a public GitHub repo, a public Upwork deliverable, etc.), either strip the key out of `.env` first or rotate it in the Groq console — anyone with read access to that file has live access to the key's quota.

## No-setup alternative

If you just want to see the deterministic bot logic with zero setup, open `static-fallback/index.html` directly in a browser — that's the original all-client-side build, no Node, no key, no server.

## What it does

Same four required use cases as before, now wrapped in a redesigned UI:

### 1. Order Tracking
- Recognizes "where is my order", "track my package", "shipment status", or a message that already contains an order number.
- Asks for the order number if one wasn't given.
- Uses the required mock data exactly:
  | Order # | Status |
  |---|---|
  | 111 | Shipped — arriving tomorrow |
  | 222 | Processing — ships in 24 hours |
  | 333 | Delivered (bot offers to help with a return/exchange) |
  | anything else | Invalid order |

### 2. Returns & Exchanges
States the policy exactly: 30-day returns, items must be unused, original packaging required, plus a returns link.

### 3. Product Recommendations
Two clarifying questions (activity, then priority) → recommends a real product from the 5-item catalog below, rendered as a styled product card (name, price, tag, blurb). Ask "what do you sell" / "show me your products" any time for the full catalog list.

**Sample catalog:**
| Product | Price | Tag |
|---|---|---|
| TrailPeak Hiking Boots | $128 | Bestseller |
| Alpine Glow 2P Tent | $249 | 3-Season |
| CragMaster Climbing Harness | $89 | Sport & Trad |
| Summit Fleece Pullover | $59 | Everyday |
| Trailblazer 32L Daypack | $79 | 🔥 Most Popular |

### 4. Human Handoff
Explicit request or two consecutive misses → simulated Live Agent state that surfaces a **real, callable phone number: +91 62300 62634** (tel: link, plus a dedicated "📞 Call" chip) alongside the simulated chat, so a handoff is never a dead end. Also shown in the ⓘ info sheet under "Talk to Us".

### New: AI-powered fallback, with guardrails
Anything that doesn't match the four flows (small talk, "thanks!", oddly-phrased requests) is handled by a real LLM call (Groq, `llama-3.3-70b-versatile`) instead of a canned response — replies are tagged **AI** in the chat so it's clear which messages are deterministic vs. generated.

Two guardrails keep this on-brand:
- **Scope lock:** the LLM is instructed to only discuss North Star (orders/returns/shipping/products) and to firmly decline general-knowledge/trivia questions ("where is the Taj Mahal", "who won the World Cup", "tell me a joke", etc.), with that instruction hardened against being overridden by the user's own message.
- **Deterministic prefilter:** a regex catches the most common trivia phrasings (`where is`, `who is`, `capital of`, `how tall is`, `weather in`, …) and answers with a fixed redirect message *before* ever calling the LLM — so the guardrail holds even if the model itself gets talked into ignoring its instructions. This runs both client-side (`public/app.js`) and again server-side (`server.js`) in case something calls `/api/chat` directly.
- The LLM is also explicitly instructed never to invent order statuses, policy details, shipping times, products, or prices — those stay 100% rule-based for accuracy. If the AI call fails outright (offline, rate-limited, bad key), the bot degrades gracefully to the original "I didn't quite catch that" + escalation-to-human behavior.

### New: personalization
On a first greeting the bot asks for your name, remembers it in `localStorage`, and greets you by name afterward ("Welcome back, Nutan!") — small, but it's the difference between a scripted demo and something that feels like a persisted product.

### New: UI
- Dark theme with a glowing, rotating gradient orb as the bot's avatar (replicating the reference image's "AI Buddy" orb).
- Hub screen: personalized greeting, four neon action cards (lime / lavender / pink / sky), and a "Recent" history list backed by `localStorage`.
- Chat screen: dark chat bubbles, product cards, quick-reply chips, back button to return to the hub.
- Voice input via the browser's native Speech Recognition API (mic button) — a free, no-key progressive enhancement; falls back to a text hint in browsers that don't support it (e.g. Firefox).
- Info sheet (ⓘ icon) surfaces shipping, return policy, and the support phone number at a glance without needing to ask the bot.

## Design notes / assumptions
- The rule engine is intentionally still deterministic for the four graded flows — this protects the "accuracy of responses based on provided data" criterion. The LLM only ever fills in the conversational gaps around it, inside a locked topic scope.
- The returns link (`northstaroutdoor.com/returns`) is a labeled placeholder since "North Star" is a fictional brand for this exercise; product "View product" links are likewise demo-only.
- The 5 products/prices are original samples created for this exercise, not a real catalog.
- Model: `llama-3.3-70b-versatile` on Groq, configurable via `GROQ_MODEL` in `.env`.

## File structure
```
north-star-support-bot/
├── server.js              # Express server + /api/chat proxy to Groq (key stays server-side)
├── package.json
├── .env                   # GROQ_API_KEY, GROQ_MODEL, PORT (git-ignored)
├── .env.example
├── public/
│   ├── index.html         # marketing landing page (nav, hero, products, footer) — served at "/"
│   ├── landing.css        # landing page styles
│   ├── landing.js         # floating launcher + slide-in chat panel logic
│   ├── chatbot.html       # the chatbot app itself (hub + chat views) — embedded via iframe, or open directly
│   ├── styles.css         # chatbot's dark/neon theme, orb, cards
│   ├── app.js              # rule engine + AI fallback + UI wiring
│   └── image.png           # reference mockup the chatbot UI was built from
├── static-fallback/
│   └── index.html         # original zero-setup, rule-only version (standalone, no landing page)
└── README.md
```

## Submission checklist
- [x] All four required use cases implemented (order tracking, returns/exchanges, product recommendations, human handoff)
- [x] Order tracking follows the provided mock data exactly (#111, #222, #333, invalid-otherwise)
- [x] Return policy and shipping information included where required
- [x] Intent recognition supports multiple phrasing variations, now backed by a real LLM for open-ended phrasing
- [x] Fallback handling implemented, with escalation to human handoff after repeated misses (including if the AI service itself is unreachable)
- [x] Users can return to the main menu after a human handoff
- [x] Reviewable with a single `npm install && npm start` — no evaluator-provided API key needed (or, for zero setup at all, `static-fallback/index.html`)
- [ ] Video demo (2–3 min) — record separately, walking through all 4 use cases + 1 fallback
#   n o r t h s t a r - c h a t b o t - u p w o r k -  
 