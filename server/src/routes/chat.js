// ---- Live chat routes ----
// Public (customer) endpoints are scoped by an opaque session token — no login.
// Admin endpoints require a JWT (mounted under /api/admin/chat with requireAuth).
import { Router } from "express";
import * as store from "../store.js";
import { requireAuth } from "../auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 4000;

function validBody(b) {
  return typeof b === "string" && b.trim().length >= 1 && b.trim().length <= MAX_BODY;
}

// ---------------------------------------------------------------------------
// Public customer router (mounted at /api/chat)
// ---------------------------------------------------------------------------
export const publicChatRouter = Router();

// POST /api/chat/conversations — start a conversation (name + email, no login).
publicChatRouter.post("/conversations", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const message = req.body?.message;
    if (name.length < 2) return res.status(400).json({ error: "Please enter your name." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });

    const { conversation, sessionToken } = await store.createConversation(name, email);
    // Optional first message included in the same request.
    if (validBody(message)) {
      await store.addChatMessage(conversation.id, "customer", message.trim());
    }
    res.status(201).json({ conversationId: conversation.id, sessionToken });
  } catch (err) { next(err); }
});

// Resolve + authorize the conversation from :id and ?token=.
async function authorizeCustomer(req, res, next) {
  try {
    const token = req.query.token || req.headers["x-chat-token"];
    if (!token) return res.status(401).json({ error: "Missing chat token" });
    const conv = await store.getConversationForToken(req.params.id, String(token));
    if (!conv) return res.status(403).json({ error: "Not authorized for this conversation" });
    req.conversation = conv;
    next();
  } catch (err) { next(err); }
}

// GET /api/chat/conversations/:id/messages?token=&after= — poll messages.
publicChatRouter.get("/conversations/:id/messages", authorizeCustomer, async (req, res, next) => {
  try {
    const messages = await store.listChatMessages(req.params.id, req.query.after);
    // Viewing the thread clears the customer's unread counter.
    await store.markCustomerRead(req.params.id);
    res.json({ messages, customerUnread: 0 });
  } catch (err) { next(err); }
});

// POST /api/chat/conversations/:id/messages?token= — customer sends a message.
publicChatRouter.post("/conversations/:id/messages", authorizeCustomer, async (req, res, next) => {
  try {
    const body = req.body?.body;
    if (!validBody(body)) return res.status(400).json({ error: "Message must be 1–4000 characters." });
    const msg = await store.addChatMessage(req.params.id, "customer", body.trim());
    res.status(201).json(msg);
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Admin router (mounted at /api/admin/chat — requireAuth applied at mount)
// ---------------------------------------------------------------------------
export const adminChatRouter = Router();

// GET /api/admin/chat/conversations — list all conversations (newest activity first).
adminChatRouter.get("/conversations", async (req, res, next) => {
  try {
    res.json(await store.listConversations());
  } catch (err) { next(err); }
});

// GET /api/admin/chat/conversations/:id/messages — full thread (marks admin-read).
adminChatRouter.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const conv = await store.getConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    const messages = await store.listChatMessages(req.params.id, req.query.after);
    if (!req.query.after) await store.markAdminRead(req.params.id);
    res.json({ conversation: conv, messages });
  } catch (err) { next(err); }
});

// POST /api/admin/chat/conversations/:id/messages — admin reply.
adminChatRouter.post("/conversations/:id/messages", async (req, res, next) => {
  try {
    const conv = await store.getConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    const body = req.body?.body;
    if (!validBody(body)) return res.status(400).json({ error: "Message must be 1–4000 characters." });
    const msg = await store.addChatMessage(req.params.id, "admin", body.trim());
    res.status(201).json(msg);
  } catch (err) { next(err); }
});
