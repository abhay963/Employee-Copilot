import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  X,
  Check,
  Search,
  Clock3,
  MoreHorizontal,
  BrainCircuit,
  Edit3,
  Trash2,
} from 'lucide-react';

// ============================================================
// HELPERS
// ============================================================

const getConversationDate = (conversation) => {
  return (
    conversation?.updated_at ||
    conversation?.updatedAt ||
    conversation?.created_at ||
    conversation?.createdAt ||
    null
  );
};

const getTimestamp = (conversation) => {
  const value = getConversationDate(conversation);

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatTime = (dateString) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();

  const difference =
    now.getTime() - date.getTime();

  if (difference < 60 * 1000) {
    return 'Just now';
  }

  if (difference < 60 * 60 * 1000) {
    const minutes = Math.floor(
      difference / (60 * 1000)
    );

    return `${minutes}m ago`;
  }

  if (difference < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(
      difference / (60 * 60 * 1000)
    );

    return `${hours}h ago`;
  }

  if (difference < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(
      difference / (24 * 60 * 60 * 1000)
    );

    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== now.getFullYear()
        ? 'numeric'
        : undefined,
  });
};

// ============================================================
// CONVERSATION ITEM
// ============================================================

const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onEdit,
}) => {
  const [isEditing, setIsEditing] =
    useState(false);

  const [editedTitle, setEditedTitle] =
    useState(
      conversation?.title ||
        'New Conversation'
    );

  const [isDeleting, setIsDeleting] =
    useState(false);

  // ----------------------------------------------------------
  // TITLE HOVER / MARQUEE STATE
  // ----------------------------------------------------------

  const titleContainerRef = useRef(null);
  const titleTextRef = useRef(null);

  const [isTitleOverflowing, setIsTitleOverflowing] =
    useState(false);

  const [isTitleHovered, setIsTitleHovered] =
    useState(false);

  // ----------------------------------------------------------
  // CHECK TITLE OVERFLOW
  // ----------------------------------------------------------

  useEffect(() => {
    const checkTitleOverflow = () => {
      const container = titleContainerRef.current;
      const text = titleTextRef.current;

      if (!container || !text) {
        return;
      }

      setIsTitleOverflowing(
        text.scrollWidth > container.clientWidth + 1
      );
    };

    checkTitleOverflow();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(
            checkTitleOverflow
          )
        : null;

    if (resizeObserver) {
      if (titleContainerRef.current) {
        resizeObserver.observe(
          titleContainerRef.current
        );
      }

      if (titleTextRef.current) {
        resizeObserver.observe(
          titleTextRef.current
        );
      }
    }

    window.addEventListener(
      'resize',
      checkTitleOverflow
    );

    return () => {
      window.removeEventListener(
        'resize',
        checkTitleOverflow
      );

      resizeObserver?.disconnect();
    };
  }, [
    conversation?.title,
  ]);

  // ----------------------------------------------------------
  // RESET EDITED TITLE
  // ----------------------------------------------------------

  useEffect(() => {
    setEditedTitle(
      conversation?.title ||
        'New Conversation'
    );
  }, [conversation?.title]);

  const updatedAt =
    getConversationDate(conversation);

  // ----------------------------------------------------------
  // EDIT
  // ----------------------------------------------------------

  const handleEdit = async () => {
    const title = editedTitle.trim();

    if (!title) {
      setEditedTitle(
        conversation?.title ||
          'New Conversation'
      );

      setIsEditing(false);

      return;
    }

    if (
      title ===
      (conversation?.title ||
        'New Conversation')
    ) {
      setIsEditing(false);

      return;
    }

    try {
      await onEdit(
        conversation.id,
        { title }
      );

      setIsEditing(false);
    } catch (error) {
      console.error(
        'Failed to edit conversation:',
        error
      );
    }
  };

  // ----------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete this conversation? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);

      await onDelete(conversation.id);
    } catch (error) {
      console.error(
        'Failed to delete conversation:',
        error
      );

      setIsDeleting(false);
    }
  };

  // ----------------------------------------------------------
  // KEYBOARD
  // ----------------------------------------------------------

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();

      handleEdit();
    }

    if (event.key === 'Escape') {
      setIsEditing(false);

      setEditedTitle(
        conversation?.title ||
          'New Conversation'
      );
    }
  };

  // ----------------------------------------------------------
  // TITLE HOVER
  // ----------------------------------------------------------

  const handleTitleMouseEnter = () => {
    if (isTitleOverflowing) {
      setIsTitleHovered(true);
    }
  };

  const handleTitleMouseLeave = () => {
    setIsTitleHovered(false);
  };

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 8,
        scale: 0.98,
      }}
      animate={{
        opacity: isDeleting ? 0 : 1,
        y: 0,
        scale: isDeleting ? 0.94 : 1,
      }}
      exit={{
        opacity: 0,
        x: -20,
        scale: 0.95,
      }}
      transition={{
        duration: 0.22,
        ease: 'easeOut',
      }}
      className="relative"
    >
      <motion.div
        whileHover={
          isDeleting || isEditing
            ? undefined
            : {
                x: 2,
              }
        }
        transition={{
          duration: 0.15,
        }}
        onClick={() => {
          if (!isEditing && !isDeleting) {
            onSelect(conversation);
          }
        }}
        className={`
          group
          relative
          overflow-hidden
          cursor-pointer
          rounded-2xl
          border
          transition-all
          duration-200
          ${
            isActive
              ? `
                border-accent-primary
                bg-accent-primary-light
                shadow-sm
              `
              : `
                border-transparent
                bg-transparent
                hover:border-default
                hover:bg-hover
                hover:shadow-md
              `
          }
        `}
      >
        {/* ====================================================
            ACTIVE GLOW
        ==================================================== */}

        {isActive && (
          <motion.div
            layoutId="conversation-active-bar"
            className="
              absolute
              left-0
              top-3
              bottom-3
              w-[3px]
              rounded-r-full
              bg-gradient-to-b
              from-violet-500
              via-indigo-500
              to-blue-500
            "
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 32,
            }}
          />
        )}

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <div className="flex items-center gap-3 px-3 py-3">

          {/* ==================================================
              ICON
          ================================================== */}

          <motion.div
            animate={
              isActive
                ? {
                    scale: [1, 1.04, 1],
                  }
                : {
                    scale: 1,
                  }
            }
            transition={{
              duration: 2,
              repeat: isActive
                ? Infinity
                : 0,
              repeatDelay: 3,
            }}
            className={`
              relative
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              transition-all
              duration-200
              ${
                isActive
                  ? `
                    bg-gradient-to-br
                    from-violet-500
                    via-indigo-500
                    to-blue-600
                    text-inverse
                    shadow-md
                    shadow-violet-500/20
                  `
                  : `
                    bg-surface-tertiary
                    text-secondary
                    group-hover:bg-accent-primary-lighter
                    group-hover:text-accent-primary
                  `
              }
            `}
          >
            <MessageSquare
              size={16}
              strokeWidth={
                isActive ? 2.2 : 1.9
              }
            />

            {isActive && (
              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  h-2
                  w-2
                  rounded-full
                  border-2
                  border-inverse
                  bg-success
                "
              />
            )}
          </motion.div>

          {/* ==================================================
              TEXT
          ================================================== */}

          <div className="min-w-0 flex-1">

            {isEditing ? (
              <div
                className="flex items-center gap-1.5"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <input
                  autoFocus
                  type="text"
                  value={editedTitle}
                  onChange={(event) =>
                    setEditedTitle(
                      event.target.value
                    )
                  }
                  onKeyDown={handleKeyDown}
                  className="
                    min-w-0
                    flex-1
                    rounded-lg
                    border
                    border-accent-primary
                    bg-surface
                    px-2.5
                    py-1.5
                    text-xs
                    font-medium
                    text-primary
                    outline-none
                    ring-4
                    ring-focus-ring
                  "
                />

                <button
                  type="button"
                  onClick={handleEdit}
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    text-success
                    transition
                    hover:bg-success-light
                  "
                  title="Save"
                >
                  <Check size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);

                    setEditedTitle(
                      conversation?.title ||
                        'New Conversation'
                    );
                  }}
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    text-tertiary
                    transition
                    hover:bg-hover
                    hover:text-secondary
                  "
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                {/* ==================================================
                    TITLE WITH HOVER SLIDE
                ================================================== */}

                <div
                  ref={titleContainerRef}
                  className="
                    min-w-0
                    overflow-hidden
                    whitespace-nowrap
                  "
                  onMouseEnter={
                    handleTitleMouseEnter
                  }
                  onMouseLeave={
                    handleTitleMouseLeave
                  }
                >
                  <motion.h4
                    ref={titleTextRef}
                    initial={false}
                    animate={
                      isTitleHovered &&
                      isTitleOverflowing
                        ? {
                            x: [
                              0,
                              -Math.max(
                                0,
                                (titleTextRef.current
                                  ?.scrollWidth ||
                                  0) -
                                  (titleContainerRef.current
                                    ?.clientWidth ||
                                    0)
                              ),
                              0,
                            ],
                          }
                        : {
                            x: 0,
                          }
                    }
                    transition={
                      isTitleHovered &&
                      isTitleOverflowing
                        ? {
                            duration: Math.max(
                              3,
                              Math.min(
                                8,
                                ((titleTextRef.current
                                  ?.scrollWidth ||
                                  0) -
                                  (titleContainerRef.current
                                    ?.clientWidth ||
                                    0)) /
                                  35
                              )
                            ),
                            ease: 'easeInOut',
                            repeat: Infinity,
                            repeatType: 'loop',
                            repeatDelay: 0.8,
                          }
                        : {
                            duration: 0.2,
                          }
                    }
                    className={`
                      inline-block
                      max-w-none
                      text-[13px]
                      leading-5
                      ${
                        isActive
                          ? 'font-semibold text-primary'
                          : 'font-medium text-secondary group-hover:text-primary'
                      }
                    `}
                  >
                    {conversation?.title ||
                      'New Conversation'}
                  </motion.h4>
                </div>

                {/* ==================================================
                    TIME
                ================================================== */}

                <div className="mt-1 flex items-center gap-1.5">

                  <Clock3
                    size={11}
                    className={
                      isActive
                        ? 'text-accent-primary'
                        : 'text-tertiary'
                    }
                  />

                  <span
                    className={`
                      truncate
                      text-[10px]
                      ${
                        isActive
                          ? 'font-medium text-accent-primary'
                          : 'text-tertiary'
                      }
                    `}
                  >
                    {formatTime(updatedAt)}
                  </span>

                  {isActive && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-accent-primary" />

                      <span className="text-[10px] font-semibold text-accent-primary">
                        Active
                      </span>
                    </>
                  )}

                </div>
              </>
            )}
          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          {!isEditing && (
            <div
              className="
                flex
                shrink-0
                items-center
                gap-0.5
                opacity-0
                translate-x-1
                transition-all
                duration-200
                group-hover:translate-x-0
                group-hover:opacity-100
              "
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() =>
                  setIsEditing(true)
                }
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  text-tertiary
                  transition-all
                  hover:bg-accent-primary-lighter
                  hover:text-accent-primary
                "
                title="Rename"
              >
                <Edit3 size={13} />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  text-tertiary
                  transition-all
                  hover:bg-danger-light
                  hover:text-danger
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ====================================================
            SUBTLE ACTIVE SHINE
        ==================================================== */}

        {isActive && (
          <motion.div
            initial={{
              opacity: 0,
              x: '-100%',
            }}
            animate={{
              opacity: [0, 0.45, 0],
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              repeatDelay: 6,
              ease: 'easeInOut',
            }}
            className="
              pointer-events-none
              absolute
              inset-y-0
              left-0
              w-1/2
              bg-gradient-to-r
              from-transparent
              via-white/70
              to-transparent
              skew-x-[-20deg]
            "
          />
        )}
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// CONVERSATION GROUP
// ============================================================

