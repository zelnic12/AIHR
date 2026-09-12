// ---- Storefront live chat widget (customer side) ----
// Bottom-right bubble → panel. No login: the customer gives a name + email to
// start, then a session token is stored in localStorage. Polls every few
// seconds for admin replies (v1 — no WebSocket).
(function () {
  const API = "/api";
  const LS_KEY = "sinar_chat_session"; // { conversationId, sessionToken, name, email }
  const POLL_MS = 4000;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let session = null;
  try { session = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { session = null; }
  let pollTimer = null;
  let lastId = 0;
  let open = false;

  // ---- Build DOM ----
  const root = document.createElement("div");
  root.className = "chat-widget";
  root.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-label="Chat with us">
      <span class="chat-fab-icon">💬</span>
    </button>
    <div class="chat-panel" id="chatPanel" role="dialog" aria-label="Customer support chat" hidden>
      <div class="chat-head">
        <div>
          <strong>Sinar Elektronik</strong>
          <span class="chat-head-sub">We usually reply quickly</span>
        </div>
        <button class="chat-close" id="chatClose" aria-label="Close chat">✕</button>
      </div>
      <div class="chat-body" id="chatBody"></div>
    </div>`;
  document.body.appendChild(root);

  const fab = root.querySelector("#chatFab");
  const panel = root.querySelector("#chatPanel");
  const body = root.querySelector("#chatBody");

  function renderStartForm() {
    body.innerHTML = `
      <div class="chat-intro">
        <p>Hi! 👋 Send us a message and our team will get back to you.</p>
      </div>
      <form class="chat-start" id="chatStart">
        <input id="chatName" placeholder="Your name" autocomplete="name" required />
        <input id="chatEmail" type="email" placeholder="Your email" autocomplete="email" required />
        <textarea id="chatFirstMsg" placeholder="How can we help?" rows="3" required></textarea>
        <p class="chat-error" id="chatErr" hidden></p>
        <button type="submit" class="btn btn-primary btn-block">Start chat</button>
      </form>`;
    body.querySelector("#chatStart").addEventListener("submit", startConversation);
  }

  function renderThreadShell() {
    body.innerHTML = `
      <div class="chat-messages" id="chatMessages"></div>
      <form class="chat-compose" id="chatCompose">
        <input id="chatInput" placeholder="Type a message…" autocomplete="off" required />
        <button type="submit" class="chat-send" aria-label="Send">➤</button>
      </form>`;
    body.querySelector("#chatCompose").addEventListener("submit", sendMessage);
  }

  function bubble(m) {
    const who = m.sender === "admin" ? "admin" : "me";
    return `<div class="chat-msg ${who}"><span class="chat-msg-body">${esc(m.body)}</span></div>`;
  }

  function appendMessages(messages) {
    if (!messages.length) return;
    const list = body.querySelector("#chatMessages");
    if (!list) return;
    list.insertAdjacentHTML("beforeend", messages.map(bubble).join(""));
    lastId = Math.max(lastId, ...messages.map(m => m.id));
    list.scrollTop = list.scrollHeight;
  }

  async function startConversation(e) {
    e.preventDefault();
    const name = body.querySelector("#chatName").value.trim();
    const email = body.querySelector("#chatEmail").value.trim();
    const message = body.querySelector("#chatFirstMsg").value.trim();
    const err = body.querySelector("#chatErr");
    err.hidden = true;
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start chat.");
      session = { conversationId: data.conversationId, sessionToken: data.sessionToken, name, email };
      localStorage.setItem(LS_KEY, JSON.stringify(session));
      lastId = 0;
      renderThreadShell();
      poll();
      startPolling();
    } catch (e2) {
      err.textContent = e2.message; err.hidden = false;
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const input = body.querySelector("#chatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    // Optimistic render.
    appendMessages([{ id: 0, sender: "customer", body: text }]);
    try {
      await fetch(`${API}/chat/conversations/${session.conversationId}/messages?token=${encodeURIComponent(session.sessionToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      poll();
    } catch { /* will retry on next poll */ }
  }

  async function poll() {
    if (!session) return;
    try {
      const res = await fetch(`${API}/chat/conversations/${session.conversationId}/messages?token=${encodeURIComponent(session.sessionToken)}&after=${lastId}`);
      if (res.status === 403 || res.status === 401) {
        // Session no longer valid — reset to the start form.
        localStorage.removeItem(LS_KEY); session = null;
        if (open) renderStartForm();
        stopPolling();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.messages) appendMessages(data.messages);
    } catch { /* transient; try again next tick */ }
  }

  function startPolling() { stopPolling(); pollTimer = setInterval(poll, POLL_MS); }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function openPanel() {
    open = true;
    panel.hidden = false;
    fab.classList.add("active");
    if (session) {
      // Reload the whole thread (lastId 0) so history shows on reopen.
      lastId = 0;
      renderThreadShell();
      poll();
      startPolling();
    } else {
      renderStartForm();
    }
  }
  function closePanel() {
    open = false;
    panel.hidden = true;
    fab.classList.remove("active");
    stopPolling();
  }

  fab.addEventListener("click", () => (open ? closePanel() : openPanel()));
  root.querySelector("#chatClose").addEventListener("click", closePanel);
})();
