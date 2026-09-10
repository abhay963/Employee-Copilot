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
// "Send an email to rahul@gmail.com about tomorrow's meeting"
//              ↓
//        gmail_send
//
// "Book a meeting tomorrow"
//              ↓
//        calendar_create
//
// ============================================================
//
// ARCHITECTURE:
//
// User Message
//      ↓
// Gemini LLM
//      ↓
// JSON extraction
//      ↓
// Zod validation
//      ↓
// Valid Intent
//      ↓
// LangGraph State
//      ↓
// Router
//
// ============================================================
//
// IMPORTANT:
//
// We are NOT using regex for intent classification.
//
// Why?
//
// A user message can contain multiple domain keywords.
//
// Example:
//
// "Send an email about tomorrow's meeting"
//
// Contains:
// - email
// - meeting
// - tomorrow
//
// But MAIN ACTION = SEND EMAIL
//
// Therefore:
// gmail_send
//
// ============================================================


import { z } from "zod";
import geminiLLM from "../../llm/gemini.js";


// ============================================================
// VALID INTENTS
// ============================================================
//
// Ye application ke saare supported intents hain.
//
// LLM ko inhi intents mein se EXACTLY ONE choose karna hai.
//
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
// LLM probabilistic hota hai.
//
// Isliye LLM ke output ko directly router ko dena safe nahi hai.
//
// Example:
//
// Gemini could return:
//
// "email_send"
//
// Lekin hamare application mein valid intent hai:
//
// "gmail_send"
//
// Zod invalid value ko reject karega.
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
// COMPLETE LLM RESPONSE SCHEMA
// ============================================================
//
// Expected Gemini response:
//
// {
//   "intent": "gmail_send",
//   "reason": "The user wants to send an email.",
//   "confidence": 0.98
// }
//
// `reason` aur `confidence` debugging ke liye useful hain.
//
// Actual routing ke liye hum sirf `intent` use karenge.
//
// ============================================================

const IntentResponseSchema = z.object({

  // ----------------------------------------------------------
  // Actual intent
  // ----------------------------------------------------------

  intent: IntentSchema,


  // ----------------------------------------------------------
  // Short explanation
  // ----------------------------------------------------------

  reason: z
    .string()
    .optional()
    .default(""),


  // ----------------------------------------------------------
  // Model confidence
  // ----------------------------------------------------------
  //
  // Ye informational hai.
  //
  // Isko blindly trust nahi karna chahiye.
  //
  // ----------------------------------------------------------

  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0),

});


// ============================================================
// EXTRACT JSON FROM LLM RESPONSE
// ============================================================
//
// Gemini generally JSON return karega.
//
// Lekin kabhi-kabhi model ye return kar sakta hai:
//
// ```json
// {
//   "intent": "gmail_send"
// }
// ```
//
// Isliye hum code fences remove karenge.
//
// Ye function array/object/string response ko bhi handle karta hai.
//
// ============================================================

function extractJSON(content) {

  let text = "";


  // ==========================================================
  // CASE 1: CONTENT IS STRING
  // ==========================================================

  if (typeof content === "string") {

    text = content.trim();

  }


  // ==========================================================
  // CASE 2: CONTENT IS ARRAY
  // ==========================================================
  //
  // Kuch LangChain model responses content blocks ke form
  // mein aa sakte hain.
  //
  // ==========================================================

  else if (Array.isArray(content)) {

    text = content
      .map((item) => {

        if (typeof item === "string") {
          return item;
        }

        return item?.text || "";

      })
      .join("")
      .trim();

  }


  // ==========================================================
  // CASE 3: CONTENT IS OBJECT
  // ==========================================================

  else if (
    content &&
    typeof content === "object"
  ) {

    text =
      content.text ||
      content.content ||
      "";

    text =
      String(text).trim();

  }


  // ==========================================================
  // EMPTY RESPONSE
  // ==========================================================

  if (!text) {

    return null;

  }


  // ==========================================================
  // REMOVE MARKDOWN CODE FENCE
  // ==========================================================

  text =
    text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


  // ==========================================================
  // TRY DIRECT JSON PARSING
  // ==========================================================

  try {

    return JSON.parse(text);

  } catch {
    // Continue to fallback extraction
  }


  // ==========================================================
  // FALLBACK:
  // FIND FIRST { AND LAST }
  // ==========================================================

  const start =
    text.indexOf("{");

  const end =
    text.lastIndexOf("}");


  if (
    start === -1 ||
    end === -1 ||
    end <= start
  ) {

    return null;

  }


  const jsonText =
    text.slice(
      start,
      end + 1
    );


  // ==========================================================
  // TRY PARSING EXTRACTED JSON
  // ==========================================================

  try {

    return JSON.parse(jsonText);

  } catch (error) {

    console.warn(
      "[Intent] JSON parsing failed:",
      error
    );

    return null;

  }

}


