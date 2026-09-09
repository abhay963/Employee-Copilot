import { z } from "zod";
import { interrupt } from "@langchain/langgraph";

import geminiLLM from "../../llm/gemini.js";
import gmailService from "../../../services/gmailService.js";

// ============================================================
// ZOD SCHEMA
// ============================================================

const EmailDetailsSchema = z.object({
  to: z
    .string()
    .email()
    .nullable(),

  subject: z
    .string()
    .nullable(),

  body: z
    .string()
    .nullable(),
});


// ============================================================
// JSON EXTRACTION
// ============================================================

function extractJSON(content) {
  if (!content) {
    return null;
  }

  const text = String(content)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const match =
      text.match(
        /\{[\s\S]*\}/
      );

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(
        match[0]
      );
    } catch {
      return null;
    }
  }
}


// ============================================================
// GMAIL HEADER HELPER
// ============================================================

function getHeader(
  email,
  headerName
) {
  return (
    email?.payload?.headers?.find(
      header =>
        String(header.name)
          .toLowerCase() ===
        headerName.toLowerCase()
    )?.value || null
  );
}


// ============================================================
// GMAIL READ NODE
// ============================================================

export async function gmailReadNode(state) {
  try {
    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    // ----------------------------------------------------------
    // Check Gmail connection
    // ----------------------------------------------------------

    const connected =
      await gmailService.isConnected(
        state.userId
      );

    if (!connected) {
      return {
        toolResult:
          "Your Gmail is not connected. Please connect Gmail from the settings page first.",
      };
    }

    const lower =
      message.toLowerCase();

    // ----------------------------------------------------------
    // Get recent emails
    // ----------------------------------------------------------

    const emails =
      await gmailService.getRecentEmails(
        state.userId,
        20
      );

    let filtered =
      Array.isArray(emails)
        ? emails
        : [];

    // ----------------------------------------------------------
    // Filter unread
    // ----------------------------------------------------------

    if (
      lower.includes("unread")
    ) {
      filtered =
        filtered.filter(
          email =>
            !email.labelIds ||
            email.labelIds.includes(
              "UNREAD"
            )
        );
    }

    // ----------------------------------------------------------
    // Filter by sender
    // ----------------------------------------------------------

    const fromMatch =
      message.match(
        /\bfrom\s+(.+?)(?:\s+(?:about|subject|regarding)\b|$)/i
      );

    if (fromMatch) {
      const person =
        fromMatch[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ""
          );

      filtered =
        filtered.filter(
          email => {
            const from =
              getHeader(
                email,
                "From"
              );

            return (
              from
                ?.toLowerCase()
                .includes(
                  person.toLowerCase()
                )
            );
          }
        );
    }

    // ----------------------------------------------------------
    // Filter by topic / subject
    // ----------------------------------------------------------

    const aboutMatch =
      message.match(
        /\b(?:about|subject|regarding)\s+(.+)$/i
      );

    if (aboutMatch) {
      const topic =
        aboutMatch[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ""
          );

      filtered =
        filtered.filter(
          email => {
            const subject =
              getHeader(
                email,
                "Subject"
              );

            return (
              subject
                ?.toLowerCase()
                .includes(
                  topic.toLowerCase()
                )
            );
          }
        );
    }

    // ----------------------------------------------------------
    // No results
    // ----------------------------------------------------------

    if (
      filtered.length === 0
    ) {
      return {
        toolResult:
          "I could not find any matching emails in your recent Gmail.",

        context: {
          gmailResults: [],
        },
      };
    }

    // ----------------------------------------------------------
    // Format results
    // ----------------------------------------------------------

    const lines =
      filtered
        .slice(0, 10)
        .map(
          (email, index) => {
            const from =
              getHeader(
                email,
                "From"
              ) ||
              "Unknown sender";

            const subject =
              getHeader(
                email,
                "Subject"
              ) ||
              "No subject";

            const date =
              getHeader(
                email,
                "Date"
              ) ||
              "Unknown date";

            return (
              `${index + 1}. **${subject}**\n` +
              `   From: ${from}\n` +
              `   Date: ${date}`
            );
          }
        );

    return {
      toolResult:
        `I found ${filtered.length} matching email${
          filtered.length === 1
            ? ""
            : "s"
        }:\n\n` +
        lines.join("\n\n"),

      context: {
        gmailResults:
          filtered.slice(0, 10),
      },
    };
  } catch (error) {
    console.error(
      "[GmailRead]",
      error
    );

    return {
      toolResult:
        "I could not access your Gmail right now. Please try again.",
    };
  }
}


// ============================================================
// EXTRACT EMAIL DETAILS
// ============================================================

