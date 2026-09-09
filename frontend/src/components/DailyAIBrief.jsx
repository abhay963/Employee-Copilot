import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  RefreshCw,
  CalendarDays,
  Mail,
  Clock3,
  Zap,
  Lightbulb,
  Megaphone,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react';

import { briefAPI } from '../services/api';
import { useUser } from '../context/UserContext';


// ============================================================
// DAILY AI BRIEF
// ============================================================

const DailyAIBrief = ({ userRole = 'employee' }) => {
  const { user } = useUser();

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  // ==========================================================
  // LOAD EXISTING BRIEF
  // ==========================================================

  useEffect(() => {
    loadLatestBrief();
  }, []);

  const loadLatestBrief = async () => {
    try {
      setInitialLoading(true);
      setError(null);

      const response = await briefAPI.getLatestBrief();

      if (response?.success && response?.hasBrief) {
        setBrief(response.brief);

        if (response.brief?.generatedAt) {
          setLastGenerated(
            new Date(response.brief.generatedAt)
          );
        }
      }
    } catch (err) {
      console.error(
        'Error loading latest brief:',
        err
      );
    } finally {
      setInitialLoading(false);
    }
  };

  // ==========================================================
  // GENERATE / REFRESH BRIEF
  // ==========================================================

  const generateBrief = async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        await briefAPI.generateDailyBrief();

      if (!response?.success) {
        throw new Error(
          response?.error ||
            'Failed to generate brief'
        );
      }

      setBrief(response.brief);

      const generatedDate =
        response.brief?.generatedAt
          ? new Date(response.brief.generatedAt)
          : new Date();

      setLastGenerated(generatedDate);

      toast.success('Brief updated');
    } catch (err) {
      console.error(
        'Error generating brief:',
        err
      );

      const message =
        err?.message ||
        'Failed to refresh brief';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // HELPERS
  // ==========================================================

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';

    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    const name =
      user?.name ||
      user?.firstName ||
      'there';

    return name
      .trim()
      .split(' ')
      .map(
        part =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(' ');
  }, [user]);

  const shortDate = useMemo(() => {
    return new Date().toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
  }, []);

  const timeAgo = date => {
    if (!date) return 'Not generated';

    const seconds = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(date).getTime()) /
          1000
      )
    );

    if (seconds < 60) {
      return 'Just now';
    }

    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    }

    if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    }

    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getEmailInitials = from => {
    if (!from) return '•';

    return String(from)
      .replace(/<.*?>/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
  };

  const getPriorityLevel = priority => {
    const text = `${priority?.priority || ''} ${
      priority?.level || ''
    } ${priority?.urgency || ''}`
      .toLowerCase();

    if (
      text.includes('high') ||
      text.includes('urgent') ||
      text.includes('critical')
    ) {
      return 'HIGH';
    }

    if (
      text.includes('low')
    ) {
      return 'LOW';
    }

    return 'MEDIUM';
  };

  const getPlatform = event => {
    return (
      event?.platform ||
      event?.type ||
      event?.source ||
      'Meeting'
    );
  };

  const getAvailableLeave = () => {
    const value =
      brief?.leaveInformation
        ?.availableDays;

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    return value;
  };

  const getPendingLeave = () => {
    const value =
      brief?.leaveInformation
        ?.pendingRequests;

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }

    return value;
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (initialLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs text-white/35">
          <RefreshCw
            size={14}
            className="animate-spin text-violet-400"
          />
          Loading brief
        </div>
      </div>
    );
  }

  // ==========================================================
  // NO BRIEF
  // ==========================================================

  if (!brief) {
    return (
      <div className="min-h-full px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">

          <div className="flex min-h-[500px] items-center justify-center">

            <div className="w-full max-w-md text-center">

              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
                <Sparkles
                  size={22}
                  className="text-violet-300"
                />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {greeting},{' '}
                {displayName} 👋
              </h1>

              <p className="mt-2 text-sm text-white/40">
                Your daily workspace brief is ready
                to generate.
              </p>

              <button
                type="button"
                onClick={generateBrief}
                disabled={loading}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.02] hover:shadow-violet-900/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                    />
                    Generating
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Brief
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // DATA
  // ==========================================================

  const meetings =
    brief.calendarEvents || [];

  const priorities =
    brief.priorities || [];

  const emails =
    brief.importantEmails || [];

  const hasLeave =
    brief.leaveInformation !== null &&
    brief.leaveInformation !== undefined;

  const meetingCount =
    brief.dayAtAGlance?.meetingCount ??
    meetings.length ??
    0;

  const emailCount =
    brief.dayAtAGlance?.emailCount ??
    emails.length ??
    0;

  const pendingRequests =
    brief.dayAtAGlance
      ?.pendingLeaveRequests ??
    getPendingLeave();

  const busiestPeriod =
    brief.dayAtAGlance?.busiestPeriod ||
    'All day';

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="h-full overflow-y-auto bg-[#050505]">

      <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8 lg:py-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="mb-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-2">

                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {greeting},{' '}
                  {displayName}
                </h1>

                <span className="text-lg">
                  👋
                </span>

              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-white/35">
                <span>
                  Daily Brief
                </span>

                <span className="text-white/15">
                  •
                </span>

                <span>
                  {shortDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">
                <p className="text-[10px] uppercase tracking-wider text-white/25">
                  Last updated
                </p>

                <p className="mt-0.5 text-xs font-medium text-white/45">
                  {timeAgo(lastGenerated)}
                </p>
              </div>

              <button
                type="button"
                onClick={generateBrief}
                disabled={loading}
                title="Refresh daily brief"
                className="group inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-medium text-white/55 transition-all hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={
                    loading
                      ? 'animate-spin'
                      : 'transition-transform group-hover:rotate-180'
                  }
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>

            </div>

          </div>

          {loading && (
            <div className="mt-3 flex items-center gap-2 text-[10px] text-violet-300/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              Updating your brief...
            </div>
          )}

        </header>


        {/* ====================================================
            METRIC CARDS
        ==================================================== */}

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <MetricCard
            icon={
              <CalendarDays size={16} />
            }
            label="Meetings"
            value={meetingCount}
            accent="violet"
          />

          <MetricCard
            icon={
              <Mail size={16} />
            }
            label="Emails"
            value={emailCount}
            accent="blue"
          />

          <MetricCard
            icon={
              <span className="text-sm">
                🏖
              </span>
            }
            label="Leave"
            value={
              hasLeave
                ? getAvailableLeave()
                : '—'
            }
            accent="emerald"
          />

          <MetricCard
            icon={
              <Zap size={16} />
            }
            label="Focus"
            value={busiestPeriod}
            accent="amber"
            compactValue
          />

        </section>


        {/* ====================================================
            MAIN GRID
        ==================================================== */}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">


          {/* ==================================================
              TODAY
          ================================================== */}

          <DashboardCard>

            <CardHeader
              icon={
                <CalendarDays size={15} />
              }
              iconClass="text-violet-400"
              title="Today"
              action={
                meetings.length > 0
                  ? `${meetings.length} events`
                  : 'Clear'
              }
            />

            {meetings.length > 0 ? (

              <div className="mt-5">

                <div className="relative ml-2">

                  <div className="absolute bottom-3 left-[5px] top-3 w-px bg-white/[0.07]" />

                  <div className="space-y-4">

                    {meetings
                      .slice(0, 5)
                      .map(
                        (event, index) => (
                          <div
                            key={`${event.title}-${index}`}
                            className="relative flex items-start gap-4"
                          >

                            <div className="relative z-10 mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-[#0a0a0a] bg-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]" />

                            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">

                              <div className="min-w-0">

                                <p className="truncate text-xs font-medium text-white/75">
                                  {event.title ||
                                    'Untitled event'}
                                </p>

                                <span className="mt-1 inline-flex rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[9px] text-white/30">
                                  {getPlatform(
                                    event
                                  )}
                                </span>

                              </div>

                              <span className="flex-shrink-0 font-mono text-[10px] text-white/35">
                                {event.time ||
                                  '--:--'}
                              </span>

                            </div>

                          </div>
                        )
                      )}

                  </div>

                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[10px] text-white/30">

                  <Clock3 size={11} />

                  <span>
                    Peak
                  </span>

                  <span className="font-medium text-white/55">
                    {busiestPeriod}
                  </span>

                </div>

              </div>

            ) : (

              <EmptyState
                icon={
                  <CalendarDays size={16} />
                }
                text="No meetings today"
              />

            )}

          </DashboardCard>


          {/* ==================================================
              PRIORITIES
          ================================================== */}

          <DashboardCard>

            <CardHeader
              icon={
                <Zap size={15} />
              }
              iconClass="text-amber-400"
              title="Priorities"
              action={`${Math.min(
                priorities.length,
                3
              )} items`}
            />

            {priorities.length > 0 ? (

              <div className="mt-4 divide-y divide-white/[0.05]">

                {priorities
                  .slice(0, 3)
                  .map(
                    (priority, index) => {

                      const level =
                        getPriorityLevel(
                          priority
                        );

                      return (
                        <div
                          key={`${priority.title}-${index}`}
                          className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                        >

                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-[10px] font-semibold text-white/45">
                            {index + 1}
                          </div>

                          <p className="min-w-0 flex-1 truncate text-xs font-medium text-white/70">
                            {priority.title ||
                              priority.name ||
                              'Priority item'}
                          </p>

                          <PriorityBadge
                            level={level}
                          />

                        </div>
                      );
                    }
                  )}

              </div>

            ) : (

              <EmptyState
                icon={
                  <CheckCircle2 size={16} />
                }
                text="No priorities"
              />

            )}

          </DashboardCard>


          {/* ==================================================
              EMAILS
          ================================================== */}

          <DashboardCard>

            <CardHeader
              icon={
                <Mail size={15} />
              }
              iconClass="text-blue-400"
              title="Important Emails"
              action={
                emails.length > 0
                  ? 'View all'
                  : null
              }
              actionIcon
            />

            {emails.length > 0 ? (

              <div className="mt-3 divide-y divide-white/[0.05]">

                {emails
                  .slice(0, 3)
                  .map(
                    (email, index) => (

                      <div
                        key={`${email.subject}-${index}`}
                        className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                      >

                        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[9px] font-semibold text-white/50">

                          {getEmailInitials(
                            email.from
                          )}

                          {index === 0 && (
                            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-violet-400 ring-2 ring-[#0b0b0b]" />
                          )}

                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center justify-between gap-3">

                            <p className="truncate text-xs font-medium text-white/70">
                              {email.from ||
                                'Unknown sender'}
                            </p>

                            <span className="flex-shrink-0 text-[9px] text-white/25">
                              {email.time ||
                                '—'}
                            </span>

                          </div>

                          <p className="mt-0.5 truncate text-[10px] text-white/35">
                            {email.subject ||
                              'No subject'}
                          </p>

                        </div>

                      </div>

                    )
                  )}

              </div>

            ) : (

              <EmptyState
                icon={
                  <Mail size={16} />
                }
                text="Inbox is clear"
              />

            )}

          </DashboardCard>


          {/* ==================================================
              LEAVE
          ================================================== */}

          <DashboardCard>

            <CardHeader
              icon={
                <span className="text-sm">
                  🏖
                </span>
              }
              iconClass="text-emerald-400"
              title="Your Leave"
              action={`${pendingRequests} pending`}
            />

            <div className="mt-5 grid grid-cols-2 gap-3">

              <StatBox
                value={
                  hasLeave
                    ? getAvailableLeave()
                    : '—'
                }
                label="Available"
              />

              <StatBox
                value={getPendingLeave()}
                label="Pending"
              />

            </div>

            <div className="mt-4 flex gap-2">

              <button
                type="button"
                className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] font-medium text-white/50 transition hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-violet-300"
              >
                View Balance
              </button>

              <button
                type="button"
                className="flex-1 rounded-lg bg-violet-500/10 px-3 py-2 text-[10px] font-medium text-violet-300 transition hover:bg-violet-500/20"
              >
                Apply Leave
              </button>

            </div>

          </DashboardCard>


          {/* ==================================================
              AI INSIGHT
          ================================================== */}

          {brief.aiInsight && (

            <DashboardCard
              className="border-amber-400/10 bg-gradient-to-br from-amber-500/[0.05] to-transparent"
            >

              <CardHeader
                icon={
                  <Lightbulb size={15} />
                }
                iconClass="text-amber-300"
                title="AI Insight"
              />

              <div className="mt-4">

                <p className="text-sm font-medium leading-5 text-white/75">
                  {compactText(
                    brief.aiInsight,
                    105
                  )}
                </p>

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-violet-300 transition hover:text-violet-200"
                >
                  Review meeting notes
                  <ChevronRight
                    size={11}
                  />
                </button>

              </div>

            </DashboardCard>

          )}


          {/* ==================================================
              COMPANY UPDATE
          ================================================== */}

          {brief.companyUpdates && (

            <DashboardCard>

              <CardHeader
                icon={
                  <Megaphone size={15} />
                }
                iconClass="text-indigo-400"
                title="Company Updates"
              />

              <div className="mt-4 flex items-center gap-3">

                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                  <BookIcon />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-xs font-medium text-white/70">
                    {extractUpdateTitle(
                      brief.companyUpdates
                    )}
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/30">
                    Latest company update
                  </p>

                </div>

                <button
                  type="button"
                  className="flex-shrink-0 text-[10px] font-medium text-violet-300 hover:text-violet-200"
                >
                  Ask Copilot
                </button>

              </div>

            </DashboardCard>

          )}

        </section>




        {/* ====================================================
            SOURCES
        ==================================================== */}

        {brief.sources?.length > 0 && (

          <div className="mt-4 flex items-center gap-2">

            <span className="text-[9px] uppercase tracking-wider text-white/20">
              Sources
            </span>

            {brief.sources.map(
              (source, index) => (

                <span
                  key={`${source}-${index}`}
                  className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[9px] text-white/30"
                >
                  {source}
                </span>

              )
            )}

          </div>

        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/10 bg-red-500/[0.04] px-3 py-2 text-[10px] text-red-300/70">
            <CircleAlert size={12} />
            {error}
          </div>
        )}

      </div>
    </div>
  );
};


