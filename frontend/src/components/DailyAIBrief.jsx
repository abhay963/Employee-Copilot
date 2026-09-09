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
  Quote,
  Code2,
  ArrowUpRight,
} from 'lucide-react';

import { briefAPI } from '../services/api';
import { useUser } from '../context/UserContext';

// ============================================================
// DAILY DEVELOPER QUOTE
// ============================================================
//
// Free public quote API.
// The quote is cached per calendar day.
//
// Behaviour:
//
// 09 Sep
//   -> Quote A
//
// Refresh dashboard
//   -> Quote A
//
// Refresh again
//   -> Quote A
//
// 10 Sep
//   -> Quote B
//
// ============================================================

const QUOTE_API =
  'https://qapi.vercel.app/api/random';

const QUOTE_STORAGE_KEY =
  'employee_copilot_daily_developer_quote';


// ============================================================
// FALLBACK DEVELOPER QUOTES
// ============================================================

const FALLBACK_QUOTES = [
  {
    quote:
      'The best way to learn programming is to build something you wish existed.',
    author:
      'Developer Mindset',
  },
  {
    quote:
      'Every expert developer was once a beginner who kept going.',
    author:
      'Engineering Mindset',
  },
  {
    quote:
      'Great software is built one small problem at a time.',
    author:
      'Engineering Principle',
  },
  {
    quote:
      'Debugging is not failure. It is the process of understanding your system.',
    author:
      'Developer Mindset',
  },
  {
    quote:
      'Do not fear difficult problems. They are where your engineering skills grow.',
    author:
      'Engineering Mindset',
  },
  {
    quote:
      'Write code for humans first and machines second.',
    author:
      'Software Engineering Principle',
  },
  {
    quote:
      'Consistency beats intensity when you are building a career in software.',
    author:
      'Developer Mindset',
  },
  {
    quote:
      'The fastest way to improve is to build, break, understand, and build again.',
    author:
      'Engineering Principle',
  },
  {
    quote:
      'A bug is simply a question your code is asking you to answer.',
    author:
      'Developer Mindset',
  },
  {
    quote:
      'Learn the fundamentals deeply. Frameworks change, engineering principles remain.',
    author:
      'Software Engineering Principle',
  },
];


// ============================================================
// DAILY AI BRIEF
// ============================================================

