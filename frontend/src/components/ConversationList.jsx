import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Search,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(
    conversation.title || 'New Conversation'
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setEditedTitle(conversation.title || 'New Conversation');
  }, [conversation.title]);

  const handleEdit = async () => {
    const title = editedTitle.trim();

    if (!title) {
      setEditedTitle(conversation.title || 'New Conversation');
      setIsEditing(false);
      return;
    }

    if (title === conversation.title) {
      setIsEditing(false);
      return;
    }

    try {
      await onEdit(conversation.id, { title });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit title:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this conversation?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDelete(conversation.id);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleEdit();
    }

    if (event.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(conversation.title || 'New Conversation');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) {
      return 'Just now';
    }

    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}m ago`;
    }

    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    }

    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: isDeleting ? 0 : 1,
        y: 0,
        scale: isDeleting ? 0.96 : 1,
      }}
      transition={{ duration: 0.18 }}
      className="relative"
    >
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ duration: 0.15 }}
        onClick={() => !isEditing && !isDeleting && onSelect(conversation)}
        className={`
          group relative cursor-pointer overflow-hidden rounded-xl
          border transition-all duration-200
          ${
            isActive
              ? 'border-blue-200 bg-blue-50/80 shadow-sm'
              : 'border-transparent bg-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm'
          }
        `}
      >
        {/* Active indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="activeConversation"
              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-blue-500 to-violet-500"
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
            />
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 px-3 py-3">
          {/* Icon */}
          <div
            className={`
              flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg
              transition-all duration-200
              ${
                isActive
                  ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
              }
            `}
          >
            <MessageSquare size={16} strokeWidth={2} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  autoFocus
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="
                    min-w-0 flex-1 rounded-lg border border-blue-300
                    bg-white px-2 py-1.5 text-sm font-medium text-gray-900
                    outline-none ring-2 ring-blue-500/10
                  "
                />

                <button
                  type="button"
                  onClick={handleEdit}
                  className="
                    flex h-7 w-7 flex-shrink-0 items-center justify-center
                    rounded-md text-emerald-600 transition-colors
                    hover:bg-emerald-50
                  "
                  title="Save"
                >
                  <Check size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(
                      conversation.title || 'New Conversation'
                    );
                  }}
                  className="
                    flex h-7 w-7 flex-shrink-0 items-center justify-center
                    rounded-md text-gray-400 transition-colors
                    hover:bg-gray-100 hover:text-gray-600
                  "
                  title="Cancel"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <>
                <h4
                  className={`
                    truncate text-sm font-medium
                    ${
                      isActive
                        ? 'text-gray-900'
                        : 'text-gray-700 group-hover:text-gray-900'
                    }
                  `}
                >
                  {conversation.title || 'New Conversation'}
                </h4>

                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`
                      text-[11px]
                      ${isActive ? 'text-blue-600' : 'text-gray-400'}
                    `}
                  >
                    {formatDate(conversation.updated_at)}
                  </span>

                  {isActive && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-blue-400" />
                      <span className="text-[11px] font-medium text-blue-500">
                        Active
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div
              className="
                flex flex-shrink-0 items-center gap-0.5
                opacity-0 transition-opacity duration-200
                group-hover:opacity-100
              "
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="
                  flex h-7 w-7 items-center justify-center rounded-md
                  text-gray-400 transition-all hover:bg-gray-100
                  hover:text-gray-700
                "
                title="Rename"
              >
                <Edit3 size={14} />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="
                  flex h-7 w-7 items-center justify-center rounded-md
                  text-gray-400 transition-all
                  hover:bg-red-50 hover:text-red-500
                  disabled:cursor-not-allowed disabled:opacity-50
                "
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConversationList = ({
  conversations = [],
  activeConversation,
  onSelect,
  onCreate,
  onDelete,
  onEdit,
}) => {
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((conversation) =>
    (conversation.title || 'New Conversation')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200/80 bg-white">
        <div className="px-4 pb-3 pt-4">
          {/* Brand */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="
                flex h-10 w-10 items-center justify-center rounded-xl
                bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600
                text-white shadow-md shadow-blue-500/20
              "
            >
              <Sparkles size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-tight text-gray-900">
                Employee Copilot
              </h2>
              <p className="text-[11px] text-gray-400">
                Your AI workspace
              </p>
            </div>

            <button
              type="button"
              onClick={onCreate}
              className="
                flex h-9 w-9 items-center justify-center rounded-xl
                bg-gray-900 text-white shadow-sm
                transition-all duration-200
                hover:bg-gray-800 hover:shadow-md
                active:scale-95
              "
              title="New conversation"
              aria-label="New conversation"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="
                pointer-events-none absolute left-3 top-1/2
                -translate-y-1/2 text-gray-400
              "
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="
                h-9 w-full rounded-lg border border-gray-200
                bg-gray-50 pl-9 pr-3 text-xs text-gray-900
                outline-none transition-all
                placeholder:text-gray-400
                focus:border-blue-300 focus:bg-white
                focus:ring-3 focus:ring-blue-500/10
              "
            />
          </div>
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
          Conversations
        </span>

        {conversations.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
            {conversations.length}
          </span>
        )}
      </div>

      {/* Conversation list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filteredConversations.length > 0 ? (
            <motion.div
              layout
              className="space-y-1"
            >
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={
                    activeConversation?.id === conversation.id
                  }
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ))}
            </motion.div>
          ) : search ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 py-12 text-center"
            >
              <div
                className="
                  mx-auto mb-3 flex h-11 w-11 items-center justify-center
                  rounded-xl bg-gray-100 text-gray-400
                "
              >
                <Search size={19} />
              </div>

              <p className="text-sm font-medium text-gray-700">
                No conversations found
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Try a different search
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 py-12 text-center"
            >
              <div
                className="
                  mx-auto mb-4 flex h-14 w-14 items-center justify-center
                  rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50
                  text-blue-500 ring-1 ring-blue-100
                "
              >
                <MessageSquare size={23} />
              </div>

              <h3 className="text-sm font-semibold text-gray-800">
                No conversations yet
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-gray-400">
                Start a conversation with your AI copilot.
              </p>

              <button
                type="button"
                onClick={onCreate}
                className="
                  mt-4 inline-flex items-center gap-1.5 rounded-lg
                  bg-gray-900 px-3 py-2 text-xs font-medium text-white
                  shadow-sm transition-all hover:bg-gray-800
                  active:scale-95
                "
              >
                <Plus size={14} />
                Start chatting
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom status */}
      <div className="flex-shrink-0 border-t border-gray-200/80 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>

          <span className="text-[11px] font-medium text-gray-500">
            Copilot ready
          </span>

          <MoreHorizontal
            size={14}
            className="ml-auto text-gray-300"
          />
        </div>
      </div>
    </aside>
  );
};

export default ConversationList;