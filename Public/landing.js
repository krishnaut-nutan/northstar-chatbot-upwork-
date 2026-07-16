(function () {
  "use strict";

  var launcher = document.getElementById("chatLauncher");
  var launcherBadge = document.getElementById("launcherBadge");
  var launcherTip = document.getElementById("launcherTip");
  var overlay = document.getElementById("chatOverlay");
  var panel = document.getElementById("chatPanel");
  var closeBtn = document.getElementById("chatPanelClose");
  var frame = document.getElementById("chatFrame");

  var triggerIds = ["navChatBtn", "heroChatBtn", "gearChatBtn", "footerChatBtn"];
  var isOpen = false;

  function hideTip() {
    if (!launcherTip.hidden) launcherTip.hidden = true;
  }

  function openChat() {
    if (frame.getAttribute("src") === "about:blank" || !frame.getAttribute("src")) {
      frame.src = "/chatbot.html";
    }
    overlay.hidden = false;
    panel.hidden = false;
    isOpen = true;
    launcher.setAttribute("aria-expanded", "true");
    launcherBadge.hidden = true;
    hideTip();
    closeBtn.focus();
  }

  function closeChat() {
    overlay.hidden = true;
    panel.hidden = true;
    isOpen = false;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (isOpen) { closeChat(); } else { openChat(); }
  });
  closeBtn.addEventListener("click", closeChat);
  overlay.addEventListener("click", closeChat);

  triggerIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", openChat);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeChat();
  });

  // Auto-fade the "need help?" tooltip after a few seconds, or on first scroll/click.
  var tipTimer = setTimeout(hideTip, 6000);
  window.addEventListener("scroll", function onScroll() {
    hideTip();
    window.removeEventListener("scroll", onScroll);
  }, { once: true, passive: true });
})();