// ============================================================
// BUILD INTENT CLASSIFICATION PROMPT
// ============================================================
//
// Ye prompt classifier ka brain hai.
//
// Most important concept:
//
// MAIN ACTION > CONTEXT
//
// ============================================================

function buildIntentPrompt(userMessage) {

  return `
You are the intent classifier for an Employee Copilot.

Your ONLY job is to understand the user's request and classify
it into EXACTLY ONE supported intent.

Do NOT execute any action.

Do NOT write an email.

Do NOT create a calendar event.

Do NOT answer the user's question.

ONLY classify the intent.

============================================================
SUPPORTED INTENTS
============================================================

leave_balance

leave_policy

leave_request

calendar_events

calendar_create

gmail_read

gmail_send

web_search

general


============================================================
1. leave_balance
============================================================

Use this when the user wants to know their PERSONAL
remaining leave balance.

Examples:

"How many leaves do I have?"

"How much leave is remaining?"

"How many vacation days are left for me?"

"How many leaves are left in my account?"


============================================================
2. leave_policy
============================================================

Use this when the user asks about COMPANY leave policies,
rules, entitlements, procedures, or guidelines.

Examples:

"What is the leave policy?"

"What are the rules for sick leave?"

"How many casual leaves are allowed?"

"What is the leave entitlement?"


============================================================
3. leave_request
============================================================

Use this when the user wants to APPLY FOR, REQUEST,
or TAKE leave.

Examples:

"I want to take leave tomorrow"

"Apply leave for Friday"

"I need two days off"

"Can I take leave next Monday?"

"Please request leave for tomorrow"


============================================================
4. calendar_events
============================================================

Use this when the user wants to VIEW, CHECK, SEARCH,
or inspect EXISTING calendar events.

This includes:

- meetings
- appointments
- events
- schedules
- availability

Examples:

"What meetings do I have tomorrow?"

"Show my calendar"

"Am I free tomorrow at 3 PM?"

"Do I have any meetings today?"

"What is on my schedule this week?"

"Check my calendar"


IMPORTANT:

calendar_events means the user wants information about
an EXISTING calendar.

It does NOT mean creating a new event.


============================================================
5. calendar_create
============================================================

Use this when the user wants to CREATE, SCHEDULE, BOOK,
ADD, or ARRANGE a NEW calendar event.

Examples:

"Schedule a meeting tomorrow"

"Book a meeting with HR"

"Create an appointment for Friday"

"Add a meeting at 3 PM"

"Arrange a call with my manager"


IMPORTANT:

calendar_create means the user wants to CREATE something new.


============================================================
6. gmail_read
============================================================

Use this when the user wants to READ, VIEW, SEARCH,
or inspect EXISTING emails.

Examples:

"Show my emails"

"Do I have unread emails?"

"Search my inbox"

"Find emails from HR"

"Show my recent Gmail messages"


IMPORTANT:

gmail_read means the user wants information from
EXISTING emails.


============================================================
7. gmail_send
============================================================

Use this when the user wants to SEND, WRITE, COMPOSE,
or DRAFT an email.

Examples:

"Send an email to HR"

"Write an email to my manager"

"Draft an email about my leave"

"Send an email about tomorrow's meeting"

"Write to Rahul"


IMPORTANT:

MAIN ACTION HAS PRIORITY OVER TOPIC OR CONTEXT.


Example:

"Send an email to rahul@gmail.com about tomorrow's meeting"

The message contains:

- email
- tomorrow
- meeting

But the MAIN ACTION is:

SEND EMAIL

Therefore:

gmail_send


Another example:

"Write an email to HR about my calendar meeting"

MAIN ACTION:

WRITE EMAIL

Therefore:

gmail_send


Another example:

"Send an email to my manager about my leave"

MAIN ACTION:

SEND EMAIL

Therefore:

gmail_send

NOT leave_request.

NOT calendar_events.


============================================================
8. web_search
============================================================

Use this when the user wants CURRENT, RECENT, PUBLIC,
ONLINE, or INTERNET information.

Examples:

"What is the latest AI news?"

"Search the internet for today's technology news"

"What happened recently?"

"Search online for the latest information"


IMPORTANT:

web_search is for PUBLIC/ONLINE information.

Do not use web_search for the user's private Gmail,
calendar, leave balance, or company data.


============================================================
9. general
============================================================

Use this for:

- greetings
- casual conversation
- general conversation
- questions that don't fit another intent

Examples:

"Hello"

"How are you?"

"Tell me a joke"

"Good morning"


============================================================
IMPORTANT CLASSIFICATION RULES
============================================================

RULE 1:

Understand the USER'S MAIN ACTION.

Do not classify based only on individual keywords.


RULE 2:

Context words must NOT override the main action.


Example:

"Send an email about tomorrow's meeting"

Main action:

SEND EMAIL

Context:

tomorrow's meeting

Intent:

gmail_send


RULE 3:

If the user wants to SEND, WRITE, COMPOSE, or DRAFT
an email, choose gmail_send.

Even if the email contains words like:

meeting
calendar
leave
appointment
tomorrow
schedule


RULE 4:

If the user wants to CREATE, SCHEDULE, BOOK, ADD,
or ARRANGE a new meeting/event/call, choose:

calendar_create


RULE 5:

If the user wants to VIEW or CHECK an existing
meeting/event/calendar, choose:

calendar_events


RULE 6:

If the user wants to APPLY FOR or TAKE leave,
choose:

leave_request


RULE 7:

If the user wants to know their remaining leave,
choose:

leave_balance


RULE 8:

If the user asks about company leave rules or policy,
choose:

leave_policy


RULE 9:

Do NOT confuse topic with action.


Example:

"Write an email about my meeting"

Correct:

gmail_send


NOT:

calendar_events


Example:

"Book a meeting to discuss my leave"

Correct:

calendar_create


NOT:

leave_request


Example:

"Send an email asking about leave policy"

Correct:

gmail_send


NOT:

leave_policy


RULE 10:

If the request is genuinely ambiguous, select the most
likely intent based on the MAIN ACTION.

If there is no reasonable matching intent:

general


============================================================
IMPORTANT EXAMPLES
============================================================

User:
"How many leaves do I have?"

Intent:
leave_balance


User:
"I want to take leave tomorrow"

Intent:
leave_request


User:
"What is our leave policy?"

Intent:
leave_policy


User:
"What meetings do I have tomorrow?"

Intent:
calendar_events


User:
"Am I free tomorrow afternoon?"

Intent:
calendar_events


User:
"Schedule a meeting tomorrow"

Intent:
calendar_create


User:
"Book a meeting with HR"

Intent:
calendar_create


User:
"Show my emails"

Intent:
gmail_read


User:
"Find emails from my manager"

Intent:
gmail_read


User:
"Send an email to rahul@gmail.com"

Intent:
gmail_send


User:
"Send an email to rahul@gmail.com about tomorrow's meeting"

Intent:
gmail_send


User:
"Write an email to HR about my meeting"

Intent:
gmail_send


User:
"Send an email to my manager asking about leave"

Intent:
gmail_send


User:
"Book a meeting to discuss my leave"

Intent:
calendar_create


User:
"What is the latest AI news?"

Intent:
web_search


User:
"Hello"

Intent:
general


============================================================
OUTPUT FORMAT
============================================================

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT add explanations outside JSON.

Required format:

{
  "intent": "one_supported_intent",
  "reason": "short explanation",
  "confidence": 0.0
}

The "intent" MUST be exactly one of:

leave_balance
leave_policy
leave_request
calendar_events
calendar_create
gmail_read
gmail_send
web_search
general

The "confidence" must be a number between 0 and 1.

============================================================
USER MESSAGE
============================================================

${userMessage}
`;
}