// ============================================================
// MAIN COMPONENT
// ============================================================

const ConversationList = ({
  conversations = [],
  activeConversation,
  onSelect,
  onCreate,
  onDelete,
  onEdit,
}) => {
  const [search, setSearch] =
    useState('');

  // ==========================================================
  // SEARCH + SORT + GROUP
  // ==========================================================

  const filteredConversations = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return [...conversations]
      .filter((conversation) => {
        if (!normalizedSearch) {
          return true;
        }

        const title =
          conversation?.title ||
          'New Conversation';

        return title
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort(
        (a, b) =>
          getTimestamp(b) -
          getTimestamp(a)
      );
  }, [conversations, search]);

  const visibleConversationCount =
    filteredConversations.length;

  // ==========================================================
  // CLEAR SEARCH
  // ==========================================================

  const handleClearSearch = () => {
    setSearch('');
  };

  return (
    <aside
      className="
        flex
        h-full
        min-h-0
        w-full
        flex-col
        overflow-hidden
        bg-surface-secondary
      "
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="
          shrink-0
          border-b
          border-default
          bg-surface
        "
      >
        <div className="px-4 pb-4 pt-4">

          {/* ==================================================
              BRAND ROW
          ================================================== */}

          <div className="mb-4 flex items-center gap-3">

            <motion.div
              whileHover={{
                scale: 1.05,
                rotate: 2,
              }}
              transition={{
                type: 'spring',
                stiffness: 350,
                damping: 20,
              }}
              className="
                relative
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-violet-500
                via-indigo-500
                to-blue-600
                text-white
                shadow-lg
                shadow-violet-500/20
              "
            >
              <BrainCircuit
                size={18}
                strokeWidth={2}
              />
            </motion.div>

            <div className="min-w-0 flex-1">

              <h2
                className="
                  truncate
                  text-[13px]
                  font-bold
                  tracking-tight
                  text-primary
                "
              >
                Employee Copilot
              </h2>

              <p className="mt-0.5 truncate text-[10px] text-secondary">
                Intelligent workspace
              </p>

            </div>

            {/* NEW CHAT */}

            <motion.button
              type="button"
              onClick={onCreate}
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.94,
              }}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-violet-500
                to-indigo-600
                text-white
                shadow-md
                shadow-violet-500/20
                transition-all
                hover:shadow-lg
                hover:shadow-violet-500/30
              "
              title="New conversation"
              aria-label="New conversation"
            >
              <Plus
                size={18}
                strokeWidth={2.3}
              />
            </motion.button>

          </div>

          {/* ==================================================
              SEARCH
          ================================================== */}

          <div className="relative">

            <Search
              size={15}
              strokeWidth={2}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-tertiary
              "
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search conversations"
              className="
                h-10
                w-full
                rounded-xl
                border
                border-default
                bg-input
                pl-9
                pr-9
                text-xs
                font-medium
                text-primary
                outline-none
                transition-all
                placeholder:text-muted
                focus:border-accent-primary
                focus:bg-input-focus
                focus:ring-4
                focus:ring-focus-ring
              "
            />

            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  type="button"
                  onClick={
                    handleClearSearch
                  }
                  className="
                    absolute
                    right-2
                    top-1/2
                    flex
                    h-6
                    w-6
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-md
                    text-tertiary
                    transition
                    hover:bg-hover
                    hover:text-secondary
                  "
                  title="Clear search"
                >
                  <X size={13} />
                </motion.button>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* ======================================================
          LIST HEADER
      ====================================================== */}

      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">

        <div className="flex items-center gap-2">

          <span
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-tertiary
            "
          >
            Conversations
          </span>

          {conversations.length > 0 && (
            <span
              className="
                flex
                h-5
                min-w-5
                items-center
                justify-center
                rounded-full
                bg-accent-primary-light
                px-1.5
                text-[9px]
                font-bold
                text-accent-primary
              "
            >
              {conversations.length}
            </span>
          )}

        </div>

        {search && (
          <span className="text-[9px] font-medium text-tertiary">
            {visibleConversationCount}{' '}
            result
            {visibleConversationCount !== 1
              ? 's'
              : ''}
          </span>
        )}

      </div>

      {/* ======================================================
          CONVERSATION CONTENT
      ====================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          px-2
          pb-3
          scrollbar-thin
        "
      >

        {visibleConversationCount >
        0 ? (
          <motion.div
            layout
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.2,
            }}
            className="space-y-1"
          >
            <AnimatePresence mode="popLayout">
              {filteredConversations.map(
                (conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={
                      activeConversation?.id ===
                      conversation.id
                    }
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                )
              )}
            </AnimatePresence>
          </motion.div>
        ) : search ? (
          /* ====================================================
             SEARCH EMPTY
          ==================================================== */

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
              px-5
              py-14
              text-center
            "
          >
            <div
              className="
                mx-auto
                mb-4
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-surface
                text-tertiary
                shadow-sm
                ring-1
                ring-default
              "
            >
              <Search size={19} />
            </div>

            <h3 className="text-xs font-semibold text-primary">
              No conversations found
            </h3>

            <p className="mt-1.5 text-[10px] leading-5 text-tertiary">
              Try another keyword or clear
              your search.
            </p>

            <button
              type="button"
              onClick={
                handleClearSearch
              }
              className="
                mt-4
                rounded-lg
                bg-accent-primary-light
                px-3
                py-2
                text-[10px]
                font-semibold
                text-accent-primary
                transition
                hover:bg-accent-primary-lighter
              "
            >
              Clear search
            </button>
          </motion.div>
        ) : (
          /* ====================================================
             NO CONVERSATIONS
          ==================================================== */

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
              px-5
              py-12
              text-center
            "
          >
            <motion.div
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="
                mx-auto
                mb-5
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-violet-50
                via-indigo-50
                to-blue-50
                text-accent-primary
                shadow-sm
                ring-1
                ring-accent-primary-light
              "
            >
              <MessageSquare
                size={22}
                strokeWidth={1.8}
              />
            </motion.div>

            <h3 className="text-xs font-semibold text-primary">
              No conversations yet
            </h3>

            <p className="mx-auto mt-1.5 max-w-[190px] text-[10px] leading-5 text-tertiary">
              Start a conversation and your
              AI workspace will appear here.
            </p>

            <motion.button
              type="button"
              onClick={onCreate}
              whileHover={{
                y: -1,
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.97,
              }}
              className="
                mt-5
                inline-flex
                items-center
                gap-1.5
                rounded-xl
                bg-gradient-to-r
                from-violet-500
                to-indigo-600
                px-3.5
                py-2.5
                text-[10px]
                font-semibold
                text-white
                shadow-md
                shadow-violet-500/20
              "
            >
              <Plus size={13} />
              Start chatting
            </motion.button>
          </motion.div>
        )}

      </div>

      {/* ======================================================
          FOOTER STATUS
      ====================================================== */}

      <div
        className="
          shrink-0
          border-t
          border-default
          bg-surface
          px-4
          py-3
        "
      >
        <div className="flex items-center gap-2">

          <span className="relative flex h-2 w-2">

            <motion.span
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="
                absolute
                inset-0
                rounded-full
                bg-success
              "
            />

            <span
              className="
                relative
                h-2
                w-2
                rounded-full
                bg-success
              "
            />

          </span>

          <span className="text-[10px] font-medium text-secondary">
            Copilot ready
          </span>

          <div className="ml-auto flex items-center gap-1">

            <span className="text-[9px] text-muted">
              AI
            </span>

            <MoreHorizontal
              size={13}
              className="text-muted"
            />

          </div>

        </div>
      </div>

    </aside>
  );
};

export default ConversationList;