export async function extractEmailDetails(
  userMessage
) {
  const prompt = `
Extract email information.

Return ONLY valid JSON.

{
  "to": "email@example.com" | null,
  "subject": "subject" | null,
  "body": "body" | null
}

Rules:

- Do not invent email address.
- Missing recipient = null.
- Preserve intended email content.
- No markdown outside JSON.

User:
${userMessage}
`;

  try {
    const response =
      await geminiLLM.invoke(
        prompt
      );

    const parsed =
      extractJSON(
        response?.content
      );

    if (!parsed) {
      return null;
    }

    const result =
      EmailDetailsSchema.safeParse(
        parsed
      );

    if (!result.success) {
      console.warn(
        "[EmailExtraction] Invalid output:",
        result.error.flatten()
      );

      return null;
    }

    return result.data;
  } catch (error) {
    console.error(
      "[EmailExtraction]",
      error
    );

    return null;
  }
}


// ============================================================
// PREPARE EMAIL
// ============================================================

export async function prepareEmailNode(
  state
) {
  try {
    // ----------------------------------------------------------
    // Check Gmail connection
    // ----------------------------------------------------------

    const connected =
      await gmailService.isConnected(
        state.userId
      );

    if (!connected) {
      return {
        toolResult:
          "Your Gmail is not connected. Please connect Gmail from the settings page first.",
      };
    }

    // ----------------------------------------------------------
    // Extract message
    // ----------------------------------------------------------

    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const details =
      await extractEmailDetails(
        message
      );

    // ----------------------------------------------------------
    // Recipient required
    // ----------------------------------------------------------

    if (
      !details ||
      !details.to
    ) {
      return {
        toolResult:
          "I can prepare the email, but I need the recipient email address first.",
      };
    }

    const subject =
      details.subject?.trim() ||
      "No subject";

    const body =
      details.body?.trim() ||
      "";

    // ----------------------------------------------------------
    // Body required
    // ----------------------------------------------------------

    if (!body) {
      return {
        toolResult:
          "I have the recipient and subject, but I still need the email body.",
      };
    }

    // ----------------------------------------------------------
    // Create pending action
    // ----------------------------------------------------------

    const pendingAction = {
      type: "gmail_send",

      actionId:
        `gmail_send_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      to:
        details.to.trim(),

      subject,

      body,
    };

    return {
      pendingAction,

      requiresConfirmation:
        true,

      currentTool:
        "gmail_send",

      context: {
        emailDraft: {
          to:
            pendingAction.to,

          subject:
            pendingAction.subject,

          body:
            pendingAction.body,
        },
      },

      toolResult:
        `I've prepared this email:\n\n` +
        `**To:** ${pendingAction.to}\n` +
        `**Subject:** ${pendingAction.subject}\n\n` +
        `**Message:**\n${pendingAction.body}\n\n` +
        `Please confirm if you'd like me to send it.`,
    };
  } catch (error) {
    console.error(
      "[GmailPrepare]",
      error
    );

    return {
      toolResult:
        "I could not prepare the email right now. Please try again.",
    };
  }
}


// ============================================================
// EMAIL APPROVAL
// ============================================================

export async function emailApprovalNode(
  state
) {
  const approval =
    interrupt({
      type:
        "gmail_confirmation",

      message:
        "Please confirm sending this email.",

      action:
        state.pendingAction,
    });

  if (!approval) {
    return {
      toolResult:
        "Email sending cancelled.",

      pendingAction: null,

      requiresConfirmation:
        false,

      approvalDecision:
        false,
    };
  }

  return {
    requiresConfirmation:
      false,

    approvalDecision:
      true,
  };
}


// ============================================================
// SEND EMAIL
// ============================================================

export async function sendEmailNode(
  state
) {
  const action =
    state.pendingAction;

  // ----------------------------------------------------------
  // Approval check
  // ----------------------------------------------------------

  if (
    state.approvalDecision !== true
  ) {
    return {
      toolResult:
        "Email sending cancelled.",

      pendingAction: null,

      requiresConfirmation:
        false,
    };
  }

  // ----------------------------------------------------------
  // Pending action check
  // ----------------------------------------------------------

  if (
    !action ||
    action.type !==
      "gmail_send"
  ) {
    return {
      toolResult:
        "There is no pending email to send.",

      pendingAction: null,
    };
  }

  const {
    to,
    subject,
    body,
  } = action;

  // ----------------------------------------------------------
  // Validate required data
  // ----------------------------------------------------------

  if (
    !to ||
    !body
  ) {
    return {
      toolResult:
        "The email information is incomplete, so I did not send it.",

      pendingAction: null,
    };
  }

  // ----------------------------------------------------------
  // Send
  // ----------------------------------------------------------

  try {
    await gmailService.sendEmail(
      state.userId,
      to,
      subject,
      body,
      false
    );

    return {
      toolResult:
        `Email sent successfully to ${to}.`,

      pendingAction: null,

      requiresConfirmation:
        false,

      context: {
        sentEmail: {
          to,
          subject,
        },
      },
    };
  } catch (error) {
    console.error(
      "[GmailSend]",
      error
    );

    return {
      toolResult:
        `I couldn't send the email. ${
          error.message ||
          "Please try again."
        }`,

      pendingAction: null,

      requiresConfirmation:
        false,
    };
  }
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  gmailReadNode,
  extractEmailDetails,
  prepareEmailNode,
  emailApprovalNode,
  sendEmailNode,
};