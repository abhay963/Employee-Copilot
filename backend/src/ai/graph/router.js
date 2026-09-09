// ============================================================
// EMPLOYEE COPILOT ROUTER
// ============================================================
//
// Responsibility:
//
// This file is responsible ONLY for routing.
//
// The classifier determines the user's intent.
//
// Example:
//
// state.intent = "leave_request"
//                  ↓
//             routeByIntent()
//                  ↓
//             "leave_request"
//                  ↓
//          INTENT_ROUTES map
//                  ↓
//       "extractLeaveDetails"
//                  ↓
//          LangGraph node
//
// IMPORTANT:
//
// routeByIntent() returns the INTENT.
// It does NOT return the LangGraph node name.
//
// Example:
//
// "gmail_read" → "gmail_read"       ✅
//
// NOT:
//
// "gmail_read" → "gmailRead"        ❌
//
// The conversion from intent → node is handled by
// INTENT_ROUTES.
// ============================================================


// ============================================================
// ROUTE BY INTENT
// ============================================================
//
// LangGraph calls this function after classifyIntentNode.
//
// Input:
//
// {
//   intent: "gmail_read"
// }
//
// Output:
//
// "gmail_read"
//
// This returned value becomes the key used by
// the conditional edge mapping in employeeGraph.js.
// ============================================================

export function routeByIntent(state) {
  // ----------------------------------------------------------
  // No intent
  // ----------------------------------------------------------

  if (!state?.intent) {
    console.warn(
      "[Router] No intent found. Falling back to general."
    );

    return "general";
  }

  // ----------------------------------------------------------
  // Return the intent itself
  // ----------------------------------------------------------

  const intent = state.intent;

  console.log(
    `[IntentRouter] Routing intent: ${intent}`
  );

  return intent;
}


// ============================================================
// INTENT → LANGGRAPH NODE
// ============================================================
//
// This is the single source of truth for mapping an intent
// to the actual LangGraph node.
//
// Example:
//
// "leave_request"
//        ↓
// "extractLeaveDetails"
//
// "gmail_read"
//        ↓
// "gmailRead"
//
// "general"
//        ↓
// "generalRAG"
// ============================================================

export const INTENT_ROUTES = {

  // ----------------------------------------------------------
  // LEAVE
  // ----------------------------------------------------------

  leave_balance:
    "leaveBalance",

  leave_policy:
    "leavePolicy",

  leave_request:
    "extractLeaveDetails",


  // ----------------------------------------------------------
  // CALENDAR
  // ----------------------------------------------------------

  calendar_events:
    "calendarQuery",

  calendar_create:
    "extractCalendarEventDetails",


  // ----------------------------------------------------------
  // GMAIL
  // ----------------------------------------------------------

  gmail_read:
    "gmailRead",

  gmail_send:
    "extractEmailDetails",


  // ----------------------------------------------------------
  // WEB SEARCH
  // ----------------------------------------------------------

  web_search:
    "webSearch",


  // ----------------------------------------------------------
  // GENERAL / RAG
  // ----------------------------------------------------------

  general:
    "generalRAG",
};


// ============================================================
// GET ROUTE FOR INTENT
// ============================================================
//
// This helper converts an intent into the corresponding
// LangGraph node.
//
// Example:
//
// getRouteForIntent("gmail_read")
//        ↓
// "gmailRead"
//
// getRouteForIntent("general")
//        ↓
// "generalRAG"
//
// Unknown intent:
//        ↓
// "generalRAG"
// ============================================================

export function getRouteForIntent(intent) {
  return (
    INTENT_ROUTES[intent] ||
    INTENT_ROUTES.general
  );
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  routeByIntent,
  getRouteForIntent,
  INTENT_ROUTES,
};