// ============================================================
// CLASSIFY INTENT
// ============================================================
//
// Complete flow:
//
// User message
//      ↓
// Gemini
//      ↓
// JSON extraction
//      ↓
// Zod validation
//      ↓
// Intent
//
// If Gemini fails:
//
//      ↓
// general
//
// ============================================================

export async function classifyIntent(userMessage) {

  // ==========================================================
  // STEP 1: NORMALIZE INPUT
  // ==========================================================

  const text =
    String(userMessage || "").trim();


  // ==========================================================
  // EMPTY MESSAGE
  // ==========================================================

  if (!text) {

    console.warn(
      "[Intent] Empty user message."
    );

    return "general";

  }


  // ==========================================================
  // STEP 2: BUILD PROMPT
  // ==========================================================

  const prompt =
    buildIntentPrompt(text);


  // ==========================================================
  // STEP 3: CALL GEMINI
  // ==========================================================

  try {

    console.log(
      "[Intent] Calling Gemini classifier..."
    );


    const response =
      await geminiLLM.invoke(prompt);


    // ========================================================
    // STEP 4: GET RESPONSE CONTENT
    // ========================================================

    const rawContent =
      response?.content;


    console.log(
      "[Intent] Raw Gemini response:",
      rawContent
    );


    // ========================================================
    // STEP 5: EXTRACT JSON
    // ========================================================

    const parsedJSON =
      extractJSON(rawContent);


    if (!parsedJSON) {

      console.warn(
        "[Intent] Gemini returned invalid JSON."
      );

      return "general";

    }


    // ========================================================
    // STEP 6: ZOD VALIDATION
    // ========================================================

    const validation =
      IntentResponseSchema.safeParse(
        parsedJSON
      );


    // ========================================================
    // INVALID RESPONSE
    // ========================================================

    if (!validation.success) {

      console.warn(
        "[Intent] Invalid Gemini intent:",
        validation.error.flatten()
      );

      return "general";

    }


    // ========================================================
    // STEP 7: GET VALIDATED DATA
    // ========================================================

    const {
      intent,
      reason,
      confidence,
    } = validation.data;


    // ========================================================
    // LOG RESULT
    // ========================================================

    console.log(
      "[Intent] Classification successful:",
      {
        intent,
        confidence,
        reason,
      }
    );


    // ========================================================
    // STEP 8: RETURN INTENT
    // ========================================================
    //
    // Router ko sirf intent chahiye.
    //
    // Example:
    //
    // "gmail_send"
    //
    // ========================================================

    return intent;


  } catch (error) {

    // ========================================================
    // GEMINI ERROR
    // ========================================================

    console.error(
      "[Intent] Gemini classification failed:",
      error
    );


    // ========================================================
    // SAFE FALLBACK
    // ========================================================

    console.log(
      "[Intent] Falling back to general."
    );


    return "general";

  }
}


