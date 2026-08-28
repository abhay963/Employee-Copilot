import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const generateTempId = () => {
  return `temp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
};

const ChatMessage = ({ message }) => {
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
      console.error('Failed to copy message:', error);
    }
  };

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 12,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.25,
        ease: 'easeOut',
      }}
      className={`group flex w-full ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`
          flex w-full max-w-[900px] items-start gap-3
          ${isUser ? 'flex-row-reverse' : 'flex-row'}
        `}
      >
        {/* Avatar */}
        <div
          className={`
            mt-1 flex h-8 w-8 flex-shrink-0 items-center
            justify-center rounded-full
            ${
              isUser
                ? 'bg-gray-900 text-white'
                : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white shadow-sm shadow-blue-500/20'
            }
          `}
        >
          {isUser ? <User size={15} /> : <Sparkles size={15} />}
        </div>

        {/* Message */}
        <div
          className={`
            min-w-0 max-w-[calc(100%-48px)]
            ${isUser ? 'items-end' : 'items-start'}
          `}
        >
          {/* Name */}
          <div
            className={`
              mb-1.5 flex items-center gap-2 px-1
              ${isUser ? 'justify-end' : 'justify-start'}
            `}
          >
            <span className="text-[11px] font-semibold text-gray-500">
              {isUser ? 'You' : 'Employee Copilot'}
            </span>

            {!isUser && (
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-500">
                AI
              </span>
            )}
          </div>

          <div className="relative">
            {/* Bubble */}
            <div
              className={`
                overflow-hidden rounded-2xl px-4 py-3
                ${
                  isUser
                    ? 'rounded-tr-md bg-gray-900 text-white shadow-sm'
                    : 'rounded-tl-md border border-gray-200/80 bg-white text-gray-800 shadow-sm'
                }
              `}
            >
              <div
                className={`
                  text-[14px] leading-6
                  ${
                    isUser
                      ? 'prose prose-sm prose-invert max-w-none'
                      : 'prose prose-sm max-w-none'
                  }
                `}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          isUser
                            ? 'font-medium underline'
                            : 'font-medium text-blue-600 underline hover:text-blue-700'
                        }
                      />
                    ),

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
                            className={`
                              rounded-md px-1.5 py-0.5 font-mono text-[12px]
                              ${
                                isUser
                                  ? 'bg-white/10 text-blue-100'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            `}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div className="my-3 overflow-hidden rounded-xl border border-gray-800 bg-[#111318]">
                          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-red-400/80" />
                              <span className="h-2 w-2 rounded-full bg-yellow-400/80" />
                              <span className="h-2 w-2 rounded-full bg-green-400/80" />
                            </div>

                            <span className="text-[10px] text-gray-500">
                              code
                            </span>
                          </div>

                          <pre className="overflow-x-auto p-4 text-xs leading-5 text-gray-100">
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

                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        {...props}
                        className={`
                          my-3 border-l-4 pl-4 italic
                          ${
                            isUser
                              ? 'border-gray-500 text-gray-300'
                              : 'border-blue-500 text-gray-600'
                          }
                        `}
                      />
                    ),

                    table: ({ node, ...props }) => (
                      <div className="my-3 overflow-x-auto rounded-xl border border-gray-200">
                        <table
                          {...props}
                          className="min-w-full border-collapse text-sm"
                        />
                      </div>
                    ),

                    thead: ({ node, ...props }) => (
                      <thead
                        {...props}
                        className="bg-gray-50"
                      />
                    ),

                    th: ({ node, ...props }) => (
                      <th
                        {...props}
                        className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700"
                      />
                    ),

                    td: ({ node, ...props }) => (
                      <td
                        {...props}
                        className="border-b border-gray-100 px-3 py-2 text-xs"
                      />
                    ),

                    ul: ({ node, ...props }) => (
                      <ul
                        {...props}
                        className="my-2 list-disc pl-5"
                      />
                    ),

                    ol: ({ node, ...props }) => (
                      <ol
                        {...props}
                        className="my-2 list-decimal pl-5"
                      />
                    ),

                    li: ({ node, ...props }) => (
                      <li
                        {...props}
                        className="my-1"
                      />
                    ),

                    p: ({ node, ...props }) => (
                      <p
                        {...props}
                        className="my-1.5 last:mb-0"
                      />
                    ),

                    h1: ({ node, ...props }) => (
                      <h1
                        {...props}
                        className="mb-2 mt-4 text-xl font-bold"
                      />
                    ),

                    h2: ({ node, ...props }) => (
                      <h2
                        {...props}
                        className="mb-2 mt-4 text-lg font-bold"
                      />
                    ),

                    h3: ({ node, ...props }) => (
                      <h3
                        {...props}
                        className="mb-1.5 mt-3 text-base font-bold"
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {/* Sources */}
              {message.sources &&
                message.sources.length > 0 && (
                  <div
                    className={`
                      mt-4 border-t pt-3
                      ${
                        isUser
                          ? 'border-white/10'
                          : 'border-gray-100'
                      }
                    `}
                  >
                    <div
                      className={`
                        mb-2 flex items-center gap-1.5 text-[10px]
                        font-semibold uppercase tracking-wider
                        ${
                          isUser
                            ? 'text-gray-400'
                            : 'text-gray-500'
                        }
                      `}
                    >
                      <FileText size={12} />
                      Sources
                    </div>

                    <div className="space-y-1.5">
                      {message.sources.map((source, index) => (
                        <div
                          key={index}
                          className={`
                            flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs
                            ${
                              isUser
                                ? 'bg-white/5 text-gray-300'
                                : 'border border-gray-100 bg-gray-50 text-gray-600'
                            }
                          `}
                        >
                          <FileText
                            size={12}
                            className={
                              isUser
                                ? 'text-gray-500'
                                : 'text-gray-400'
                            }
                          />

                          <span className="min-w-0 flex-1 truncate">
                            {source.documentTitle || 'Document'}
                          </span>

                          {source.chunkIndex !== undefined && (
                            <span className="flex-shrink-0 text-[10px] text-gray-400">
                              Chunk {source.chunkIndex + 1}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Copy */}
            {!isUser && content && (
              <button
                type="button"
                onClick={handleCopy}
                className="
                  absolute -bottom-8 left-1 flex items-center gap-1
                  rounded-md px-2 py-1 text-[10px] text-gray-400
                  opacity-0 transition-all
                  hover:bg-gray-100 hover:text-gray-600
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

const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div
        className="
          flex h-8 w-8 flex-shrink-0 items-center justify-center
          rounded-full bg-gradient-to-br from-blue-500
          via-indigo-500 to-violet-600 text-white shadow-sm
        "
      >
        <Sparkles size={15} />
      </div>

      <div>
        <div className="mb-1.5 px-1 text-[11px] font-semibold text-gray-500">
          Employee Copilot
        </div>

        <div
          className="
            flex items-center gap-1.5 rounded-2xl rounded-tl-md
            border border-gray-200 bg-white px-4 py-3 shadow-sm
          "
        >
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ onSuggestion }) => {
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        flex min-h-[calc(100vh-220px)] items-center
        justify-center px-4
      "
    >
      <div className="w-full max-w-2xl text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          className="
            mx-auto mb-6 flex h-16 w-16 items-center justify-center
            rounded-2xl bg-gradient-to-br from-blue-500
            via-indigo-500 to-violet-600 text-white
            shadow-xl shadow-blue-500/20
          "
        >
          <Sparkles size={28} />
        </motion.div>

        <h3 className="text-2xl font-bold tracking-tight text-gray-900">
          How can I help?
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Ask me about company policies, employees, leave,
          documents, or anything in your organization's
          knowledge base.
        </p>

        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onSuggestion(suggestion.text)}
              className="
                rounded-xl border border-gray-200 bg-white p-3
                text-left shadow-sm transition-shadow
                hover:border-blue-200 hover:shadow-md
              "
            >
              <p className="text-xs font-semibold text-gray-800">
                {suggestion.title}
              </p>

              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-400">
                {suggestion.text}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const Copilot = ({
  conversation,
  onSendMessage,
  onDeleteConversation,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastConversationIdRef = useRef(null);

  /*
   * Synchronize local messages with selected conversation.
   */
  useEffect(() => {
    if (!conversation) {
      setLocalMessages([]);
      lastConversationIdRef.current = null;
      return;
    }

    const conversationChanged =
      lastConversationIdRef.current !== conversation.id;

    if (conversationChanged) {
      setLocalMessages(conversation.messages || []);
      lastConversationIdRef.current = conversation.id;
      return;
    }

    setLocalMessages((currentMessages) => {
      const serverMessages = conversation.messages || [];

      /*
       * If there are no server messages yet, don't destroy
       * messages that were just added optimistically.
       */
      if (serverMessages.length === 0) {
        return currentMessages;
      }

      const serverIds = new Set(
        serverMessages.map((message) => String(message.id))
      );

      const optimisticMessages = currentMessages.filter(
        (message) =>
          String(message.id).startsWith('temp-') &&
          !serverIds.has(String(message.id))
      );

      return [...serverMessages, ...optimisticMessages];
    });
  }, [conversation]);

  /*
   * Scroll to newest message.
   */
  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    });
  }, [localMessages, loading]);

  /*
   * Auto-grow textarea.
   */
  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = 'auto';

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      160
    )}px`;
  };

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
    resizeTextarea();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (!loading && question.trim()) {
        handleSubmit(event);
      }
    }
  };

  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */
  const handleSubmit = async (event) => {
    event?.preventDefault();

    if (
      !question.trim() ||
      loading ||
      !conversation
    ) {
      return;
    }

    const currentQuestion = question.trim();

    /*
     * Create optimistic user message.
     */
    const optimisticUserMessage = {
      id: generateTempId(),
      role: 'user',
      content: currentQuestion,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    /*
     * Show user's message immediately.
     */
    setLocalMessages((previous) => [
      ...previous,
      optimisticUserMessage,
    ]);

    setQuestion('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setLoading(true);

    try {
      /*
       * Call parent/API.
       */
      const response = await onSendMessage(
        conversation.id,
        {
          question: currentQuestion,
        }
      );

      console.log(
        'Copilot sendMessage response:',
        response
      );

      /*
       * ========================================================
       * IMPORTANT FIX
       *
       * Your backend returns:
       *
       * {
       *   success: true,
       *   response: "AI response...",
       *   sources: [...]
       * }
       *
       * Previous code was NOT reading response.response.
       * ========================================================
       */

      const assistantContent =
        typeof response?.response === 'string'
          ? response.response
          : typeof response?.data?.response === 'string'
            ? response.data.response
            : typeof response?.message?.content === 'string'
              ? response.message.content
              : typeof response?.data?.message?.content === 'string'
                ? response.data.message.content
                : typeof response?.assistantMessage?.content === 'string'
                  ? response.assistantMessage.content
                  : typeof response?.data?.assistantMessage?.content === 'string'
                    ? response.data.assistantMessage.content
                    : null;

      /*
       * Sources can come directly from the workflow response.
       */
      const assistantSources =
        response?.sources ||
        response?.data?.sources ||
        [];

      /*
       * If backend returned the complete conversation,
       * use it directly.
       */
      const returnedMessages =
        response?.conversation?.messages ||
        response?.data?.conversation?.messages;

      if (
        Array.isArray(returnedMessages) &&
        returnedMessages.length > 0
      ) {
        setLocalMessages(returnedMessages);
      }

      /*
       * Otherwise construct the assistant message locally
       * from the backend's `response` field.
       */
      else if (assistantContent) {
        const assistantMessage = {
          id: generateTempId(),
          role: 'assistant',
          content: assistantContent,
          sources: assistantSources,
          created_at: new Date().toISOString(),
        };

        /*
         * IMPORTANT:
         *
         * Keep the user's message.
         * Add the AI message after it.
         */
        setLocalMessages((previous) => [
          ...previous.map((message) =>
            message.id === optimisticUserMessage.id
              ? {
                  ...message,
                  optimistic: false,
                }
              : message
          ),
          assistantMessage,
        ]);
      }

      /*
       * This means the parent may update conversation state
       * asynchronously. We leave the optimistic user message
       * visible rather than removing it.
       */
      else {
        console.warn(
          'No assistant response found in API response:',
          response
        );

        setLocalMessages((previous) =>
          previous.map((message) =>
            message.id === optimisticUserMessage.id
              ? {
                  ...message,
                  optimistic: false,
                }
              : message
          )
        );
      }
    } catch (error) {
      console.error(
        'Error sending message:',
        error
      );

      /*
       * Remove optimistic user message only when
       * the API request actually failed.
       */
      setLocalMessages((previous) =>
        previous.filter(
          (message) =>
            message.id !== optimisticUserMessage.id
        )
      );

      /*
       * Restore question so user can retry.
       */
      setQuestion(currentQuestion);

      setTimeout(() => {
        resizeTextarea();
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (text) => {
    setQuestion(text);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  };

  const handleDelete = async () => {
    if (!conversation || loading) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation?'
    );

    if (!confirmed) {
      return;
    }

    try {
      await onDeleteConversation(conversation.id);
    } catch (error) {
      console.error(
        'Error deleting conversation:',
        error
      );
    }
  };

  /*
   * Deduplicate messages.
   */
  const messages = useMemo(() => {
    const seen = new Map();

    for (const message of localMessages) {
      const key = String(
        message.id ||
          `${message.role}-${message.created_at}-${message.content}`
      );

      seen.set(key, message);
    }

    return Array.from(seen.values());
  }, [localMessages]);

  /*
   * Empty state.
   */
  if (!conversation) {
    return (
      <div
        className="
          flex h-full items-center justify-center
          bg-gradient-to-br from-gray-50 via-white to-blue-50/30
        "
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 text-center"
        >
          <div
            className="
              mx-auto mb-5 flex h-16 w-16 items-center
              justify-center rounded-2xl
              bg-gradient-to-br from-blue-500
              via-indigo-500 to-violet-600 text-white
              shadow-xl shadow-blue-500/20
            "
          >
            <Sparkles size={28} />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Employee Copilot
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
            Select a conversation or create a new one
            to start chatting with your AI assistant.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="
        flex h-full min-h-0 flex-col
        bg-[#fafafa]
      "
    >
      {/* HEADER */}
      <header
        className="
          z-10 flex flex-shrink-0 items-center justify-between
          border-b border-gray-200/80 bg-white/90 px-4 py-3
          backdrop-blur-xl sm:px-6
        "
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              relative flex h-10 w-10 flex-shrink-0
              items-center justify-center rounded-xl
              bg-gradient-to-br from-blue-500
              via-indigo-500 to-violet-600 text-white
              shadow-md shadow-blue-500/20
            "
          >
            <Sparkles size={19} />

            <span
              className="
                absolute -bottom-0.5 -right-0.5
                h-2.5 w-2.5 rounded-full border-2
                border-white bg-emerald-500
              "
            />
          </div>

          <div className="min-w-0">
            <h2
              className="
                truncate text-sm font-bold tracking-tight
                text-gray-900 sm:text-base
              "
            >
              {conversation.title || 'New Conversation'}
            </h2>

            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-emerald-600">
                Online
              </span>

              <span className="h-1 w-1 rounded-full bg-gray-300" />

              <span className="text-[11px] text-gray-400">
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
            flex h-9 w-9 items-center justify-center
            rounded-lg text-gray-400 transition-all
            hover:bg-red-50 hover:text-red-500
            disabled:cursor-not-allowed disabled:opacity-40
          "
          title="Delete conversation"
          aria-label="Delete conversation"
        >
          <Trash2 size={17} />
        </button>
      </header>

      {/* MESSAGES */}
      <main
        className="
          min-h-0 flex-1 overflow-y-auto
          scroll-smooth
        "
      >
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
          {messages.length > 0 ? (
            <div className="space-y-7">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                  />
                ))}
              </AnimatePresence>

              {loading && <TypingIndicator />}

              <div
                ref={messagesEndRef}
                className="h-1"
              />
            </div>
          ) : (
            <>
              <EmptyState
                onSuggestion={handleSuggestion}
              />

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      {/* INPUT */}
      <footer
        className="
          flex-shrink-0 border-t border-gray-200/80
          bg-white/90 backdrop-blur-xl
        "
      >
        <div className="mx-auto w-full max-w-4xl px-4 py-3 sm:px-6 sm:py-4">
          <form onSubmit={handleSubmit}>
            <div
              className="
                relative rounded-2xl border border-gray-200
                bg-gray-50 p-2 shadow-sm transition-all
                duration-200
                focus-within:border-blue-300
                focus-within:bg-white
                focus-within:shadow-lg
                focus-within:shadow-blue-500/5
                focus-within:ring-4
                focus-within:ring-blue-500/5
              "
            >
              <div className="flex items-end gap-2">
                {/* AI icon */}
                <div
                  className="
                    mb-1 flex h-9 w-9 flex-shrink-0
                    items-center justify-center rounded-xl
                    bg-gradient-to-br from-blue-500
                    to-violet-600 text-white
                  "
                >
                  <Sparkles size={15} />
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={question}
                  onChange={handleQuestionChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message your AI copilot..."
                  disabled={loading}
                  autoComplete="off"
                  className="
                    max-h-40 min-h-[40px] min-w-0 flex-1
                    resize-none overflow-y-auto bg-transparent
                    px-1 py-2.5 text-sm leading-5
                    text-gray-900 outline-none
                    placeholder:text-gray-400
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />

                {/* Send */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={
                    loading ||
                    !question.trim()
                  }
                  className="
                    mb-1 flex h-9 w-9 flex-shrink-0
                    items-center justify-center rounded-xl
                    bg-gray-900 text-white shadow-sm
                    transition-all
                    hover:bg-gray-800
                    disabled:cursor-not-allowed
                    disabled:bg-gray-200
                    disabled:text-gray-400
                  "
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={16} />
                  )}
                </motion.button>
              </div>

              {/* Bottom controls */}
              <div className="mt-1 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="hidden items-center gap-1 sm:flex">
                    <FiCommand size={10} />
                    <span>Enter to send</span>
                  </span>

                  <span className="hidden text-gray-300 sm:block">
                    •
                  </span>

                  <span>
                    Shift + Enter for new line
                  </span>
                </div>

                <span className="text-[10px] text-gray-300">
                  {question.length > 0
                    ? `${question.length}`
                    : ''}
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-400">
              <Sparkles size={9} />

              <span>
                Employee Copilot may make mistakes.
                Verify important information.
              </span>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default Copilot;