// ============================================================
// DASHBOARD CARD
// ============================================================

const DashboardCard = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`
        rounded-xl
        border
        border-white/[0.07]
        bg-[#090909]
        p-4
        transition-colors
        hover:border-white/[0.11]
        ${className}
      `}
    >
      {children}
    </div>
  );
};


// ============================================================
// CARD HEADER
// ============================================================

const CardHeader = ({
  icon,
  iconClass = 'text-violet-400',
  title,
  action,
  actionIcon = false,
}) => {
  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-2">

        <span className={iconClass}>
          {icon}
        </span>

        <h2 className="text-xs font-semibold text-white/70">
          {title}
        </h2>

      </div>

      {action && (
        <button
          type="button"
          className="flex items-center gap-1 text-[9px] font-medium text-white/25 transition hover:text-violet-300"
        >
          {action}

          {actionIcon && (
            <ChevronRight size={10} />
          )}
        </button>
      )}

    </div>
  );
};


// ============================================================
// METRIC CARD
// ============================================================

const MetricCard = ({
  icon,
  label,
  value,
  accent = 'violet',
  compactValue = false,
}) => {

  const accentClasses = {
    violet:
      'border-violet-400/10 bg-violet-500/[0.035] text-violet-300',
    blue:
      'border-blue-400/10 bg-blue-500/[0.035] text-blue-300',
    emerald:
      'border-emerald-400/10 bg-emerald-500/[0.035] text-emerald-300',
    amber:
      'border-amber-400/10 bg-amber-500/[0.035] text-amber-300',
  };

  return (
    <div
      className={`
        rounded-xl
        border
        p-4
        ${accentClasses[accent]}
      `}
    >

      <div className="flex items-center justify-between">

        <span className="opacity-80">
          {icon}
        </span>

        <span className="text-[9px] font-medium uppercase tracking-wider text-white/25">
          {label}
        </span>

      </div>

      <div
        className={`
          mt-3 font-semibold tracking-tight text-white
          ${
            compactValue
              ? 'text-base'
              : 'text-2xl'
          }
        `}
      >
        {value}
      </div>

    </div>
  );
};