// ============================================================
// LANGGRAPH NODE
// ============================================================
//
// LangGraph state:
//
// {
//   messages: [...]
// }
//
// Node:
//
// classifyIntentNode()
//
// Output:
//
// {
//   intent: "gmail_send"
// }
//
// ============================================================

export async function classifyIntentNode(state) {

  // ==========================================================
  // GET MESSAGES
  // ==========================================================

  const messages =
    Array.isArray(state?.messages)
      ? state.messages
      : [];


  // ==========================================================
  // NO MESSAGES
  // ==========================================================

  if (messages.length === 0) {

    console.warn(
      "[LangGraph] No messages available for intent classification."
    );


    return {
      intent: "general",
    };

  }


  // ==========================================================
  // GET LAST MESSAGE
  // ==========================================================
  //
  // Usually last message current user request hota hai.
  //
  // ==========================================================

  const lastMessage =
    messages[messages.length - 1];


  // ==========================================================
  // GET USER MESSAGE CONTENT
  // ==========================================================

  const userMessage =
    lastMessage?.content;


  // ==========================================================
  // CLASSIFY
  // ==========================================================

  const intent =
    await classifyIntent(
      userMessage
    );


  // ==========================================================
  // LOG
  // ==========================================================

  console.log(
    "[LangGraph] Detected Intent:",
    intent
  );


  // ==========================================================
  // RETURN UPDATED STATE
  // ==========================================================

  return {
    intent,
  };

}


// ============================================================
// ROUTING FUNCTION
// ============================================================
//
// LangGraph conditional routing:
//
// classifyIntentNode
//          ↓
//      state.intent
//          ↓
//     routeByIntent
//          ↓
//    appropriate node
//
// Example:
//
// gmail_send
//     ↓
// Gmail Send Flow
//
// calendar_create
//     ↓
// Calendar Create Flow
//
// ============================================================

export function routeByIntent(state) {

  // ==========================================================
  // CHECK INTENT EXISTS
  // ==========================================================

  if (!state?.intent) {

    console.warn(
      "[IntentRouter] No intent found. Using general."
    );

    return "general";

  }


  // ==========================================================
  // GET INTENT
  // ==========================================================

  const intent =
    state.intent;


  // ==========================================================
  // EXTRA SAFETY CHECK
  // ==========================================================
  //
  // Although intent already Zod validated ho chuka hai,
  // router level par bhi safety check useful hai.
  //
  // ==========================================================

  if (
    !VALID_INTENTS.includes(intent)
  ) {

    console.warn(
      "[IntentRouter] Invalid intent:",
      intent
    );

    return "general";

  }


  // ==========================================================
  // LOG ROUTING
  // ==========================================================

  console.log(
    `[IntentRouter] Routing intent: ${intent}`
  );


  // ==========================================================
  // RETURN INTENT
  // ==========================================================

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