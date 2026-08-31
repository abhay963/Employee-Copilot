import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  motion,
  AnimatePresence,
} from 'framer-motion';

import {
  Send,
  Loader2,
  FileText,
  Trash2,
  User,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

import { FiCommand } from 'react-icons/fi';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ActionCard from './ActionCard';
import ConfirmationModal from './ConfirmationModal';

// ============================================================
// HELPERS
// ============================================================

const generateTempId = () => {
  return `temp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
};

// ============================================================
// CHAT MESSAGE
// ============================================================

const ChatMessage = ({
  message,
  isTyping = false,
  messageRef = null,
}) => {
  const isUser = message.role === 'user';

  const [copied, setCopied] = useState(false);

  const content = message.content || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error(
        'Failed to copy message:',
        error
      );
    }
  };

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 18,
        scale: 0.97,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
      ref={messageRef}
      className={`group flex w-full ${
        isUser
          ? 'justify-end'
          : 'justify-start'
      }`}
    >
      <div
        className={`
          flex w-full max-w-[900px] items-start gap-3
          ${
            isUser
              ? 'flex-row-reverse'
              : 'flex-row'
          }
        `}
      >
        {/* ====================================================
            AVATAR
        ==================================================== */}

        <motion.div
          initial={{
            scale: 0.8,
            opacity: 0,
          }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          transition={{
            duration: 0.25,
          }}
          className={`
            mt-1 flex h-9 w-9 flex-shrink-0
            items-center justify-center
            rounded-full
            ${
              isUser
                ? `
                  bg-accent-primary
                  text-inverse
                  shadow-md
                `
                : `
                  bg-gradient-to-br
                  from-blue-500
                  via-indigo-500
                  to-violet-600
                  text-white
                  shadow-md
                  shadow-blue-500/20
                `
            }
          `}
        >
          {isUser ? (
            <User size={15} strokeWidth={2.2} />
          ) : (
            <Sparkles
              size={16}
              strokeWidth={2.2}
            />
          )}
        </motion.div>

        {/* ====================================================
            MESSAGE CONTENT
        ==================================================== */}

        <div
          className={`
            min-w-0 max-w-[calc(100%-52px)]
            ${
              isUser
                ? 'items-end'
                : 'items-start'
            }
          `}
        >
          {/* NAME */}

          <div
            className={`
              mb-1.5 flex items-center gap-2 px-1
              ${
                isUser
                  ? 'justify-end'
                  : 'justify-start'
              }
            `}
          >
            <span
              className="
                text-[11px]
                font-semibold
                text-secondary
              "
            >
              {isUser
                ? 'You'
                : 'Employee Copilot'}
            </span>

            {!isUser && (
              <span
                className="
                  rounded-full
                  border border-light
                  bg-surface-tertiary
                  px-1.5
                  py-0.5
                  text-[9px]
                  font-semibold
                  tracking-wide
                  text-accent-primary
                "
              >
                AI
              </span>
            )}

            {isTyping && !isUser && (
              <span
                className="
                  text-[10px]
                  font-medium
                  text-accent-primary
                "
              >
                Generating
              </span>
            )}
          </div>

          <div className="relative">
            {/* ==================================================
                MESSAGE BUBBLE
            ================================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.25,
              }}
              className={`
                overflow-hidden
                rounded-2xl
                px-4
                py-3.5
                ${
                  isUser
                    ? `
                      rounded-tr-md
                      user-message
                      shadow-lg
                    `
                    : `
                      rounded-tl-md
                      ai-message
                      shadow-sm
                    `
                }
              `}
            >
              {/* ==================================================
                  MARKDOWN
              ================================================== */}

              <div
                className={`
                  text-[14px]
                  leading-6
                  ${
                    isUser
                      ? `
                        text-inverse
                        [&_*]:text-inverse
                        [&_a]:text-blue-200
                      `
                      : `
                        text-primary
                        [&_*]:text-primary
                      `
                  }
                `}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    /* ============================================
                       LINKS
                    ============================================ */

                    a: ({
                      node,
                      ...props
                    }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                          font-medium
                          underline
                          underline-offset-2
                          ${
                            isUser
                              ? `
                                text-blue-200
                                hover:text-blue-100
                              `
                              : `
                                text-accent-primary
                                hover:text-accent-primary-hover
                              `
                          }
                        `}
                      />
                    ),

                    /* ============================================
                       CODE
                    ============================================ */

                    code: ({
                      node,
                      inline,
                      className,
                      children,
                      ...props
                    }) => {
                      if (inline) {
                        return (
                          <code
                            {...props}
                            className={`
                              rounded-md
                              px-1.5
                              py-0.5
                              font-mono
                              text-[12px]
                              ${
                                isUser
                                  ? `
                                    bg-white/10
                                    text-blue-100
                                  `
                                  : `
                                    bg-surface-tertiary
                                    text-primary
                                  `
                              }
                            `}
                          >
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div
                          className="
                            my-3
                            overflow-hidden
                            rounded-xl
                            border
                            border-medium
                            bg-surface-secondary
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              justify-between
                              border-b
                              border-medium
                              px-3
                              py-2
                            "
                          >
                            <div
                              className="
                                flex
                                items-center
                                gap-1.5
                              "
                            >
                              <span className="h-2 w-2 rounded-full bg-red-400/80" />
                              <span className="h-2 w-2 rounded-full bg-yellow-400/80" />
                              <span className="h-2 w-2 rounded-full bg-green-400/80" />
                            </div>

                            <span
                              className="
                                text-[10px]
                                font-medium
                                text-tertiary
                              "
                            >
                              code
                            </span>
                          </div>

                          <pre
                            className="
                              overflow-x-auto
                              p-4
                              text-xs
                              leading-5
                              text-primary
                            "
                          >
                            <code
                              className={className}
                              {...props}
                            >
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    },

                    /* ============================================
                       BLOCKQUOTE
                    ============================================ */

                    blockquote: ({
                      node,
                      ...props
                    }) => (
                      <blockquote
                        {...props}
                        className={`
                          my-3
                          border-l-4
                          pl-4
                          italic
                          ${
                            isUser
                              ? `
                                border-blue-300
                                text-blue-100
                              `
                              : `
                                border-accent-primary
                                text-secondary
                              `
                          }
                        `}
                      />
                    ),

                    /* ============================================
                       TABLE
                    ============================================ */

                    table: ({
                      node,
                      ...props
                    }) => (
                      <div
                        className="
                          my-3
                          overflow-x-auto
                          rounded-xl
                          border
                          border-default
                        "
                      >
                        <table
                          {...props}
                          className="
                            min-w-full
                            border-collapse
                            text-sm
                          "
                        />
                      </div>
                    ),

                    thead: ({
                      node,
                      ...props
                    }) => (
                      <thead
                        {...props}
                        className="
                          bg-surface-tertiary
                        "
                      />
                    ),

                    th: ({
                      node,
                      ...props
                    }) => (
                      <th
                        {...props}
                        className="
                          border-b
                          border-default
                          px-3
                          py-2
                          text-left
                          text-xs
                          font-semibold
                          text-primary
                        "
                      />
                    ),

                    td: ({
                      node,
                      ...props
                    }) => (
                      <td
                        {...props}
                        className="
                          border-b
                          border-light
                          px-3
                          py-2
                          text-xs
                          text-primary
                        "
                      />
                    ),

                    /* ============================================
                       LISTS
                    ============================================ */

                    ul: ({
                      node,
                      ...props
                    }) => (
                      <ul
                        {...props}
                        className="
                          my-2
                          list-disc
                          pl-5
                        "
                      />
                    ),

                    ol: ({
                      node,
                      ...props
                    }) => (
                      <ol
                        {...props}
                        className="
                          my-2
                          list-decimal
                          pl-5
                        "
                      />
                    ),

                    li: ({
                      node,
                      ...props
                    }) => (
                      <li
                        {...props}
                        className="
                          my-1
                        "
                      />
                    ),

                    /* ============================================
                       PARAGRAPH
                    ============================================ */

                    p: ({
                      node,
                      ...props
                    }) => (
                      <p
                        {...props}
                        className={`
                          my-1.5
                          last:mb-0
                          ${
                            isUser
                              ? 'text-inverse'
                              : 'text-primary'
                          }
                        `}
                      />
                    ),

                    /* ============================================
                       HEADINGS
                    ============================================ */

                    h1: ({
                      node,
                      ...props
                    }) => (
                      <h1
                        {...props}
                        className={`
                          mb-2
                          mt-4
                          text-xl
                          font-bold
                          ${
                            isUser
                              ? 'text-inverse'
                              : 'text-primary'
                          }
                        `}
                      />
                    ),

                    h2: ({
                      node,
                      ...props
                    }) => (
                      <h2
                        {...props}
                        className={`
                          mb-2
                          mt-4
                          text-lg
                          font-bold
                          ${
                            isUser
                              ? 'text-inverse'
                              : 'text-primary'
                          }
                        `}
                      />
                    ),

                    h3: ({
                      node,
                      ...props
                    }) => (
                      <h3
                        {...props}
                        className={`
                          mb-1.5
                          mt-3
                          text-base
                          font-bold
                          ${
                            isUser
                              ? 'text-inverse'
                              : 'text-primary'
                          }
                        `}
                      />
                    ),

                    strong: ({
                      node,
                      ...props
                    }) => (
                      <strong
                        {...props}
                        className={`
                          font-semibold
                          ${
                            isUser
                              ? 'text-inverse'
                              : 'text-primary'
                          }
                        `}
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>

                {/* ==================================================
                    TYPEWRITER CURSOR
                ================================================== */}

                {isTyping &&
                  content && (
                    <motion.span
                      animate={{
                        opacity: [1, 0, 1],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                      }}
                      className="
                        ml-0.5
                        inline-block
                        h-4
                        w-[2px]
                        translate-y-[2px]
                        bg-blue-500
                      "
                    />
                  )}
              </div>

              {/* ==================================================
                  SOURCES
              ================================================== */}

              {message.sources &&
                message.sources.length > 0 && (
                  <div
                    className={`
                      mt-4
                      border-t
                      pt-3
                      ${
                        isUser
                          ? 'border-white/10'
                          : 'border-light'
                      }
                    `}
                  >
                    <div
                      className={`
                        mb-2
                        flex
                        items-center
                        gap-1.5
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-wider
                        ${
                          isUser
                            ? 'text-blue-100'
                            : 'text-tertiary'
                        }
                      `}
                    >
                      <FileText size={12} />

                      Sources
                    </div>

                    <div className="space-y-1.5">
                      {message.sources.map(
                        (
                          source,
                          index
                        ) => (
                          <div
                            key={index}
                            className={`
                              flex
                              items-center
                              gap-2
                              rounded-lg
                              px-2.5
                              py-2
                              text-xs
                              ${
                                isUser
                                  ? `
                                    bg-white/10
                                    text-blue-50
                                  `
                                  : `
                                    border
                                    border-light
                                    bg-surface-tertiary
                                    text-secondary
                                  `
                              }
                            `}
                          >
                            <FileText
                              size={12}
                              className={
                                isUser
                                  ? 'text-blue-200'
                                  : 'text-tertiary'
                              }
                            />

                            <span
                              className="
                                min-w-0
                                flex-1
                                truncate
                              "
                            >
                              {source.documentTitle ||
                                'Document'}
                            </span>

                            {source.chunkIndex !==
                              undefined && (
                              <span
                                className="
                                  flex-shrink-0
                                  text-[10px]
                                  text-tertiary
                                "
                              >
                                Chunk{' '}
                                {source.chunkIndex +
                                  1}
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </motion.div>

            {/* ==================================================
                COPY BUTTON
            ================================================== */}

            {!isUser &&
              content && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="
                    absolute
                    -bottom-8
                    left-1
                    flex
                    items-center
                    gap-1
                    rounded-md
                    px-2
                    py-1
                    text-[10px]
                    text-tertiary
                    opacity-0
                    transition-all
                    hover:bg-hover
                    hover:text-secondary
                    group-hover:opacity-100
                  "
                >
                  {copied ? (
                    <>
                      <Check size={11} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      Copy
                    </>
                  )}
                </button>
              )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// THINKING INDICATOR
// ============================================================

const TypingIndicator = () => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: -8,
      }}
      transition={{
        duration: 0.25,
      }}
      className="
        flex
        items-start
        gap-3
      "
    >
      {/* AI AVATAR */}

      <motion.div
        animate={{
          scale: [1, 1.04, 1],
          boxShadow: [
            '0 0 0 0 rgba(99,102,241,0.0)',
            '0 0 0 6px rgba(99,102,241,0.08)',
            '0 0 0 0 rgba(99,102,241,0.0)',
          ],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
        }}
        className="
          flex
          h-9
          w-9
          flex-shrink-0
          items-center
          justify-center
          rounded-full
          bg-gradient-to-br
          from-blue-500
          via-indigo-500
          to-violet-600
          text-white
        "
      >
        <Sparkles size={16} />
      </motion.div>

      <div>
        {/* NAME */}

        <div
          className="
            mb-1.5
            flex
            items-center
            gap-2
            px-1
          "
        >
          <span
            className="
              text-[11px]
              font-semibold
              text-secondary
            "
          >
            Employee Copilot
          </span>

          <span
            className="
              rounded-full
              bg-surface-tertiary
              px-1.5
              py-0.5
              text-[9px]
              font-semibold
              text-accent-primary
            "
          >
            AI
          </span>
        </div>

        {/* THINKING BUBBLE */}

        <div
          className="
            flex
            items-center
            gap-2
            rounded-2xl
            rounded-tl-md
            border
            border-default
            bg-surface
            px-4
            py-3.5
            shadow-sm
          "
        >
          <span
            className="
              text-xs
              font-medium
              text-secondary
            "
          >
            Thinking
          </span>

          <div className="flex items-center gap-1">
            <motion.span
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: 0,
              }}
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-blue-500
              "
            />

            <motion.span
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: 0.15,
              }}
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-indigo-500
              "
            />

            <motion.span
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: 0.3,
              }}
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-violet-500
              "
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({
  onSuggestion,
}) => {
  const suggestions = [
    {
      title: 'Company policies',
      text: 'What are our main company policies?',
    },
    {
      title: 'Leave policy',
      text: 'How does the leave policy work?',
    },
    {
      title: 'Employee handbook',
      text: 'Summarize the employee handbook',
    },
  ];

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="
        flex
        min-h-[calc(100vh-220px)]
        items-center
        justify-center
        px-4
      "
    >
      <div
        className="
          w-full
          max-w-2xl
          text-center
        "
      >
        <motion.div
          initial={{
            scale: 0.8,
            opacity: 0,
          }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          className="
            mx-auto
            mb-6
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-br
            from-blue-500
            via-indigo-500
            to-violet-600
            text-white
            shadow-xl
            shadow-blue-500/20
          "
        >
          <Sparkles size={28} />
        </motion.div>

        <h3
          className="
            text-2xl
            font-bold
            tracking-tight
            text-primary
          "
        >
          How can I help?
        </h3>

        <p
          className="
            mx-auto
            mt-2
            max-w-md
            text-sm
            leading-6
            text-secondary
          "
        >
          Ask me about company policies,
          employees, leave, documents,
          or anything in your
          organization's knowledge base.
        </p>

        <div
          className="
            mt-7
            grid
            gap-2
            sm:grid-cols-3
          "
        >
          {suggestions.map(
            (
              suggestion,
              index
            ) => (
              <motion.button
                key={
                  suggestion.title
                }
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index * 0.06,
                }}
                whileHover={{
                  y: -3,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                type="button"
                onClick={() =>
                  onSuggestion(
                    suggestion.text
                  )
                }
                className="
                  rounded-xl
                  border
                  border-default
                  bg-surface
                  p-3
                  text-left
                  shadow-sm
                  transition-all
                  hover:border-accent-primary
                  hover:shadow-md
                "
              >
                <p
                  className="
                    text-xs
                    font-semibold
                    text-primary
                  "
                >
                  {suggestion.title}
                </p>

                <p
                  className="
                    mt-1
                    line-clamp-2
                    text-[11px]
                    leading-4
                    text-tertiary
                  "
                >
                  {suggestion.text}
                </p>
              </motion.button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// COPILOT
// ============================================================

const Copilot = ({
  conversation,
  onSendMessage,
  onExecuteAction,
  onDeleteConversation,
}) => {
  const [question, setQuestion] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [localMessages, setLocalMessages] =
    useState([]);

  const [pendingAction, setPendingAction] =
    useState(null);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  // ============================================================
  // LOAD PENDING ACTION FROM CONVERSATION STATE
  // ============================================================

  useEffect(() => {
    const loadPendingAction = async () => {
      if (!conversation?.id) return;

      try {
        // Check if there's a pending action on the server
        const response = await fetch(`/api/conversations/${conversation.id}/state`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.pendingAction && data.workflowStep === 'READY_FOR_CONFIRMATION') {
            setPendingAction({
              ...data.pendingAction,
              actionId: data.actionId,
              actionType: data.pendingAction.type,
              calendarStatus: data.calendarStatus,
              hasConflicts: data.context?.calendarConflicts ? true : false,
              conflictDetails: data.context?.calendarConflicts || null
            });

            // Add recovery message to conversation if not already present
            setLocalMessages(prev => {
              const hasRecoveryMessage = prev.some(msg => msg.isRecovery);
              if (!hasRecoveryMessage) {
                const recoveryMessage = {
                  id: `recovery-${Date.now()}`,
                  role: 'assistant',
                  content: `You have an unfinished leave request:\n\n` +
                           `**Leave type:** ${data.pendingAction.leave_type}\n` +
                           `**Dates:** ${data.pendingAction.start_date} → ${data.pendingAction.end_date}\n` +
                           `**Days:** ${data.pendingAction.number_of_days}\n\n` +
                           `Would you like to continue or cancel it?`,
                  created_at: new Date().toISOString(),
                  isRecovery: true
                };
                return [...prev, recoveryMessage];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Error loading pending action:', error);
      }
    };

    loadPendingAction();
  }, [conversation?.id]);

  const [executingAction, setExecutingAction] =
    useState(false);

  const textareaRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const lastUserMessageRef =
    useRef(null);

  const pendingUserScrollRef =
    useRef(false);

  const lastConversationIdRef =
    useRef(null);

  // Used to prevent the parent's server update
  // from killing the local typewriter animation.
  const typingAssistantIdRef =
    useRef(null);

  // ============================================================
  // SYNCHRONIZE CONVERSATION
  // ============================================================

  useEffect(() => {
    if (!conversation) {
      setLocalMessages([]);

      lastConversationIdRef.current =
        null;

      typingAssistantIdRef.current =
        null;

      return;
    }

    const conversationChanged =
      lastConversationIdRef.current !==
      conversation.id;

    if (conversationChanged) {
      setLocalMessages(
        conversation.messages || []
      );

      lastConversationIdRef.current =
        conversation.id;

      typingAssistantIdRef.current =
        null;

      return;
    }

    setLocalMessages(
      (currentMessages) => {
        const serverMessages =
          conversation.messages || [];

        /*
         * While the AI typewriter is running,
         * preserve the local temporary assistant
         * message instead of replacing it with
         * the server's completed response.
         */

        if (
          typingAssistantIdRef.current
        ) {
          const typingMessage =
            currentMessages.find(
              (message) =>
                String(message.id) ===
                String(
                  typingAssistantIdRef.current
                )
            );

          if (typingMessage) {
            const serverIds =
              new Set(
                serverMessages.map(
                  (message) =>
                    String(message.id)
                )
              );

            const localTemporaryMessages =
              currentMessages.filter(
                (message) =>
                  String(message.id).startsWith(
                    'temp-'
                  ) &&
                  !serverIds.has(
                    String(message.id)
                  ) &&
                  String(message.id) !==
                    String(
                      typingAssistantIdRef.current
                    )
              );

            return [
              ...serverMessages.filter(
                (message) =>
                  String(message.id) !==
                  String(
                    typingAssistantIdRef.current
                  )
              ),
              ...localTemporaryMessages,
              typingMessage,
            ];
          }
        }

        if (
          serverMessages.length === 0
        ) {
          return currentMessages;
        }

        const serverIds =
          new Set(
            serverMessages.map(
              (message) =>
                String(message.id)
            )
          );

        const optimisticMessages =
          currentMessages.filter(
            (message) =>
              String(message.id).startsWith(
                'temp-'
              ) &&
              !serverIds.has(
                String(message.id)
              )
          );

        return [
          ...serverMessages,
          ...optimisticMessages,
        ];
      }
    );
  }, [conversation]);

  // ============================================================
  // SMART CHAT SCROLL
  // ============================================================

  useEffect(() => {
    // When the user sends a new message, move that message
    // toward the top of the chat viewport. This pushes older
    // messages upward and gives the new conversation turn
    // enough room below it for the AI response.
    if (pendingUserScrollRef.current) {
      requestAnimationFrame(() => {
        lastUserMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        pendingUserScrollRef.current = false;
      });
      return;
    }
  }, [localMessages]);

  // Scroll a newly opened conversation to its latest content.
  useEffect(() => {
    if (!conversation) return;

    if (lastConversationIdRef.current === conversation.id) {
      return;
    }

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    });
  }, [conversation]);

  // ============================================================
  // TEXTAREA
  // ============================================================

  const resizeTextarea = () => {
    const textarea =
      textareaRef.current;

    if (!textarea) return;

    textarea.style.height =
      'auto';

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      160
    )}px`;
  };

  const handleQuestionChange = (
    event
  ) => {
    setQuestion(
      event.target.value
    );

    resizeTextarea();
  };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (
        !loading &&
        question.trim()
      ) {
        handleSubmit(event);
      }
    }
  };

  // ============================================================
  // TYPEWRITER
  // ============================================================

  const typeAssistantResponse = async ({
    assistantId,
    content,
    sources,
  }) => {
    typingAssistantIdRef.current =
      assistantId;

    // Create empty assistant bubble immediately.
    setLocalMessages(
      (previous) => [
        ...previous,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          sources,
          created_at:
            new Date().toISOString(),
          typing: true,
        },
      ]
    );

    /*
     * Slight delay makes the transition from
     * "Thinking..." to answer feel natural.
     */
    await new Promise(
      (resolve) =>
        setTimeout(resolve, 250)
    );

    /*
     * Type faster for longer responses.
     * This avoids extremely slow answers.
     */
    const totalCharacters =
      content.length;

    let interval = 12;

    if (
      totalCharacters > 2500
    ) {
      interval = 5;
    } else if (
      totalCharacters > 1200
    ) {
      interval = 7;
    } else if (
      totalCharacters > 600
    ) {
      interval = 9;
    }

    /*
     * Type character by character.
     */
    for (
      let index = 0;
      index <= content.length;
      index++
    ) {
      const visibleContent =
        content.slice(
          0,
          index
        );

      setLocalMessages(
        (previous) =>
          previous.map(
            (message) =>
              String(message.id) ===
              String(assistantId)
                ? {
                    ...message,
                    content:
                      visibleContent,
                  }
                : message
          )
      );

      if (
        index <
        content.length
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              interval
            )
        );
      }
    }

    /*
     * Mark typewriter as complete.
     */
    setLocalMessages(
      (previous) =>
        previous.map(
          (message) =>
            String(message.id) ===
            String(assistantId)
              ? {
                  ...message,
                  content,
                  typing: false,
                }
              : message
        )
    );

    typingAssistantIdRef.current =
      null;
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSubmit = async (
    event
  ) => {
    event?.preventDefault();

    if (
      !question.trim() ||
      loading ||
      !conversation
    ) {
      return;
    }

    const currentQuestion =
      question.trim();

    // ========================================================
    // USER MESSAGE
    // ========================================================

    const optimisticUserMessage =
      {
        id: generateTempId(),
        role: 'user',
        content:
          currentQuestion,
        created_at:
          new Date().toISOString(),
        optimistic: true,
      };

    /*
     * User message appears immediately.
     */
    pendingUserScrollRef.current = true;

    setLocalMessages(
      (previous) => [
        ...previous,
        optimisticUserMessage,
      ]
    );

    setQuestion('');

    if (
      textareaRef.current
    ) {
      textareaRef.current.style.height =
        'auto';
    }

    // ========================================================
    // THINKING
    // ========================================================

    setLoading(true);

    try {
      const response =
        await onSendMessage(
          conversation.id,
          {
            question:
              currentQuestion,
          }
        );

      console.log(
        'Copilot sendMessage response:',
        response
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      const assistantContent =
        typeof response?.response ===
        'string'
          ? response.response
          : typeof response?.data
                ?.response ===
              'string'
            ? response.data
                .response
            : typeof response
                  ?.message
                  ?.content ===
                'string'
              ? response
                  .message
                  .content
              : typeof response
                    ?.data
                    ?.message
                    ?.content ===
                  'string'
                ? response.data
                    .message
                    .content
                : typeof response
                      ?.assistantMessage
                      ?.content ===
                    'string'
                  ? response
                      .assistantMessage
                      .content
                  : typeof response
                        ?.data
                        ?.assistantMessage
                        ?.content ===
                      'string'
                    ? response.data
                        .assistantMessage
                        .content
                    : null;

      const assistantSources =
        response?.sources ||
        response?.data
          ?.sources ||
        [];

      console.log(
        'Assistant content:',
        assistantContent
      );

      // ======================================================
      // ACTION
      // ======================================================

      const responseData =
        response?.data || response;

      const actionMetadata =
        responseData?.actionMetadata;

      const requiresConfirmation =
        Boolean(
          responseData?.requiresConfirmation
        );

      if (
        actionMetadata &&
        requiresConfirmation
      ) {
        /*
         * Normalize the action before storing it.
         *
         * Backend returns:
         * {
         *   actionId,
         *   actionType,
         *   actionData: { ...actual action fields }
         * }
         *
         * Action execution needs the actual action fields
         * (type, leave_type, dates, etc.), not a nested
         * actionMetadata object.
         */
        const actionData =
          actionMetadata.actionData ||
          actionMetadata;

        setPendingAction({
          ...actionData,
          actionId:
            actionMetadata.actionId ||
            actionData.actionId,
          actionType:
            actionMetadata.actionType ||
            actionData.type,
          originalMessage:
            currentQuestion,
        });
      } else {
        setPendingAction(null);
      }

      // ======================================================
      // SHOW USER MESSAGE AS SENT
      // ======================================================

      setLocalMessages(
        (previous) =>
          previous.map(
            (message) =>
              message.id ===
              optimisticUserMessage.id
                ? {
                    ...message,
                    optimistic:
                      false,
                  }
                : message
          )
      );

      // ======================================================
      // AI RESPONSE
      // ======================================================

      if (assistantContent) {
        const assistantId =
          generateTempId();

        /*
         * Turn off the thinking indicator
         * and start the AI response.
         */

        await typeAssistantResponse(
          {
            assistantId,
            content:
              assistantContent,
            sources:
              assistantSources,
          }
        );
      } else {
        console.warn(
          'No assistant response found:',
          response
        );
      }
    } catch (error) {
      console.error(
        'Error sending message:',
        error
      );

      typingAssistantIdRef.current =
        null;

      /*
       * Remove optimistic user message
       * when request actually fails.
       */

      setLocalMessages(
        (previous) =>
          previous.filter(
            (message) =>
              message.id !==
              optimisticUserMessage.id
          )
      );

      /*
       * Restore question.
       */

      setQuestion(
        currentQuestion
      );

      setTimeout(() => {
        resizeTextarea();
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SUGGESTION
  // ============================================================

  const handleSuggestion = (
    text
  ) => {
    setQuestion(text);

    requestAnimationFrame(
      () => {
        textareaRef.current?.focus();

        resizeTextarea();
      }
    );
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async () => {
    if (
      !conversation ||
      loading
    ) {
      return;
    }

    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);

    try {
      await onDeleteConversation(
        conversation.id
      );
    } catch (error) {
      console.error(
        'Error deleting conversation:',
        error
      );
    }
  };

  // ============================================================
  // CONFIRM ACTION
  // ============================================================

  const handleConfirmAction =
    async () => {
      if (
        !pendingAction ||
        !conversation ||
        executingAction
      ) {
        return;
      }

      setExecutingAction(
        true
      );

      try {
        /*
         * Send the original validated action data back to
         * the backend. Never send the confirmation text
         * ("yes", "ok", etc.) through the normal chat flow.
         */
        const actionData =
          pendingAction.actionData ||
          pendingAction;

        const response =
          await onExecuteAction(
            conversation.id,
            {
              actionId:
                pendingAction.actionId,
              actionData: {
                ...actionData,
                originalMessage:
                  pendingAction.originalMessage,
              },
            }
          );

        console.log(
          'Action execution response:',
          response
        );

        if (
          response?.assistantMessage
        ) {
          setLocalMessages(
            (previous) => [
              ...previous,
              response.assistantMessage,
            ]
          );

          setPendingAction(
            null
          );
        }
      } catch (error) {
        console.error(
          'Error executing action:',
          error
        );

        const errorMessage =
          {
            id: generateTempId(),
            role: 'assistant',
            content:
              'I apologize, but I encountered an error executing this action. Please try again.',
            created_at:
              new Date().toISOString(),
          };

        setLocalMessages(
          (previous) => [
            ...previous,
            errorMessage,
          ]
        );
      } finally {
        setExecutingAction(
          false
        );
      }
    };

  // ============================================================
  // CANCEL ACTION
  // ============================================================

  const handleCancelAction =
    async () => {
      try {
        // Call backend to cancel the workflow
        await fetch(`/api/conversations/${conversation.id}/actions/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            actionId: pendingAction.actionId
          })
        });
      } catch (error) {
        console.error('Error cancelling action on server:', error);
      }

      setPendingAction(null);

      const cancelMessage =
        {
          id: generateTempId(),
          role: 'assistant',
          content:
            'Action cancelled. Let me know if you need help with anything else.',
          created_at:
            new Date().toISOString(),
        };

      setLocalMessages(
        (previous) => [
          ...previous,
          cancelMessage,
        ]
      );
    };

  // ============================================================
  // DEDUPLICATE
  // ============================================================

  const messages = useMemo(
    () => {
      const seen =
        new Map();

      for (
        const message of
        localMessages
      ) {
        const key =
          String(
            message.id ||
              `${message.role}-${message.created_at}-${message.content}`
          );

        seen.set(
          key,
          message
        );
      }

      return Array.from(
        seen.values()
      );
    },
    [localMessages]
  );

  // ============================================================
  // EMPTY CONVERSATION
  // ============================================================

  if (!conversation) {
    return (
      <div
        className="
          flex
          h-full
          items-center
          justify-center
          bg-background
        "
      >
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="px-6 text-center"
        >
          <div
            className="
              mx-auto
              mb-5
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-br
              from-blue-500
              via-indigo-500
              to-violet-600
              text-white
              shadow-xl
              shadow-blue-500/20
            "
          >
            <Sparkles size={28} />
          </div>

          <h2
            className="
              text-xl
              font-bold
              tracking-tight
              text-primary
            "
          >
            Employee Copilot
          </h2>

          <p
            className="
              mx-auto
              mt-2
              max-w-sm
              text-sm
              leading-6
              text-secondary
            "
          >
            Select a conversation
            or create a new one
            to start chatting with
            your AI assistant.
          </p>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        bg-background
      "
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header
        className="
          z-10
          flex
          flex-shrink-0
          items-center
          justify-between
          border-b
          border-default
          bg-surface/90
          px-4
          py-3
          backdrop-blur-xl
          sm:px-6
        "
      >
        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >
          <div
            className="
              relative
              flex
              h-10
              w-10
              flex-shrink-0
              items-center
              justify-center
              rounded-xl
              bg-gradient-to-br
              from-blue-500
              via-indigo-500
              to-violet-600
              text-white
              shadow-md
              shadow-blue-500/20
            "
          >
            <Sparkles size={19} />

            <span
              className="
                absolute
                -bottom-0.5
                -right-0.5
                h-2.5
                w-2.5
                rounded-full
                border-2
                border-white
                bg-emerald-500
              "
            />
          </div>

          <div className="min-w-0">
            <h2
              className="
                truncate
                text-sm
                font-bold
                tracking-tight
                text-primary
                sm:text-base
              "
            >
              {conversation.title ||
                'New Conversation'}
            </h2>

            <div
              className="
                mt-0.5
                flex
                items-center
                gap-1.5
              "
            >
              <span
                className="
                  text-[11px]
                  font-medium
                  text-success
                "
              >
                Online
              </span>

              <span
                className="
                  h-1
                  w-1
                  rounded-full
                  bg-tertiary
                "
              />

              <span
                className="
                  text-[11px]
                  text-tertiary
                "
              >
                AI Assistant
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            text-tertiary
            transition-all
            hover:bg-danger-light
            hover:text-danger
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
          title="Delete conversation"
          aria-label="Delete conversation"
        >
          <Trash2 size={17} />
        </button>
      </header>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      <main
        className="
          min-h-0
          flex-1
          overflow-y-auto
          scroll-smooth
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-4xl
            px-4
            py-8
            sm:px-6
          "
        >
          {messages.length > 0 ? (
            <div className="space-y-7">
              <AnimatePresence
                initial={false}
              >
                {messages.map(
                  (message) => (
                    <ChatMessage
                      key={
                        message.id
                      }
                      message={
                        message
                      }
                      isTyping={
                        message.typing ===
                        true
                      }
                      messageRef={
                        message.role === 'user' &&
                        message.id ===
                          messages[messages.length - 1]?.id
                          ? lastUserMessageRef
                          : null
                      }
                    />
                  )
                )}
              </AnimatePresence>

              {/* ==================================================
                  THINKING
              ================================================== */}

              <AnimatePresence>
                {loading && (
                  <TypingIndicator />
                )}
              </AnimatePresence>

              {/* ==================================================
                  ACTION
              ================================================== */}

              {pendingAction && (
                <ActionCard
                  actionMetadata={
                    pendingAction
                  }
                  onConfirm={
                    handleConfirmAction
                  }
                  onCancel={
                    handleCancelAction
                  }
                  isLoading={
                    executingAction
                  }
                />
              )}

              <div
                ref={
                  messagesEndRef
                }
                className="h-1"
              />
            </div>
          ) : (
            <>
              <EmptyState
                onSuggestion={
                  handleSuggestion
                }
              />

              <div
                ref={
                  messagesEndRef
                }
              />
            </>
          )}
        </div>
      </main>

      {/* ======================================================
          INPUT
      ====================================================== */}

      <footer
        className="
          flex-shrink-0
          border-t
          border-default
          bg-surface/90
          backdrop-blur-xl
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-4xl
            px-4
            py-3
            sm:px-6
            sm:py-4
          "
        >
          <form
            onSubmit={
              handleSubmit
            }
          >
            <div
              className="
                relative
                rounded-2xl
                border
                border-default
                bg-input
                p-2
                shadow-sm
                transition-all
                duration-200
                focus-within:border-accent-primary
                focus-within:bg-input-focus
                focus-within:shadow-lg
                focus-within:shadow-accent-primary/5
                focus-within:ring-4
                focus-within:ring-focus-ring
              "
            >
              <div
                className="
                  flex
                  items-end
                  gap-2
                "
              >
                {/* AI ICON */}

                <motion.div
                  animate={
                    loading
                      ? {
                          rotate: [
                            0,
                            -5,
                            5,
                            0,
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 1.2,
                    repeat: loading
                      ? Infinity
                      : 0,
                  }}
                  className="
                    mb-1
                    flex
                    h-9
                    w-9
                    flex-shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-br
                    from-blue-500
                    to-violet-600
                    text-white
                    shadow-sm
                    shadow-blue-500/20
                  "
                >
                  <Sparkles size={15} />
                </motion.div>

                {/* TEXTAREA */}

                <textarea
                  ref={
                    textareaRef
                  }
                  rows={1}
                  value={
                    question
                  }
                  onChange={
                    handleQuestionChange
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder={
                    loading
                      ? 'Employee Copilot is thinking...'
                      : 'Message your AI copilot...'
                  }
                  disabled={
                    loading
                  }
                  autoComplete="off"
                  className="
                    max-h-40
                    min-h-[40px]
                    min-w-0
                    flex-1
                    resize-none
                    overflow-y-auto
                    bg-transparent
                    px-1
                    py-2.5
                    text-sm
                    leading-5
                    text-primary
                    outline-none
                    placeholder:text-muted
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />

                {/* SEND */}

                <motion.button
                  whileHover={
                    !loading &&
                    question.trim()
                      ? {
                          scale: 1.05,
                        }
                      : {}
                  }
                  whileTap={
                    !loading &&
                    question.trim()
                      ? {
                          scale: 0.94,
                        }
                      : {}
                  }
                  type="submit"
                  disabled={
                    loading ||
                    !question.trim()
                  }
                  className="
                    mb-1
                    flex
                    h-9
                    w-9
                    flex-shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-accent-primary
                    text-inverse
                    shadow-sm
                    transition-all
                    hover:bg-accent-primary-hover
                    disabled:cursor-not-allowed
                    disabled:bg-surface-tertiary
                    disabled:text-muted
                  "
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2
                      size={16}
                      className="
                        animate-spin
                      "
                    />
                  ) : (
                    <Send size={16} />
                  )}
                </motion.button>
              </div>

              {/* BOTTOM CONTROLS */}

              <div
                className="
                  mt-1
                  flex
                  items-center
                  justify-between
                  px-1
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-[10px]
                    text-muted
                  "
                >
                  <span
                    className="
                      hidden
                      items-center
                      gap-1
                      sm:flex
                    "
                  >
                    <FiCommand
                      size={10}
                    />

                    <span>
                      Enter to send
                    </span>
                  </span>

                  <span
                    className="
                      hidden
                      text-muted
                      sm:block
                    "
                  >
                    •
                  </span>

                  <span>
                    Shift + Enter
                    for new line
                  </span>
                </div>

                <span
                  className="
                    text-[10px]
                    text-muted
                  "
                >
                  {question.length >
                  0
                    ? `${question.length}`
                    : ''}
                </span>
              </div>
            </div>

            <div
              className="
                mt-2
                flex
                items-center
                justify-center
                gap-1
                text-[10px]
                text-muted
              "
            >
              <Sparkles
                size={9}
              />

              <span>
                Employee Copilot
                may make mistakes.
                Verify important
                information.
              </span>
            </div>
          </form>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete conversation?"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Copilot;