// ============================================================
// STAT BOX
// ============================================================

const StatBox = ({
  value,
  label,
}) => {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">

      <p className="text-xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/25">
        {label}
      </p>

    </div>
  );
};


// ============================================================
// PRIORITY BADGE
// ============================================================

const PriorityBadge = ({
  level,
}) => {

  const styles = {
    HIGH: 'border-red-400/15 bg-red-400/10 text-red-300',
    MEDIUM:
      'border-amber-400/15 bg-amber-400/10 text-amber-300',
    LOW:
      'border-emerald-400/15 bg-emerald-400/10 text-emerald-300',
  };

  return (
    <span
      className={`
        flex-shrink-0
        rounded-md
        border
        px-1.5
        py-0.5
        text-[8px]
        font-semibold
        tracking-wider
        ${styles[level]}
      `}
    >
      {level}
    </span>
  );
};


// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({
  icon,
  text,
}) => {
  return (
    <div className="flex items-center gap-2 py-8 text-[10px] text-white/25">

      <span className="text-white/20">
        {icon}
      </span>

      {text}

    </div>
  );
};


// ============================================================
// COMPACT TEXT
// ============================================================

const compactText = (
  value,
  maxLength = 100
) => {
  if (!value) return '';

  const text = String(value)
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
};


// ============================================================
// COMPANY UPDATE TITLE
// ============================================================

const extractUpdateTitle = value => {
  if (!value) {
    return 'Company update';
  }

  const text = String(value)
    .replace(/\s+/g, ' ')
    .trim();

  // Prefer first sentence / short heading
  const firstSentence =
    text.split(/[.!?]/)[0];

  if (
    firstSentence &&
    firstSentence.length <= 55
  ) {
    return firstSentence;
  }

  return 'New company update';
};


// ============================================================
// SIMPLE BOOK ICON
// ============================================================

const BookIcon = () => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
};


export default DailyAIBrief;