const DailyAIBrief = ({
  userRole = 'employee',
}) => {
  const { user } = useUser();

  const [brief, setBrief] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [lastGenerated, setLastGenerated] =
    useState(null);


  // ==========================================================
  // DAILY DEVELOPER QUOTE STATE
  // ==========================================================

  const [developerQuote, setDeveloperQuote] =
    useState(null);

  const [quoteLoading, setQuoteLoading] =
    useState(true);

  const [quoteKey, setQuoteKey] =
    useState(0);


  // ==========================================================
  // LIVE CLOCK
  // ==========================================================

  const [currentTime, setCurrentTime] =
    useState(new Date());


  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(
          new Date()
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);


  // ==========================================================
  // DIGITAL TIME
  // ==========================================================

  const clockTime = useMemo(() => {
    return currentTime.toLocaleTimeString(
      'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }
    );
  }, [currentTime]);


  // ==========================================================
  // GET TODAY KEY
  // ==========================================================

  const getTodayKey = () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        now.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };


  // ==========================================================
  // FALLBACK QUOTE
  // ==========================================================

  const getFallbackQuote = () => {
    const today =
      getTodayKey();

    let hash = 0;

    for (
      let i = 0;
      i < today.length;
      i++
    ) {
      hash =
        (hash * 31 +
          today.charCodeAt(i)) %
        FALLBACK_QUOTES.length;
    }

    return FALLBACK_QUOTES[hash];
  };


  // ==========================================================
  // LOAD DAILY DEVELOPER QUOTE
  // ==========================================================

  const loadDailyDeveloperQuote =
    async () => {

      const today =
        getTodayKey();

      setQuoteLoading(true);

      try {

        // ----------------------------------------------------
        // 1. CHECK LOCAL CACHE
        // ----------------------------------------------------

        const stored =
          localStorage.getItem(
            QUOTE_STORAGE_KEY
          );

        if (stored) {

          try {

            const parsed =
              JSON.parse(stored);

            if (
              parsed?.date === today &&
              parsed?.quote?.quote
            ) {

              setDeveloperQuote(
                parsed.quote
              );

              setQuoteKey(
                previous => previous + 1
              );

              setQuoteLoading(false);

              return;
            }

          } catch {
            // Invalid cached data.
            // Continue to API.
          }
        }


        // ----------------------------------------------------
        // 2. FETCH NEW QUOTE
        // ----------------------------------------------------

        const response =
          await fetch(
            QUOTE_API,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json',
              },
            }
          );


        if (!response.ok) {
          throw new Error(
            `Quote API returned ${response.status}`
          );
        }


        const data =
          await response.json();


        const quoteText =
          data?.quote ||
          data?.content ||
          data?.text;


        const author =
          data?.author ||
          'Unknown';


        if (!quoteText) {
          throw new Error(
            'Invalid quote response'
          );
        }


        const quote = {
          quote:
            String(
              quoteText
            ).trim(),

          author:
            String(
              author
            ).trim(),
        };


        // ----------------------------------------------------
        // 3. CACHE QUOTE
        // ----------------------------------------------------

        localStorage.setItem(
          QUOTE_STORAGE_KEY,
          JSON.stringify({
            date: today,
            quote,
          })
        );


        setDeveloperQuote(
          quote
        );

        setQuoteKey(
          previous => previous + 1
        );

      } catch (err) {

        console.warn(
          'Developer quote API unavailable:',
          err
        );


        // ----------------------------------------------------
        // 4. FALLBACK
        // ----------------------------------------------------

        const fallback =
          getFallbackQuote();


        setDeveloperQuote(
          fallback
        );

        setQuoteKey(
          previous => previous + 1
        );

      } finally {

        setQuoteLoading(
          false
        );

      }
    };


  // ==========================================================
  // LOAD DAILY QUOTE
  // ==========================================================

  useEffect(() => {
    loadDailyDeveloperQuote();
  }, []);


  // ==========================================================
  // LOAD LATEST BRIEF
  // ==========================================================

  useEffect(() => {
    loadLatestBrief();
  }, []);


  const loadLatestBrief =
    async () => {

      try {

        setInitialLoading(
          true
        );

        setError(null);


        const response =
          await briefAPI.getLatestBrief();


        if (
          response?.success &&
          response?.hasBrief
        ) {

          setBrief(
            response.brief
          );


          if (
            response.brief?.generatedAt
          ) {

            setLastGenerated(
              new Date(
                response.brief.generatedAt
              )
            );

          }

        }

      } catch (err) {

        console.error(
          'Error loading latest brief:',
          err
        );


        setError(
          err?.error ||
          err?.message ||
          'Failed to load daily brief'
        );

      } finally {

        setInitialLoading(
          false
        );

      }
    };


  // ==========================================================
  // GENERATE / REFRESH BRIEF
  // ==========================================================

  const generateBrief =
    async () => {

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


        setBrief(
          response.brief
        );


        // IMPORTANT:
        // Always update frontend timestamp.
        const refreshedAt =
          new Date();


        setLastGenerated(
          refreshedAt
        );


        toast.success(
          'Brief updated'
        );

      } catch (err) {

        console.error(
          'Error generating brief:',
          err
        );


        const message =
          err?.error ||
          err?.message ||
          'Failed to refresh brief';


        setError(
          message
        );

        toast.error(
          message
        );

      } finally {

        setLoading(false);

      }
    };


  // ==========================================================
  // GREETING
  // ==========================================================

  const greeting =
    useMemo(() => {

      const hour =
        currentTime.getHours();


      if (hour < 12) {
        return 'Good morning';
      }


      if (hour < 17) {
        return 'Good afternoon';
      }


      return 'Good evening';

    }, [currentTime]);


  // ==========================================================
  // DISPLAY NAME
  // ==========================================================

  const displayName =
    useMemo(() => {

      const name =
        user?.name ||
        user?.firstName ||
        'there';


      return name
        .trim()
        .split(' ')
        .map(
          part =>
            part.charAt(0)
              .toUpperCase() +
            part.slice(1)
        )
        .join(' ');

    }, [user]);


  // ==========================================================
  // SHORT DATE
  // ==========================================================

  const shortDate =
    useMemo(() => {

      return currentTime.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
        }
      );

    }, [currentTime]);


  // ==========================================================
  // TIME AGO
  // ==========================================================

  const timeAgo =
    date => {

      if (!date) {
        return 'Not generated';
      }


      const seconds =
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              new Date(
                date
              ).getTime()
            ) / 1000
          )
        );


      if (seconds < 60) {
        return 'Just now';
      }


      if (seconds < 3600) {
        return `${Math.floor(
          seconds / 60
        )}m ago`;
      }


      if (seconds < 86400) {
        return `${Math.floor(
          seconds / 3600
        )}h ago`;
      }


      return `${Math.floor(
        seconds / 86400
      )}d ago`;

    };


  // ==========================================================
  // TODAY EVENTS
  // ==========================================================

  const todayEvents =
    useMemo(() => {

      return (
        brief?.todayEvents ||
        brief?.rawData?.todayEvents ||
        []
      );

    }, [brief]);


  // ==========================================================
  // UPCOMING EVENTS
  // ==========================================================

  const upcomingEvents =
    useMemo(() => {

      return (
        brief?.upcomingEvents ||
        brief?.rawData?.upcomingEvents ||
        []
      );

    }, [brief]);


  // ==========================================================
  // IMPORTANT EMAILS
  // ==========================================================

  const importantEmails =
    useMemo(() => {

      return (
        brief?.importantEmails ||
        brief?.rawData?.emails ||
        []
      );

    }, [brief]);


  // ==========================================================
  // LEAVE INFORMATION
  // ==========================================================

  const leaveInformation =
    useMemo(() => {

      if (
        brief?.leaveInformation
      ) {
        return brief.leaveInformation;
      }


      const balance =
        brief?.rawData?.leaveBalance;


      const pending =
        brief?.rawData
          ?.pendingLeaveRequests;


      if (
        !balance &&
        !pending
      ) {
        return null;
      }


      return {

        annual:
          balance?.annual ?? 0,

        sick:
          balance?.sick ?? 0,

        personal:
          balance?.personal ?? 0,

        pendingRequests:
          pending?.length ?? 0,

      };

    }, [brief]);


  // ==========================================================
  // COUNTS
  // ==========================================================

  const meetingCount =
    todayEvents.length;


  const emailCount =
    importantEmails.length;


  const pendingRequests =
    Number(
      leaveInformation
        ?.pendingRequests ?? 0
    );


  // ==========================================================
  // EMAIL INITIALS
  // ==========================================================

  const getEmailInitials =
    from => {

      if (!from) {
        return '•';
      }


      return String(from)
        .replace(
          /<.*?>/g,
          ''
        )
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
          name =>
            name.charAt(0)
        )
        .join('')
        .toUpperCase();

    };


  // ==========================================================
  // PRIORITY LEVEL
  // ==========================================================

  const getPriorityLevel =
    priority => {

      const text =
        `${priority?.priority || ''} ${
          priority?.level || ''
        } ${
          priority?.urgency || ''
        }`.toLowerCase();


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


  // ==========================================================
  // EVENT PLATFORM
  // ==========================================================

  const getPlatform =
    event => {

      return (
        event?.platform ||
        event?.type ||
        event?.source ||
        'Meeting'
      );

    };


  // ==========================================================
  // LEAVE VALUES
  // ==========================================================

  const annualLeave =
    leaveInformation
      ?.annual ?? 0;


  const sickLeave =
    leaveInformation
      ?.sick ?? 0;


  const personalLeave =
    leaveInformation
      ?.personal ?? 0;


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

                {displayName}

                {' '}👋

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

                    <Sparkles
                      size={14}
                    />

                    Generate Brief

                  </>

                )}

              </button>


              {error && (

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-red-300/70">

                  <CircleAlert
                    size={12}
                  />

                  {error}

                </div>

              )}


              <DeveloperQuoteCard
                quote={
                  developerQuote
                }
                loading={
                  quoteLoading
                }
                quoteKey={
                  quoteKey
                }

              />

            </div>

          </div>

        </div>

      </div>

    );

  }


  // ==========================================================
  // PRIORITIES
  // ==========================================================

  const priorities =
    Array.isArray(
      brief.priorities
    )
      ? brief.priorities
      : [];


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

                  {timeAgo(
                    lastGenerated
                  )}

                </p>

              </div>


              <button
                type="button"
                onClick={
                  generateBrief
                }
                disabled={
                  loading
                }
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
            ERROR
        ==================================================== */}

        {error && (

          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/10 bg-red-500/[0.04] px-3 py-2 text-[10px] text-red-300/70">

            <CircleAlert
              size={12}
            />

            {error}

          </div>

        )}


        {/* ====================================================
            METRICS
        ==================================================== */}

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <MetricCard
            icon={
              <CalendarDays
                size={16}
              />
            }
            label="Meetings"
            value={
              meetingCount === 1
                ? '1 today'
                : `${meetingCount} today`
            }
            accent="violet"
            compactValue
          />


          <MetricCard
            icon={
              <Mail
                size={16}
              />
            }
            label="Emails"
            value={
              emailCount === 0
                ? '0 priority'
                : `${emailCount} priority`
            }
            accent="blue"
            compactValue
          />


          <MetricCard
            icon={
              <span className="text-sm">
                🏖
              </span>
            }
            label="Leave"
            value={`${pendingRequests} pending`}
            accent="emerald"
            compactValue
          />


          <WallClock
            currentTime={
              currentTime
            }
            clockTime={
              clockTime
            }
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
                <CalendarDays
                  size={15}
                />
              }
              iconClass="text-violet-400"
              title="Today"
              action={
                meetingCount > 0
                  ? `${meetingCount} ${
                      meetingCount === 1
                        ? 'meeting'
                        : 'meetings'
                    }`
                  : 'Clear'
              }
            />


            {todayEvents.length > 0 ? (

              <div className="mt-5">

                <div className="relative ml-2">

                  <div className="absolute bottom-3 left-[5px] top-3 w-px bg-white/[0.07]" />

                  <div className="space-y-4">

                    {todayEvents
                      .slice(0, 5)
                      .map(
                        (
                          event,
                          index
                        ) => (

                          <div
                            key={`today-${event.title}-${index}`}
                            className="relative flex items-start gap-4"
                          >

                            <div className="relative z-10 mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-[#0a0a0a] bg-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]" />


                            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">

                              <div className="min-w-0">

                                <p className="truncate text-xs font-medium text-white/75">

                                  {event.title ||
                                    'Untitled event'}

                                </p>


                                {getPlatform(
                                  event
                                ) && (

                                  <span className="mt-1 inline-flex rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[9px] text-white/30">

                                    {getPlatform(
                                      event
                                    )}

                                  </span>

                                )}

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


                {brief.dayAtAGlance?.focus && (

                  <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[10px] text-white/30">

                    <Clock3
                      size={11}
                    />

                    <span>
                      Focus
                    </span>

                    <span className="font-medium text-white/55">

                      {compactText(
                        brief
                          .dayAtAGlance
                          .focus,
                        60
                      )}

                    </span>

                  </div>

                )}

              </div>

            ) : (

              <EmptyState
                icon={
                  <CalendarDays
                    size={16}
                  />
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
                <Zap
                  size={15}
                />
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
                    (
                      priority,
                      index
                    ) => {

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
                            level={
                              level
                            }
                          />

                        </div>

                      );

                    }
                  )}

              </div>

            ) : (

              <EmptyState
                icon={
                  <CheckCircle2
                    size={16}
                  />
                }
                text="No priorities"
              />

            )}

          </DashboardCard>


          {/* ==================================================
              IMPORTANT EMAILS
          ================================================== */}

          <DashboardCard>

            <CardHeader
              icon={
                <Mail
                  size={15}
                />
              }
              iconClass="text-blue-400"
              title="Important Emails"
              action={
                importantEmails.length > 0
                  ? `${Math.min(
                      importantEmails.length,
                      3
                    )} shown`
                  : null
              }
            />


            {importantEmails.length > 0 ? (

              <div className="mt-3 divide-y divide-white/[0.05]">

                {importantEmails
                  .slice(0, 3)
                  .map(
                    (
                      email,
                      index
                    ) => (

                      <div
                        key={`${email.id || email.subject}-${index}`}
                        className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                      >

                        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[9px] font-semibold text-white/50">

                          {getEmailInitials(
                            email.from
                          )}


                          {email.isUnread && (

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
                  <Mail
                    size={16}
                  />
                }
                text="No priority emails"
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


            <div className="mt-5 grid grid-cols-3 gap-2">

              <StatBox
                value={
                  annualLeave
                }
                label="Annual"
              />

              <StatBox
                value={
                  sickLeave
                }
                label="Sick"
              />

              <StatBox
                value={
                  personalLeave
                }
                label="Personal"
              />

            </div>


            {pendingRequests > 0 && (

              <div className="mt-3 rounded-lg border border-amber-400/10 bg-amber-500/[0.035] px-3 py-2">

                <p className="text-[10px] text-amber-300/70">

                  {pendingRequests}{' '}

                  pending leave request

                  {pendingRequests > 1
                    ? 's'
                    : ''}

                </p>

              </div>

            )}

          </DashboardCard>


          {/* ==================================================
              UPCOMING
          ================================================== */}

          {upcomingEvents.length > 0 && (

            <DashboardCard>

              <CardHeader
                icon={
                  <CalendarDays
                    size={15}
                  />
                }
                iconClass="text-indigo-400"
                title="Upcoming"
                action={`${Math.min(
                  upcomingEvents.length,
                  3
                )} events`}
              />


              <div className="mt-3 divide-y divide-white/[0.05]">

                {upcomingEvents
                  .slice(0, 3)
                  .map(
                    (
                      event,
                      index
                    ) => (

                      <div
                        key={`upcoming-${event.title}-${index}`}
                        className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                      >

                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">

                          <CalendarDays
                            size={14}
                          />

                        </div>


                        <div className="min-w-0 flex-1">

                          <p className="truncate text-xs font-medium text-white/70">

                            {event.title ||
                              'Untitled event'}

                          </p>


                          <p className="mt-0.5 text-[9px] text-white/30">

                            {event.date ||
                              'Upcoming'}

                            {event.time
                              ? ` · ${event.time}`
                              : ''}

                          </p>

                        </div>

                      </div>

                    )
                  )}

              </div>

            </DashboardCard>

          )}


          {/* ==================================================
              AI INSIGHT
          ================================================== */}

          {brief.aiInsight && (

            <DashboardCard
              className="border-amber-400/10 bg-gradient-to-br from-amber-500/[0.05] to-transparent"
            >

              <CardHeader
                icon={
                  <Lightbulb
                    size={15}
                  />
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
                  <Megaphone
                    size={15}
                  />
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
                  className="flex-shrink-0 text-[10px] font-medium text-violet-300 transition hover:text-violet-200"
                >

                  Ask Copilot

                </button>

              </div>

            </DashboardCard>

          )}

        </section>


        {/* ====================================================
            PREMIUM DEVELOPER INSPIRATION
        ==================================================== */}

        <DeveloperQuoteCard
          quote={
            developerQuote
          }
          loading={
            quoteLoading
          }
          quoteKey={
            quoteKey
          }
        />


        {/* ====================================================
            SOURCES
        ==================================================== */}

        {brief.sources?.length > 0 && (

          <div className="mt-4 flex flex-wrap items-center gap-2">

            <span className="text-[9px] uppercase tracking-wider text-white/20">

              Sources

            </span>


            {brief.sources.map(
              (
                source,
                index
              ) => (

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

      </div>

    </div>

  );
};


// ============================================================
// PREMIUM DEVELOPER QUOTE CARD
// ============================================================

const DeveloperQuoteCard = ({
  quote,
  loading,
  quoteKey,
}) => {

  return (

    <section
      className="
        group
        relative
        mt-5
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.08]
        bg-[#09090b]
        transition-all
        duration-500
        hover:-translate-y-[2px]
        hover:border-violet-400/[0.18]
        hover:shadow-[0_20px_70px_rgba(124,58,237,0.10)]
      "
    >

      {/* ======================================================
          AMBIENT BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div
          className="
            absolute
            -right-24
            -top-24
            h-72
            w-72
            rounded-full
            bg-violet-600/[0.10]
            blur-3xl
            animate-[premiumOrb_8s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute
            -bottom-32
            -left-20
            h-64
            w-64
            rounded-full
            bg-indigo-600/[0.08]
            blur-3xl
            animate-[premiumOrbReverse_10s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-0
            h-px
            w-1/2
            -translate-x-1/2
            bg-gradient-to-r
            from-transparent
            via-violet-400/40
            to-transparent
            opacity-60
          "
        />

      </div>


      {/* ======================================================
          SUBTLE GRID
      ====================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.025]
        "
        style={{
          backgroundImage:
            `
              linear-gradient(
                rgba(255,255,255,0.8) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(255,255,255,0.8) 1px,
                transparent 1px
              )
            `,
          backgroundSize:
            '32px 32px',
        }}
      />


      {/* ======================================================
          SHIMMER
      ====================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-y-0
          -left-[120%]
          w-[60%]
          skew-x-[-20deg]
          bg-gradient-to-r
          from-transparent
          via-white/[0.035]
          to-transparent
          transition-all
          duration-1000
          group-hover:left-[150%]
        "
      />


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="relative p-5 sm:p-6">


        {/* ====================================================
            TOP BAR
        ==================================================== */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            {/* ICON */}

            <div
              className="
                relative
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                border
                border-violet-400/[0.16]
                bg-violet-500/[0.08]
                text-violet-300
                shadow-[0_0_25px_rgba(139,92,246,0.08)]
              "
            >

              <Code2
                size={15}
              />


              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  h-2
                  w-2
                  rounded-full
                  bg-violet-400
                  ring-2
                  ring-[#09090b]
                  animate-pulse
                "
              />

            </div>


            {/* TITLE */}

            <div>

              <div className="flex items-center gap-2">

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-violet-300/80
                  "
                >
                  Developer Inspiration
                </p>


                <span
                  className="
                    hidden
                    rounded-full
                    border
                    border-violet-400/[0.12]
                    bg-violet-500/[0.05]
                    px-1.5
                    py-0.5
                    text-[7px]
                    font-medium
                    uppercase
                    tracking-wider
                    text-violet-300/40
                    sm:inline-flex
                  "
                >
                  Daily
                </span>

              </div>


              <p className="mt-0.5 text-[9px] text-white/25">

                A little fuel for today's build

              </p>

            </div>

          </div>


          {/* QUOTE ICON */}

          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              border
              border-white/[0.05]
              bg-white/[0.02]
              transition-all
              duration-500
              group-hover:border-violet-400/[0.12]
              group-hover:bg-violet-500/[0.05]
            "
          >

            <Quote
              size={15}
              className="
                text-violet-400/30
                transition-all
                duration-500
                group-hover:scale-110
                group-hover:text-violet-300/60
              "
            />

          </div>

        </div>


        {/* ====================================================
            QUOTE AREA
        ==================================================== */}

        <div className="relative mt-6 min-h-[94px]">


          {loading ? (

            <div className="space-y-3">

              <div className="relative h-4 w-[92%] overflow-hidden rounded-full bg-white/[0.055]">

                <div
                  className="
                    absolute
                    inset-0
                    -translate-x-full
                    animate-[skeletonShimmer_1.5s_infinite]
                    bg-gradient-to-r
                    from-transparent
                    via-white/[0.06]
                    to-transparent
                  "
                />

              </div>


              <div className="relative h-4 w-[76%] overflow-hidden rounded-full bg-white/[0.045]">

                <div
                  className="
                    absolute
                    inset-0
                    -translate-x-full
                    animate-[skeletonShimmer_1.5s_0.2s_infinite]
                    bg-gradient-to-r
                    from-transparent
                    via-white/[0.06]
                    to-transparent
                  "
                />

              </div>


              <div className="mt-5 h-2.5 w-24 rounded-full bg-white/[0.035]" />

            </div>

          ) : quote ? (

            <div
              key={quoteKey}
              className="
                animate-[quotePremiumIn_900ms_cubic-bezier(0.16,1,0.3,1)]
              "
            >

              {/* LARGE QUOTE MARK */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -left-1
                  -top-7
                  font-serif
                  text-[64px]
                  leading-none
                  text-violet-400/[0.08]
                  select-none
                  animate-[quoteMarkFloat_5s_ease-in-out_infinite]
                "
              >
                “
              </div>


              {/* LEFT ACCENT */}

              <div
                className="
                  absolute
                  left-0
                  top-1
                  h-[calc(100%-4px)]
                  w-[2px]
                  overflow-hidden
                  rounded-full
                  bg-gradient-to-b
                  from-violet-400/70
                  via-indigo-400/30
                  to-transparent
                "
              >

                <div
                  className="
                    h-1/3
                    w-full
                    bg-white/30
                    blur-[1px]
                    animate-[accentFlow_2.8s_ease-in-out_infinite]
                  "
                />

              </div>


              {/* QUOTE */}

              <p
                className="
                  pl-5
                  pr-2
                  text-[15px]
                  font-medium
                  leading-7
                  tracking-[-0.015em]
                  text-white/[0.82]
                  sm:text-base
                  sm:leading-7
                "
              >

                “{quote.quote}”

              </p>


              {/* AUTHOR */}

              <div
                className="
                  mt-5
                  flex
                  items-center
                  gap-2
                  pl-5
                  animate-[authorIn_1000ms_300ms_both]
                "
              >

                <span className="h-px w-6 bg-gradient-to-r from-violet-400/50 to-transparent" />


                <span className="text-[10px] font-medium text-white/35">

                  {quote.author}

                </span>


                <ArrowUpRight
                  size={10}
                  className="text-violet-400/30"
                />

              </div>

            </div>

          ) : (

            <div className="flex items-center gap-2 text-xs text-white/25">

              <Code2
                size={14}
              />

              Keep building.

            </div>

          )}

        </div>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div
          className="
            mt-5
            flex
            items-center
            justify-between
            border-t
            border-white/[0.05]
            pt-3
          "
        >

          <div className="flex items-center gap-2">

            <span
              className="
                relative
                flex
                h-1.5
                w-1.5
              "
            >

              <span
                className="
                  absolute
                  inline-flex
                  h-full
                  w-full
                  animate-ping
                  rounded-full
                  bg-violet-400/50
                "
              />

              <span
                className="
                  relative
                  inline-flex
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-violet-400/70
                "
              />

            </span>


            <span className="text-[9px] text-white/20">

              Today's reminder

            </span>

          </div>


          <span
            className="
              text-[9px]
              font-medium
              text-white/20
              transition-colors
              group-hover:text-violet-300/40
            "
          >

            Keep building.

          </span>

        </div>

      </div>


      {/* ======================================================
          PREMIUM ANIMATIONS
      ====================================================== */}

      <style>
        {`

          /* -----------------------------------------------
             MAIN QUOTE ENTRY
          ----------------------------------------------- */

          @keyframes quotePremiumIn {

            0% {
              opacity: 0;
              transform:
                translateY(14px)
                scale(0.985);
              filter:
                blur(6px);
            }

            60% {
              opacity: 1;
              filter:
                blur(0);
            }

            100% {
              opacity: 1;
              transform:
                translateY(0)
                scale(1);
              filter:
                blur(0);
            }

          }


          /* -----------------------------------------------
             AUTHOR ENTRY
          ----------------------------------------------- */

          @keyframes authorIn {

            0% {
              opacity: 0;
              transform:
                translateX(-8px);
            }

            100% {
              opacity: 1;
              transform:
                translateX(0);
            }

          }


          /* -----------------------------------------------
             QUOTE MARK
          ----------------------------------------------- */

          @keyframes quoteMarkFloat {

            0%,
            100% {
              transform:
                translateY(0)
                rotate(0deg);
            }

            50% {
              transform:
                translateY(-4px)
                rotate(-2deg);
            }

          }


          /* -----------------------------------------------
             AMBIENT ORB
          ----------------------------------------------- */

          @keyframes premiumOrb {

            0%,
            100% {
              transform:
                translate3d(0, 0, 0)
                scale(1);
              opacity: 0.65;
            }

            50% {
              transform:
                translate3d(-25px, 18px, 0)
                scale(1.12);
              opacity: 0.9;
            }

          }


          @keyframes premiumOrbReverse {

            0%,
            100% {
              transform:
                translate3d(0, 0, 0)
                scale(1);
              opacity: 0.45;
            }

            50% {
              transform:
                translate3d(25px, -15px, 0)
                scale(1.1);
              opacity: 0.7;
            }

          }


          /* -----------------------------------------------
             ACCENT LIGHT
          ----------------------------------------------- */

          @keyframes accentFlow {

            0% {
              transform:
                translateY(-120%);
            }

            50% {
              transform:
                translateY(320%);
            }

            100% {
              transform:
                translateY(320%);
            }

          }


          /* -----------------------------------------------
             SKELETON SHIMMER
          ----------------------------------------------- */

          @keyframes skeletonShimmer {

            0% {
              transform:
                translateX(-100%);
            }

            100% {
              transform:
                translateX(200%);
            }

          }

        `}
      </style>

    </section>

  );
};


// ============================================================
// WALL CLOCK
// ============================================================

const WallClock = ({
  currentTime,
  clockTime,
}) => {

  const seconds =
    currentTime.getSeconds();

  const minutes =
    currentTime.getMinutes();

  const hours =
    currentTime.getHours();


  const secondAngle =
    seconds * 6;


  const minuteAngle =
    minutes * 6 +
    seconds * 0.1;


  const hourAngle =
    (hours % 12) * 30 +
    minutes * 0.5;


  return (

    <div
      className="
        relative
        overflow-hidden
        rounded-xl
        border
        border-amber-400/10
        bg-amber-500/[0.035]
        p-4
      "
    >

      <div className="flex items-center justify-between">

        <span className="text-amber-300">

          <Clock3
            size={16}
          />

        </span>


        <span className="text-[9px] font-medium uppercase tracking-wider text-white/25">

          Time

        </span>

      </div>


      <div className="mt-3 flex items-center justify-center">

        <div
          className="
            relative
            h-[92px]
            w-[92px]
            rounded-full
            border
            border-white/[0.12]
            bg-[#080808]
            shadow-[0_0_30px_rgba(245,158,11,0.05)]
          "
        >

          <div className="absolute inset-[4px] rounded-full border border-white/[0.05]" />


          <ClockMarker
            position="top"
            className="h-1.5 w-1"
          />

          <ClockMarker
            position="topRight"
            className="h-1 w-1"
          />

          <ClockMarker
            position="right"
            className="h-1 w-1.5"
          />

          <ClockMarker
            position="bottomRight"
            className="h-1 w-1"
          />

          <ClockMarker
            position="bottom"
            className="h-1.5 w-1"
          />

          <ClockMarker
            position="bottomLeft"
            className="h-1 w-1"
          />

          <ClockMarker
            position="left"
            className="h-1 w-1.5"
          />

          <ClockMarker
            position="topLeft"
            className="h-1 w-1"
          />


          <ClockHand
            angle={
              hourAngle
            }
            length="25px"
            width="3px"
            color="bg-white/80"
          />


          <ClockHand
            angle={
              minuteAngle
            }
            length="33px"
            width="2px"
            color="bg-white"
          />


          <ClockHand
            angle={
              secondAngle
            }
            length="36px"
            width="1px"
            color="bg-amber-400"
            smooth
          />


          <div className="absolute left-1/2 top-1/2 z-30 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#080808] bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />

        </div>

      </div>


      <div className="mt-2 text-center">

        <div className="font-mono text-sm font-semibold tracking-[0.08em] text-white/85">

          {clockTime}

        </div>

      </div>

    </div>

  );
};


// ============================================================
// CLOCK MARKER
// ============================================================

const ClockMarker = ({
  position,
  className = '',
}) => {

  const positions = {

    top:
      'left-1/2 top-[7px] -translate-x-1/2',

    topRight:
      'right-[14px] top-[14px]',

    right:
      'right-[7px] top-1/2 -translate-y-1/2',

    bottomRight:
      'bottom-[14px] right-[14px]',

    bottom:
      'bottom-[7px] left-1/2 -translate-x-1/2',

    bottomLeft:
      'bottom-[14px] left-[14px]',

    left:
      'left-[7px] top-1/2 -translate-y-1/2',

    topLeft:
      'left-[14px] top-[14px]',
  };


  return (

    <span
      className={`
        absolute
        rounded-full
        bg-white/30
        ${positions[position]}
        ${className}
      `}
    />

  );
};


// ============================================================
// CLOCK HAND
// ============================================================

const ClockHand = ({
  angle,
  length,
  width,
  color,
  smooth = false,
}) => {

  return (

    <div
      className={`
        absolute
        left-1/2
        top-1/2
        z-20
        origin-bottom
        rounded-full
        ${color}
        ${
          smooth
            ? 'transition-transform duration-500 ease-linear'
            : ''
        }
      `}
      style={{
        width,
        height: length,
        transform: `
          translate(-50%, -100%)
          rotate(${angle}deg)
        `,
      }}
    />

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
        transition-all
        duration-300
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

        <span className="flex items-center gap-1 text-[9px] font-medium text-white/25">

          {action}

          {actionIcon && (
            <ChevronRight
              size={10}
            />
          )}

        </span>

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
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:bg-white/[0.025]
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
          mt-3
          font-semibold
          tracking-tight
          text-white
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

    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 hover:border-white/[0.09] hover:bg-white/[0.035]">

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

    HIGH:
      'border-red-400/15 bg-red-400/10 text-red-300',

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
        ${styles[level] || styles.MEDIUM}
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

  if (!value) {
    return '';
  }


  const text =
    String(value)
      .replace(/\s+/g, ' ')
      .trim();


  if (
    text.length <= maxLength
  ) {
    return text;
  }


  return `${text
    .slice(0, maxLength)
    .trim()}…`;

};


// ============================================================
// COMPANY UPDATE TITLE
// ============================================================

const extractUpdateTitle =
  value => {

    if (!value) {
      return 'Company update';
    }


    const text =
      String(value)
        .replace(/\s+/g, ' ')
        .trim();


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
// BOOK ICON
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