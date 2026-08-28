
import { useState } from 'react';
import {
  Send,
  Loader2,
  FileText,
  Trash2,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full mb-6 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex items-start gap-3 max-w-[85%] sm:max-w-[80%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gradient-to-br from-violet-500 to-blue-600 text-white'
          }`}
        >
          {isUser ? <User size={17} /> : <Bot size={18} />}
        </div>

        {/* Message Content */}
        <div className="min-w-0">
          {/* Sender */}
          <div
            className={`flex items-center gap-2 mb-1.5 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="text-xs font-semibold text-gray-500">
              {isUser ? 'You' : 'Employee Copilot'}
            </span>

            {!isUser && (
              <Sparkles size={12} className="text-violet-500" />
            )}
          </div>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              isUser
                ? 'bg-blue-600 text-white rounded-tr-md'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-md'
            }`}
          >
            {/* IMPORTANT:
                className is NOT passed to ReactMarkdown.
                It is applied to this wrapper instead.
            */}
            <div
              className={`text-sm leading-6 ${
                isUser
                  ? 'prose prose-sm prose-invert max-w-none'
                  : 'prose prose-sm max-w-none'
              }`}
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
                          ? 'underline font-medium'
                          : 'text-blue-600 hover:text-blue-700 underline font-medium'
                      }
                    />
                  ),

                  code: ({ node, inline, className, children, ...props }) => {
                    if (inline) {
                      return (
                        <code
                          className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                            isUser
                              ? 'bg-blue-700 text-blue-50'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-950">
                        <pre className="overflow-x-auto p-4 text-xs leading-5 text-gray-100">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  },

                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      {...props}
                      className={`border-l-4 pl-4 my-3 italic ${
                        isUser
                          ? 'border-blue-300 text-blue-100'
                          : 'border-blue-500 text-gray-600'
                      }`}
                    />
                  ),

                  table: ({ node, ...props }) => (
                    <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
                      <table
                        {...props}
                        className="min-w-full text-sm border-collapse"
                      />
                    </div>
                  ),

                  th: ({ node, ...props }) => (
                    <th
                      {...props}
                      className="px-3 py-2 bg-gray-100 text-left font-semibold border-b border-gray-200"
                    />
                  ),

                  td: ({ node, ...props }) => (
                    <td
                      {...props}
                      className="px-3 py-2 border-b border-gray-100"
                    />
                  ),

                  ul: ({ node, ...props }) => (
                    <ul {...props} className="my-2 pl-5 list-disc" />
                  ),

                  ol: ({ node, ...props }) => (
                    <ol {...props} className="my-2 pl-5 list-decimal" />
                  ),

                  p: ({ node, ...props }) => (
                    <p {...props} className="my-1.5 last:mb-0" />
                  ),

                  h1: ({ node, ...props }) => (
                    <h1
                      {...props}
                      className="text-xl font-bold mt-4 mb-2"
                    />
                  ),

                  h2: ({ node, ...props }) => (
                    <h2
                      {...props}
                      className="text-lg font-bold mt-4 mb-2"
                    />
                  ),

                  h3: ({ node, ...props }) => (
                    <h3
                      {...props}
                      className="text-base font-bold mt-3 mb-1.5"
                    />
                  ),
                }}
              >
                {message.content || ''}
              </ReactMarkdown>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div
                className={`mt-4 pt-3 border-t ${
                  isUser ? 'border-blue-400/40' : 'border-gray-200'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${
                    isUser ? 'text-blue-100' : 'text-gray-600'
                  }`}
                >
                  <FileText size={13} />
                  Sources
                </div>

                <div className="space-y-1.5">
                  {message.sources.map((source, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${
                        isUser
                          ? 'bg-blue-700/50 text-blue-50'
                          : 'bg-gray-50 border border-gray-100 text-gray-600'
                      }`}
                    >
                      <FileText
                        size={13}
                        className={
                          isUser ? 'text-blue-200' : 'text-gray-400'
                        }
                      />

                      <span className="truncate">
                        {source.documentTitle || 'Document'}
                      </span>

                      {source.chunkIndex !== undefined && (
                        <span
                          className={`ml-auto flex-shrink-0 ${
                            isUser ? 'text-blue-200' : 'text-gray-400'
                          }`}
                        >
                          Chunk {source.chunkIndex + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Copilot = ({ conversation, onSendMessage, onDeleteConversation }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim() || loading || !conversation) {
      return;
    }

    const currentQuestion = question.trim();

    setLoading(true);

    try {
      await onSendMessage(conversation.id, {
        question: currentQuestion,
      });

      setQuestion('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!conversation) {
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
      console.error('Error deleting conversation:', error);
    }
  };

  /*
   * Empty state
   */
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg">
            <Bot size={30} />
          </div>

          <h2 className="text-xl font-semibold text-gray-900">
            Employee Copilot
          </h2>

          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Select a conversation or create a new one to start chatting with
            your AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      {/* ================= HEADER ================= */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Conversation Info */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-sm">
              <Bot size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                {conversation.title || 'New Conversation'}
              </h2>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-xs text-gray-500">
                  AI Assistant
                </span>
              </div>
            </div>
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete conversation"
            aria-label="Delete conversation"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* ================= MESSAGES ================= */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
          {conversation.messages &&
          conversation.messages.length > 0 ? (
            <>
              {conversation.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                />
              ))}
            </>
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <Sparkles
                    size={25}
                    className="text-violet-500"
                  />
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  How can I help you?
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Ask questions about company policies, documents,
                  employees, leave, or anything available in your
                  knowledge base.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
                    📄 Company policies
                  </div>

                  <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
                    🏖️ Leave policy
                  </div>

                  <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
                    💼 Employee handbook
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Message */}
          {loading && (
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-sm">
                <Bot size={18} />
              </div>

              <div>
                <div className="mb-1.5 text-xs font-semibold text-gray-500">
                  Employee Copilot
                </div>

                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <Loader2
                    size={16}
                    className="animate-spin text-blue-600"
                  />

                  <span className="text-sm text-gray-500">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= INPUT ================= */}
      <footer className="flex-shrink-0 border-t border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-3 sm:px-6 sm:py-4">
          <form onSubmit={handleSubmit}>
            <div className="relative flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 shadow-sm transition-all focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask your copilot anything..."
                disabled={loading}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-gray-400">
              Employee Copilot can make mistakes. Verify important
              information.
            </p>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default Copilot;
