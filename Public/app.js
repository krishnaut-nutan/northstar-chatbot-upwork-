(function () {
  "use strict";

  // ---------- Mock data (provided) ----------
  var ORDERS = {
    "111": { text: "📦 Order #111 — **Shipped!** It's on its way and arriving tomorrow. 🚚", short: "Shipped, arriving tomorrow" },
    "222": { text: "🛠️ Order #222 — **Processing.** It will ship within 24 hours. 🕐", short: "Processing, ships in 24h" },
    "333": { text: "✅ Order #333 — **Delivered.**", short: "Delivered" }
  };

  var RETURN_POLICY_TEXT =
    "Here's our return policy 🌲\n" +
    "• 30-day returns from the delivery date\n" +
    "• Items must be unused\n" +
    "• Original packaging required\n\n" +
    "Start your return here: northstaroutdoor.com/returns (demo link)";

  var SHIPPING_TEXT =
    "Here's our shipping info 🚚\n" +
    "• Standard shipping: 3-5 business days\n" +
    "• Expedited shipping: 1-2 business days";

  var SUPPORT_PHONE_DISPLAY = "+91 62300 62634";
  var SUPPORT_PHONE_TEL = "tel:+916230062634";

  // ---------- Product catalog (5 sample SKUs) ----------
  var PRODUCTS = {
    hiking: { slug: "trailpeak-hiking-boots", name: "TrailPeak Hiking Boots", price: "$128", tag: "Bestseller", color: "lime", blurb: "Waterproof, grippy, and built for all-day miles on rocky trails." },
    camping: { slug: "alpine-glow-2p-tent", name: "Alpine Glow 2P Tent", price: "$249", tag: "3-Season", color: "lavender", blurb: "Freestanding, quick-pitch, and weatherproof for weekend basecamps." },
    climbing: { slug: "cragmaster-climbing-harness", name: "CragMaster Climbing Harness", price: "$89", tag: "Sport & Trad", color: "pink", blurb: "Adjustable leg loops with 4 gear loops for a secure, comfortable fit." },
    everyday: { slug: "summit-fleece-pullover", name: "Summit Fleece Pullover", price: "$59", tag: "Everyday", color: "sky", blurb: "A lightweight midlayer that goes from the trailhead to town." }
  };
  var FEATURED_PRODUCT = { slug: "trailblazer-32l-daypack", name: "Trailblazer 32L Daypack", price: "$79", tag: "🔥 Most Popular", color: "lime", blurb: "Our best-selling daypack — hydration sleeve, rain cover, all-day comfort." };

  var PRIORITY_NOTE = {
    budget: { tag: "Budget Pick", note: "Great value without cutting corners." },
    durability: { tag: "Built to Last", note: "Rugged construction that shrugs off repeated abuse." },
    weight: { tag: "Ultralight", note: "Barely notice it in your pack." }
  };

  // ---------- Intent matchers ----------
  var RE = {
    reset: /\b(menu|main menu|start over|restart|go back)\b/i,
    human: /\b(human|live agent|real person|representative|agent|escalate|talk to (a )?(person|someone))\b/i,
    order: /\b(order|track|package|shipment|shipping status|where.*(order|package|stuff)|status of my)\b/i,
    returns: /\b(return|exchange|refund|send (it |this )?back)\b/i,
    shipping: /\b(shipping|delivery time|how long.*(ship|deliver)|when will it (ship|arrive))\b/i,
    productRec: /\b(recommend|suggest|looking for|need (a|some)|gift|gear|which (boots|tent|product)|help me (find|choose|pick))\b/i,
    catalog: /\b(what do you sell|show me (your |the )?products?|product catalog|see (all )?products?|browse products|what products|your (products|catalog)|bestseller|best.?selling|most popular)\b/i,
    greeting: /\b(hi|hello|hey|howdy|good (morning|afternoon|evening))\b/i,
    yes: /\b(yes|yeah|yep|sure|ok(ay)?|please)\b/i,
    no: /\b(no|nope|nah|not really)\b/i,
    digits: /\d{2,}/,
    // General-knowledge / trivia guardrail — deliberately outside North Star's scope.
    offTopic: /\b(where is|where'?s|what is the capital|who is|who was|who invented|when was .*(born|founded|invented)|how far is|how tall is|how old is|what year (is|was)|population of|weather (in|today|tomorrow)|tell me a joke|write me a (poem|essay|song|code|story)|solve (this|for)|meaning of life|current (time|date)|who won|capital of|distance (from|to|between)|define \w+|translate)\b/i
  };

  var ACTIVITY_MAP = [
    { key: "hiking", re: /\bhik(e|ing)|trail\b/i },
    { key: "camping", re: /\bcamp(ing)?|tent\b/i },
    { key: "climbing", re: /\bclimb(ing)?\b/i },
    { key: "everyday", re: /\bevery ?day|casual|daily\b/i }
  ];
  var PRIORITY_MAP = [
    { key: "budget", re: /\bprice|cheap|budget|afford|cost\b/i },
    { key: "durability", re: /\bdurab|tough|rugged|long.?last\b/i },
    { key: "weight", re: /\bweight|light ?weight|pack ?able|pack ?ability\b/i }
  ];

  var MAIN_CHIPS = [
    { label: "📦 Track My Order", value: "track my order" },
    { label: "↩️ Returns & Exchanges", value: "i want a return" },
    { label: "🎒 Product Recommendations", value: "recommend a product" },
    { label: "🧑‍💻 Talk to a Human", value: "talk to a human" }
  ];

  var OFF_TOPIC_REPLY =
    "I'm the North Star Support Bot, so I can only help with things like orders, returns, shipping, and gear recommendations for North Star. For anything else, a general search engine will do a lot better than I can! Want help with one of those instead?";

  var TITLES = {
    main: "North Star",
    ask_name: "North Star",
    order_ask_number: "Order Tracking",
    order_followup_333: "Order Tracking",
    returns_done: "Returns & Exchanges",
    product_step1: "Product Recommendations",
    product_step2: "Product Recommendations",
    handoff: "Live Agent"
  };

  // ---------- State ----------
  var state = { flow: "main", fallbackCount: 0, aiHistory: [], product: {}, pendingGreeting: false };

  var messagesEl = document.getElementById("messages");
  var chatViewEl = document.getElementById("chatView");
  var chipsEl = document.getElementById("chips");
  var form = document.getElementById("inputForm");
  var input = document.getElementById("textInput");
  var appShell = document.querySelector(".app-shell");
  var backBtn = document.getElementById("backBtn");
  var topbarTitle = document.getElementById("topbarTitle");
  var historyListEl = document.getElementById("historyList");
  var seeAllBtn = document.getElementById("seeAllBtn");
  var infoBtn = document.getElementById("infoBtn");
  var infoSheet = document.getElementById("infoSheet");
  var sheetBackdrop = document.getElementById("sheetBackdrop");
  var sheetClose = document.getElementById("sheetClose");
  var micBtn = document.getElementById("micBtn");

  var HISTORY_KEY = "northstar_history";
  var NAME_KEY = "northstar_name";
  var showAllHistory = false;

  function getName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
  }
  function setName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
  }

  function scrollToBottom() {
    // #messages itself doesn't scroll — .chat-view (its parent) is the actual
    // overflow-y:auto container, so that's what needs its scroll position moved.
    requestAnimationFrame(function () {
      chatViewEl.scrollTop = chatViewEl.scrollHeight;
    });
  }

  function renderText(text) {
    var escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/(northstaroutdoor\.com\/returns)/g, '<a href="#" onclick="return false;">$1</a>');
    escaped = escaped.replace(/(\+91 62300 62634)/g, '<a href="' + SUPPORT_PHONE_TEL + '">$1</a>');
    return escaped;
  }

  function botAvatarHTML() {
    return (
      '<svg class="bot-avatar" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="msgOrbBase" cx="35%" cy="30%" r="75%">' +
            '<stop offset="0%" stop-color="#c8a8ff" />' +
            '<stop offset="45%" stop-color="#6f8dff" />' +
            '<stop offset="90%" stop-color="#1e1b4b" />' +
            '<stop offset="100%" stop-color="#0c0c0f" />' +
          '</radialGradient>' +
          '<radialGradient id="msgBottomGlow" cx="50%" cy="95%" r="50%">' +
            '<stop offset="0%" stop-color="#6affea" stop-opacity="0.9" />' +
            '<stop offset="60%" stop-color="#6affea" stop-opacity="0.3" />' +
            '<stop offset="100%" stop-color="#6affea" stop-opacity="0" />' +
          '</radialGradient>' +
          '<radialGradient id="msgTopReflect" cx="30%" cy="25%" r="35%">' +
            '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.7" />' +
            '<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />' +
          '</radialGradient>' +
          '<filter id="msgEyeShadow" x="-20%" y="-20%" width="140%" height="140%">' +
            '<feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#0f172a" flood-opacity="0.4" />' +
          '</filter>' +
        '</defs>' +
        '<circle cx="50" cy="50" r="46" fill="url(#msgOrbBase)" />' +
        '<circle cx="50" cy="50" r="46" fill="url(#msgBottomGlow)" style="mix-blend-mode: screen;" />' +
        '<circle cx="50" cy="50" r="46" fill="url(#msgTopReflect)" />' +
        '<g class="orb-eyes" filter="url(#msgEyeShadow)">' +
          '<rect x="33" y="39" width="6.5" height="22" rx="3.25" fill="#ffffff" />' +
          '<rect x="46.5" y="39" width="6.5" height="22" rx="3.25" fill="#ffffff" />' +
        '</g>' +
      '</svg>'
    );
  }

  function productCardHTML(product, priorityKey) {
    var priority = priorityKey && PRIORITY_NOTE[priorityKey];
    var tag = priority ? priority.tag : product.tag;
    var extra = priority ? " " + priority.note : "";
    return (
      '<div class="product-card">' +
        '<div class="product-card-top">' +
          '<span class="product-tag" style="background:var(--' + product.color + ')">' + tag + "</span>" +
          '<span class="product-price">' + product.price + "</span>" +
        "</div>" +
        '<div class="product-name">' + product.name + "</div>" +
        '<p class="product-blurb">' + product.blurb + extra + "</p>" +
        '<a class="product-link" href="#" onclick="return false;">View product (demo) →</a>' +
      "</div>"
    );
  }

  function catalogListHTML() {
    var all = Object.keys(PRODUCTS).map(function (k) { return PRODUCTS[k]; }).concat([FEATURED_PRODUCT]);
    return (
      '<div class="catalog-list">' +
      all.map(function (p) {
        return (
          '<div class="catalog-row">' +
            '<span class="history-dot" style="background:var(--' + p.color + ')"></span>' +
            '<span class="catalog-row-text"><strong>' + p.name + "</strong> — " + p.price + "</span>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function addMessage(text, who, opts) {
    opts = opts || {};
    var row = document.createElement("div");
    row.className = "msg-row " + who + (opts.ai ? " ai" : "");
    if (who === "bot") row.innerHTML = botAvatarHTML();
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = (opts.ai ? '<span class="ai-tag">AI</span><br/>' : "") + renderText(text);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function botSay(text, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var row = document.createElement("div");
      row.className = "msg-row bot" + (opts.ai ? " ai" : "");
      row.innerHTML = botAvatarHTML();
      var bubble = document.createElement("div");
      bubble.className = "bubble typing";
      bubble.innerHTML = "<span></span><span></span><span></span>";
      row.appendChild(bubble);
      messagesEl.appendChild(row);
      scrollToBottom();
      setTimeout(function () {
        bubble.classList.remove("typing");
        var body = opts.html ? text : renderText(text);
        bubble.innerHTML = (opts.ai ? '<span class="ai-tag">AI</span><br/>' : "") + body;
        scrollToBottom();
        resolve();
      }, opts.delay || 450);
    });
  }

  function setChips(list) {
    chipsEl.innerHTML = "";
    list.forEach(function (item) {
      if (item.href) {
        var link = document.createElement("a");
        link.className = "chip";
        link.href = item.href;
        link.textContent = item.label;
        chipsEl.appendChild(link);
        return;
      }
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = item.label;
      chip.addEventListener("click", function () {
        addMessage(item.label, "user");
        handle(item.value !== undefined ? item.value : item.label);
      });
      chipsEl.appendChild(chip);
    });
  }

  function updateTopbarTitle() {
    topbarTitle.textContent = TITLES[state.flow] || "North Star";
  }

  function switchToChat() {
    appShell.classList.add("in-chat");
    backBtn.hidden = false;
    updateTopbarTitle();
  }

  function switchToHub() {
    appShell.classList.remove("in-chat");
    backBtn.hidden = true;
    topbarTitle.textContent = "North Star";
  }

  // ---------- History (localStorage) ----------
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20))); } catch (e) {}
  }
  function pushHistory(label, colorVar) {
    var list = loadHistory();
    list.unshift({ label: label, color: colorVar, time: "now" });
    saveHistory(list);
    renderHistory();
  }
  function renderHistory() {
    var list = loadHistory();
    historyListEl.innerHTML = "";
    if (!list.length) {
      var li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "Your recent questions will show up here.";
      historyListEl.appendChild(li);
      seeAllBtn.hidden = true;
      return;
    }
    seeAllBtn.hidden = list.length <= 3;
    var visible = showAllHistory ? list : list.slice(0, 3);
    visible.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "history-item";
      var dot = document.createElement("span");
      dot.className = "history-dot";
      dot.style.background = "var(--" + item.color + ")";
      var text = document.createElement("span");
      text.className = "history-text";
      text.textContent = item.label;
      li.appendChild(dot);
      li.appendChild(text);
      li.addEventListener("click", function () {
        switchToChat();
      });
      historyListEl.appendChild(li);
    });
  }
  seeAllBtn.addEventListener("click", function () {
    showAllHistory = !showAllHistory;
    seeAllBtn.textContent = showAllHistory ? "Show less" : "See all";
    renderHistory();
  });

  // ---------- Info sheet ----------
  function openSheet() { infoSheet.hidden = false; sheetBackdrop.hidden = false; }
  function closeSheet() { infoSheet.hidden = true; sheetBackdrop.hidden = true; }
  infoBtn.addEventListener("click", openSheet);
  sheetClose.addEventListener("click", closeSheet);
  sheetBackdrop.addEventListener("click", closeSheet);

  // ---------- Flow handlers ----------
  async function showMainMenu(greetingFirst) {
    state.flow = "main";
    state.fallbackCount = 0;
    state.product = {};
    updateTopbarTitle();
    var name = getName();
    if (greetingFirst) {
      await botSay(name ? "Welcome back, " + name + "! 🌄 What can I help you with?" : "Welcome back to North Star! 🌄 What can I help you with?");
    } else {
      await botSay("Anything else I can help with? Here's what I can do:");
    }
    setChips(MAIN_CHIPS);
  }

  async function handleAskName(raw) {
    var name = raw.trim().replace(/[^a-zA-Z\s'-]/g, "").trim();
    name = name.split(/\s+/)[0] || "";
    if (name) name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (!name) {
      await botSay("No worries — just type your name whenever, or say “skip” and we'll get moving.");
      if (/\bskip\b/i.test(raw)) { await showMainMenu(false); }
      return;
    }
    setName(name);
    await botSay("Nice to meet you, " + name + "! 🌲");
    await showMainMenu(false);
  }

  async function startOrderTracking(prefilledId) {
    state.flow = "order_ask_number";
    updateTopbarTitle();
    if (prefilledId) {
      await handleOrderNumber(prefilledId);
      return;
    }
    await botSay("Happy to check that for you! 📦 What's your order number? (e.g. #111)");
    setChips([]);
  }

  async function handleOrderNumber(idRaw) {
    var id = idRaw.replace(/\D/g, "");
    if (!id) {
      await botSay("I just need the order number — something like #111. Or type “menu” to go back.");
      return;
    }
    var order = ORDERS[id];
    if (!order) {
      await botSay("Hmm, I couldn't find an order with the number #" + id + ". Please double-check and try again, or type “menu” to head back.");
      return;
    }
    await botSay(order.text);
    pushHistory("Order #" + id + " — " + order.short, id === "333" ? "sky" : "lime");
    if (id === "333") {
      state.flow = "order_followup_333";
      updateTopbarTitle();
      await botSay("Since that one's already arrived, would you like help starting a return or exchange for it?");
      setChips([
        { label: "Yes, help me return it", value: "yes" },
        { label: "No, that's all", value: "no" }
      ]);
      return;
    }
    await showMainMenu(false);
  }

  async function handleOrderFollowup333(text) {
    if (RE.yes.test(text)) { await startReturns(); return; }
    if (RE.no.test(text)) {
      await botSay("Glad it made it there safely! 🌲");
      await showMainMenu(false);
      return;
    }
    await botSay("Just to confirm — would you like help with a return or exchange for order #333?");
    setChips([
      { label: "Yes, help me return it", value: "yes" },
      { label: "No, that's all", value: "no" }
    ]);
  }

  async function startReturns() {
    state.flow = "returns_done";
    updateTopbarTitle();
    await botSay(RETURN_POLICY_TEXT);
    pushHistory("Return policy & returns link shared", "lavender");
    await showMainMenu(false);
  }

  async function startProductRec() {
    state.flow = "product_step1";
    state.product = {};
    updateTopbarTitle();
    await botSay("Let's find the right gear for you! 🎒 What will you mainly be using it for — hiking, camping, climbing, or everyday/casual wear?");
    setChips([
      { label: "🥾 Hiking", value: "hiking" },
      { label: "⛺ Camping", value: "camping" },
      { label: "🧗 Climbing", value: "climbing" },
      { label: "🧢 Everyday/Casual", value: "everyday" }
    ]);
  }

  async function handleProductStep1(text) {
    var match = ACTIVITY_MAP.find(function (a) { return a.re.test(text) || text === a.key; });
    if (!match) {
      await botSay("Sorry, I didn't catch that — is it mainly for hiking, camping, climbing, or everyday/casual use?");
      setChips([
        { label: "🥾 Hiking", value: "hiking" },
        { label: "⛺ Camping", value: "camping" },
        { label: "🧗 Climbing", value: "climbing" },
        { label: "🧢 Everyday/Casual", value: "everyday" }
      ]);
      return;
    }
    state.product.activity = match.key;
    state.flow = "product_step2";
    updateTopbarTitle();
    await botSay("Got it! One more thing — what matters most to you: price, durability, or weight/packability?");
    setChips([
      { label: "💰 Price", value: "budget" },
      { label: "💪 Durability", value: "durability" },
      { label: "🪶 Weight/Packability", value: "weight" }
    ]);
  }

  async function handleProductStep2(text) {
    var match = PRIORITY_MAP.find(function (p) { return p.re.test(text) || text === p.key; });
    if (!match) {
      await botSay("No worries — just let me know: price, durability, or weight/packability?");
      setChips([
        { label: "💰 Price", value: "budget" },
        { label: "💪 Durability", value: "durability" },
        { label: "🪶 Weight/Packability", value: "weight" }
      ]);
      return;
    }
    var activity = state.product.activity;
    var product = PRODUCTS[activity];
    await botSay("Based on that, here's what I'd recommend: 🌟");
    await botSay(productCardHTML(product, match.key), { html: true, delay: 350 });
    pushHistory("Recommended: " + product.name, product.color);
    await showMainMenu(false);
  }

  async function showCatalog() {
    await botSay("Here's what's in stock right now: 🎒");
    await botSay(catalogListHTML(), { html: true, delay: 350 });
    await showMainMenu(false);
  }

  async function startHandoff(fromFallback) {
    state.flow = "handoff";
    updateTopbarTitle();
    if (fromFallback) {
      await botSay("I'm having trouble understanding — let's get you a live agent. 🔄");
    } else {
      await botSay("No problem — connecting you to a live agent now… 🔄");
    }
    await botSay(
      "🧑‍💻 You're now in a simulated Live Agent chat. For immediate help, you can also call our support line at +91 62300 62634. Anything you'd like me to note for them first?",
      { delay: 700 }
    );
    pushHistory("Connected to live agent", "sky");
    setChips([
      { label: "📞 Call " + SUPPORT_PHONE_DISPLAY, href: SUPPORT_PHONE_TEL },
      { label: "⬅️ Return to Main Menu", value: "__return_menu__" }
    ]);
  }

  async function handleHandoffChat(text) {
    if (text === "__return_menu__") { await showMainMenu(true); return; }
    await botSay("📝 Got it, I've noted that for the live agent. They'll follow up with details. You can also reach us directly at +91 62300 62634.");
    setChips([
      { label: "📞 Call " + SUPPORT_PHONE_DISPLAY, href: SUPPORT_PHONE_TEL },
      { label: "⬅️ Return to Main Menu", value: "__return_menu__" }
    ]);
  }

  // ---------- AI fallback (Groq, server-proxied) ----------
  async function callGroq(userText) {
    state.aiHistory.push({ role: "user", content: userText });
    if (state.aiHistory.length > 10) state.aiHistory = state.aiHistory.slice(-10);
    var res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.aiHistory })
    });
    if (!res.ok) throw new Error("AI request failed");
    var data = await res.json();
    if (!data.reply) throw new Error("Empty AI reply");
    state.aiHistory.push({ role: "assistant", content: data.reply });
    return data.reply;
  }

  async function classicFallback() {
    state.fallbackCount++;
    if (state.fallbackCount >= 2) {
      await botSay("I didn't quite catch that. 🤔");
      await startHandoff(true);
      return;
    }
    await botSay("I didn't quite catch that. 🤔 Here's what I can help with:");
    setChips(MAIN_CHIPS);
  }

  async function tryAI(raw) {
    // Guardrail: keep general-knowledge/trivia questions from ever reaching the LLM.
    if (RE.offTopic.test(raw)) {
      await botSay(OFF_TOPIC_REPLY);
      setChips(MAIN_CHIPS);
      return;
    }
    try {
      var reply = await callGroq(raw);
      state.fallbackCount = 0;
      await botSay(reply, { ai: true, delay: 650 });
      setChips(MAIN_CHIPS);
    } catch (err) {
      await classicFallback();
    }
  }

  async function handleMainIntent(text, raw) {
    if (RE.order.test(text)) {
      var idMatch = raw.match(RE.digits);
      await startOrderTracking(idMatch ? idMatch[0] : null);
      return;
    }
    if (RE.returns.test(text)) { await startReturns(); return; }
    if (RE.shipping.test(text)) {
      await botSay(SHIPPING_TEXT);
      await showMainMenu(false);
      return;
    }
    if (RE.catalog.test(text)) { await showCatalog(); return; }
    if (RE.productRec.test(text)) { await startProductRec(); return; }
    if (RE.greeting.test(text)) {
      if (!getName()) {
        state.flow = "ask_name";
        updateTopbarTitle();
        await botSay("Hey there! 👋 Before we get started, what should I call you?");
        return;
      }
      await showMainMenu(true);
      return;
    }
    await tryAI(raw);
  }

  // ---------- Central dispatcher ----------
  async function handle(raw) {
    var text = String(raw).toLowerCase().trim();
    setChips([]);

    if (RE.reset.test(text)) { await showMainMenu(true); return; }
    if (RE.human.test(text) && state.flow !== "handoff") { await startHandoff(false); return; }

    switch (state.flow) {
      case "ask_name": await handleAskName(raw); return;
      case "order_ask_number": await handleOrderNumber(text); return;
      case "order_followup_333": await handleOrderFollowup333(text); return;
      case "product_step1": await handleProductStep1(text); return;
      case "product_step2": await handleProductStep2(text); return;
      case "handoff": await handleHandoffChat(text); return;
      case "returns_done":
      case "main":
      default: await handleMainIntent(text, raw); return;
    }
  }

  // ---------- Wiring ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var val = input.value.trim();
    if (!val) return;
    switchToChat();
    addMessage(val, "user");
    input.value = "";
    handle(val);
  });

  document.querySelectorAll(".action-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var intent = card.getAttribute("data-intent");
      var label = card.querySelector(".card-label").textContent;
      switchToChat();
      addMessage(label, "user");
      handle(intent);
    });
  });

  backBtn.addEventListener("click", function () {
    switchToHub();
  });

  // ---------- Voice input (Web Speech API, progressive enhancement) ----------
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    var recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    var listening = false;

    recognition.addEventListener("result", function (e) {
      var transcript = e.results[0][0].transcript;
      input.value = transcript;
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
    recognition.addEventListener("end", function () {
      listening = false;
      micBtn.classList.remove("listening");
    });
    recognition.addEventListener("error", function () {
      listening = false;
      micBtn.classList.remove("listening");
    });

    micBtn.addEventListener("click", function () {
      if (listening) {
        recognition.stop();
        return;
      }
      listening = true;
      micBtn.classList.add("listening");
      try { recognition.start(); } catch (e) { listening = false; micBtn.classList.remove("listening"); }
    });
  } else {
    micBtn.title = "Voice input isn't supported in this browser";
    micBtn.addEventListener("click", function () {
      input.placeholder = "Voice input isn't supported here — just type instead";
    });
  }

  // ---------- Boot ----------
  renderHistory();
})();
