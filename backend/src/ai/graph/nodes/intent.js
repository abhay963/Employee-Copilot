// ============================================================
// EMPLOYEE COPILOT - INTENT CLASSIFIER
// ============================================================
//
// Responsibility:
//
// This file ONLY determines what the user wants.
//
// Example:
//
// "How many leaves do I have?"
//              ↓
//        leave_balance
//
// "Show my emails"
//              ↓
//        gmail_read
//
// "Book a meeting tomorrow"
//              ↓
//        calendar_create
//
// Routing is handled separately by:
//
//     ../router.js
//
// ============================================================

import { z } from "zod";
import geminiLLM from "../../llm/gemini.js";


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
//
// Zod guarantees that the LLM output is one of the
// intents supported by our application.
//
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
// CLASSIFY INTENT
// ============================================================
//
// Flow:
//
// user message
//      ↓
// deterministic rules
//      ↓
// if no match
//      ↓
// Gemini LLM
//      ↓
// Zod validation
//      ↓
// valid intent
//
// ============================================================

export async function classifyIntent(userMessage) {

  const text = String(userMessage || "")
    .trim()
    .toLowerCase();


  // ==========================================================
  // LEAVE BALANCE
  // ==========================================================

  if (
    /\b(leave balance|leaves balance|how many leaves|how much leave|remaining leave|leave remaining)\b/i.test(text)
  ) {
    return "leave_balance";
  }


  // ==========================================================
  // LEAVE POLICY
  // ==========================================================

  if (
    /\b(leave policy|leave rules|leave entitlement|leave procedure|leave guidelines)\b/i.test(text)
  ) {
    return "leave_policy";
  }


  // ==========================================================
  // LEAVE REQUEST
  // ==========================================================

  if (
    /\b(give me leave|grant me leave|i need leave|i want leave|take leave|request leave|apply for leave|apply leave|get leave|need to take leave|want to take leave|can i get leave|please give me leave)\b/i.test(text)
  ) {
    return "leave_request";
  }


  // ==========================================================
  // CALENDAR QUERY
  // ==========================================================
  //
  // Example:
  //
  // "What meetings do I have tomorrow?"
  // "Show my calendar today"
  // "Am I free this afternoon?"
  //
  // ==========================================================

  if (
    /\b(meeting|calendar|schedule|appointment|event)\b/i.test(text) &&
    /\b(today|tomorrow|this week|next week|this month|upcoming|next \d+ days|am i free|am i available|do i have|show|what|list|check)\b/i.test(text)
  ) {
    return "calendar_events";
  }


  // ==========================================================
  // CALENDAR CREATE
  // ==========================================================
  //
  // Example:
  //
  // "Schedule a meeting tomorrow"
  // "Create a meeting with HR"
  //
  // ==========================================================

  if (
    /\b(schedule|create|add|set up|book|arrange)\b/i.test(text) &&
    /\b(meeting|appointment|event|call|discussion)\b/i.test(text) &&
    !/\b(do i have|am i free|am i available|show|what|list|check)\b/i.test(text)
  ) {
    return "calendar_create";
  }


  // ==========================================================
  // GMAIL
  // ==========================================================
  //
  // Example:
  //
  // "Show my emails"
  //       ↓
  // gmail_read
  //
  // "Send an email to HR"
  //       ↓
  // gmail_send
  //
  // ==========================================================

  if (
    /\b(email|gmail|mail|inbox)\b/i.test(text)
  ) {

    // --------------------------------------------------------
    // Gmail SEND
    // --------------------------------------------------------

    if (
      /\b(send|write|compose|draft)\b/i.test(text)
    ) {
      return "gmail_send";
    }


    // --------------------------------------------------------
    // Gmail READ
    // --------------------------------------------------------

    return "gmail_read";
  }


  // ==========================================================
  // WEB SEARCH
  // ==========================================================
  //
  // Public/current information.
  //
  // Example:
  //
  // "What is the latest news?"
  // "Search online for..."
  //
  // ==========================================================

  if (
    /\b(latest|current|today|recent|internet|web search|online)\b/i.test(text)
  ) {
    return "web_search";
  }


  // ==========================================================
  // LLM FALLBACK
  // ==========================================================
  //
  // If deterministic rules cannot identify the intent,
  // ask Gemini.
  //
  // ==========================================================

  const prompt = `
You are an intent classifier for an Employee Copilot.

Classify the user's request into EXACTLY ONE of these categories:

leave_balance
leave_policy
leave_request
calendar_events
calendar_create
gmail_read
gmail_send
web_search
general

Definitions:

leave_balance:
User wants to know their personal leave balance.

leave_policy:
User asks about company leave policies, rules,
entitlements, procedures, or guidelines.

leave_request:
User wants to apply for or request leave.

calendar_events:
User wants to view, check, or search calendar events,
meetings, appointments, availability, or schedule.

calendar_create:
User wants to create, schedule, book, or arrange
a meeting, appointment, event, or call.

gmail_read:
User wants to read, search, or inspect emails.

gmail_send:
User wants to send, write, compose, or draft an email.

web_search:
User wants current, recent, online, or public internet
information.

general:
Casual conversation or a request that does not belong
to the other categories.

Return ONLY the category name.

User:
${userMessage}
`;


  try {

    const response =
      await geminiLLM.invoke(prompt);


    // --------------------------------------------------------
    // Normalize LLM response
    // --------------------------------------------------------

    const rawIntent =
      String(response?.content || "")
        .trim()
        .toLowerCase()
        .replace(/[`"' ]/g, "");


    // --------------------------------------------------------
    // Validate using Zod
    // --------------------------------------------------------

    const result =
      IntentSchema.safeParse(rawIntent);


    if (result.success) {

      console.log(
        `[Intent] LLM classified as: ${result.data}`
      );

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

  console.log(
    "[Intent] Fallback to general"
  );

  return "general";
}


// ============================================================
// LANGGRAPH NODE
// ============================================================
//
// This converts the classifier into a LangGraph node.
//
// Input:
//
// state.messages
//
// Output:
//
// {
//   intent: "gmail_read"
// }
//
// ============================================================

export async function classifyIntentNode(state) {

  const messages =
    Array.isArray(state?.messages)
      ? state.messages
      : [];


  const lastMessage =
    messages[messages.length - 1];


  const intent =
    await classifyIntent(
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
// ROUTING FUNCTION
// ============================================================

export function routeByIntent(state) {
  if (!state?.intent) {
    console.warn(
      "[Router] No intent found. Falling back to general."
    );

    return "general";
  }

  const intent = state.intent;

  console.log(
    `[IntentRouter] Routing intent: ${intent}`
  );

  return intent;
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  classifyIntent,
  classifyIntentNode,
  routeByIntent,
  VALID_INTENTS,
};