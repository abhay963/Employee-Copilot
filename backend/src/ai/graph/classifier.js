import { z } from "zod";
import geminiLLM from "../llm/gemini.js";

// ============================================================
// VALID INTENTS
// ============================================================

export const VALID_INTENTS = [
  "leave_balance",
  "leave_policy",
  "leave_request",

  "calendar_events",
  "calendar_create",

  "gmail_read",
  "gmail_send",

  "web_search",

  "general",
];

// ============================================================
// ZOD INTENT SCHEMA
// ============================================================

const IntentSchema = z.enum([
  "leave_balance",
  "leave_policy",
  "leave_request",

  "calendar_events",
  "calendar_create",

  "gmail_read",
  "gmail_send",

  "web_search",

  "general",
]);

// ============================================================
// CLASSIFIER
// ============================================================

export async function classifyIntent(userMessage) {
  const text = String(userMessage || "")
    .trim()
    .toLowerCase();

  // ==========================================================
  // LEAVE BALANCE
  // ==========================================================

  if (
    /\b(leave balance|leaves balance|how many leaves|how much leave|remaining leave|leave remaining)\b/i.test(
      text
    )
  ) {
    return "leave_balance";
  }

  // ==========================================================
  // LEAVE POLICY
  // ==========================================================

  if (
    /\b(leave policy|leave rules|leave entitlement|leave procedure|leave guidelines)\b/i.test(
      text
    )
  ) {
    return "leave_policy";
  }

  // ==========================================================
  // LEAVE REQUEST
  // ==========================================================

  if (
    /\b(give me leave|grant me leave|i need leave|i want leave|take leave|request leave|apply for leave|apply leave|get leave|need to take leave|want to take leave|can i get leave|please give me leave)\b/i.test(
      text
    )
  ) {
    return "leave_request";
  }

  // ==========================================================
  // CALENDAR QUERY
  // ==========================================================

  if (
    /\b(meeting|calendar|schedule|appointment|event)\b/i.test(text) &&
    /\b(today|tomorrow|this week|next week|this month|upcoming|next \d+ days|am i free|am i available|do i have|show|what|list|check)\b/i.test(
      text
    )
  ) {
    return "calendar_events";
  }

  // ==========================================================
  // CALENDAR CREATE
  // ==========================================================

  if (
    /\b(schedule|create|add|set up|book|arrange)\b/i.test(text) &&
    /\b(meeting|appointment|event|call|discussion)\b/i.test(text) &&
    !/\b(do i have|am i free|am i available|show|what|list|check)\b/i.test(
      text
    )
  ) {
    return "calendar_create";
  }

  // ==========================================================
  // GMAIL
  // ==========================================================

  if (
    /\b(email|gmail|mail|inbox)\b/i.test(text)
  ) {
    if (
      /\b(send|write|compose|draft)\b/i.test(text)
    ) {
      return "gmail_send";
    }

    return "gmail_read";
  }

  // ==========================================================
  // WEB SEARCH
  // ==========================================================

  if (
    /\b(latest|current|today|recent|internet|web search|online)\b/i.test(
      text
    )
  ) {
    return "web_search";
  }

  // ==========================================================
  // LLM FALLBACK
  // ==========================================================

  const prompt = `
Classify this Employee Copilot request into exactly one category.

Categories:

leave_balance
leave_policy
leave_request
calendar_events
calendar_create
gmail_read
gmail_send
web_search
general

Return ONLY the category.

User:
${userMessage}
`;

  try {
    const response = await geminiLLM.invoke(prompt);

    const rawIntent = String(
      response?.content || ""
    )
      .trim()
      .toLowerCase()
      .replace(/[`"' ]/g, "");

    // ========================================================
    // ZOD VALIDATION
    // ========================================================

    const result = IntentSchema.safeParse(rawIntent);

    if (result.success) {
      return result.data;
    }

    console.warn(
      "[Intent] Invalid LLM classification:",
      rawIntent
    );
  } catch (error) {
    console.error(
      "[Intent] Classification failed:",
      error
    );
  }

  // ==========================================================
  // SAFE FALLBACK
  // ==========================================================

  return "general";
}

// ============================================================
// LANGGRAPH NODE
// ============================================================

export async function classifyIntentNode(state) {
  const lastMessage =
    state.messages[
      state.messages.length - 1
    ];

  const intent = await classifyIntent(
    lastMessage?.content
  );

  console.log(
    "[LangGraph] Intent:",
    intent
  );

  return {
    intent,
  };
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  classifyIntent,
  classifyIntentNode,
  VALID_INTENTS,
};