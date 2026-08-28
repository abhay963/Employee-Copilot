import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  Plus,
  X,
} from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3001';

const EmployeeCalendar = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [events, setEvents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [connecting, setConnecting] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [error, setError] =
    useState('');

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const [disconnecting, setDisconnecting] =
    useState(false);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [selectedDate, setSelectedDate] =
    useState(null);

  const [formData, setFormData] =
    useState({
      title: '',
      description: '',
      location: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
    });

  // ============================================================
  // CONSTANTS
  // ============================================================

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ];

  // ============================================================
  // API HELPER
  // ============================================================

  const apiRequest = async (
    endpoint,
    options = {}
  ) => {
    const token =
      localStorage.getItem('token');

    const url =
      `${API_BASE_URL}${endpoint}`;

    console.log(
      'Google Calendar API Request:',
      url
    );

    const response = await fetch(
      url,
      {
        ...options,

        headers: {
          'Content-Type':
            'application/json',

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),

          ...(options.headers || {}),
        },
      }
    );

    // IMPORTANT:
    // Read text first so HTML responses don't
    // cause "Unexpected token '<'" errors.
    const text =
      await response.text();

    let data = null;

    try {
      data = text
        ? JSON.parse(text)
        : null;
    } catch {
      console.error(
        'Server returned non-JSON response:',
        text.substring(0, 500)
      );

      throw new Error(
        `Server returned invalid JSON (${response.status}). Check that the backend is running at ${API_BASE_URL}.`
      );
    }

    if (!response.ok) {
      const apiError =
        new Error(
          data?.error ||
            data?.message ||
            `Request failed with status ${response.status}`
        );

      apiError.code =
        data?.code;

      apiError.status =
        response.status;

      throw apiError;
    }

    return data;
  };

  // ============================================================
  // DATE HELPERS
  // ============================================================

  const getMonthStart = (
    date
  ) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );

  const getMonthEnd = (
    date
  ) =>
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    );

  const formatDateForAPI = (
    date
  ) => {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // ============================================================
  // CHECK GOOGLE CONNECTION
  // ============================================================

  const checkConnection =
    async () => {
      try {
        const response =
          await apiRequest(
            '/api/google/auth/status'
          );

        const isConnected =
          Boolean(
            response?.connected
          );

        setConnected(
          isConnected
        );

        return isConnected;
      } catch (err) {
        console.error(
          'Error checking Google Calendar connection:',
          err
        );

        setConnected(false);

        return false;
      }
    };

  // ============================================================
  // CONNECT GOOGLE CALENDAR
  // ============================================================

  const connectGoogle =
    async () => {
      try {
        setConnecting(true);
        setError('');

        const response =
          await apiRequest(
            '/api/google/auth/url'
          );

        if (
          !response?.success ||
          !response?.authUrl
        ) {
          throw new Error(
            'Google authorization URL was not returned.'
          );
        }

        console.log(
          'Redirecting to Google OAuth...'
        );

        window.location.href =
          response.authUrl;
      } catch (err) {
        console.error(
          'Google connection error:',
          err
        );

        setError(
          err?.message ||
            'Unable to connect Google Calendar.'
        );

        setConnecting(false);
      }
    };

  // ============================================================
  // DISCONNECT GOOGLE CALENDAR
  // ============================================================

  const disconnectGoogle =
    async () => {
      const confirmed =
        window.confirm(
          'Disconnect your Google Calendar? You can reconnect it anytime.'
        );

      if (!confirmed) {
        return;
      }

      try {
        setDisconnecting(true);
        setError('');

        await apiRequest(
          '/api/google/auth/revoke',
          {
            method: 'DELETE',
          }
        );

        setConnected(false);
        setEvents([]);
      } catch (err) {
        console.error(
          'Disconnect error:',
          err
        );

        setError(
          err?.message ||
            'Failed to disconnect Google Calendar.'
        );
      } finally {
        setDisconnecting(false);
      }
    };

  // ============================================================
  // LOAD EVENTS
  // ============================================================

  const loadEvents =
    async () => {
      try {
        setLoading(true);
        setError('');

        const startDate =
          formatDateForAPI(
            getMonthStart(
              currentDate
            )
          );

        const endDate =
          formatDateForAPI(
            getMonthEnd(
              currentDate
            )
          );

        console.log(
          'Loading Google Calendar events:',
          {
            startDate,
            endDate,
          }
        );

        const response =
          await apiRequest(
            `/api/google/calendar/events?startDate=${encodeURIComponent(
              startDate
            )}&endDate=${encodeURIComponent(
              endDate
            )}`
          );

        console.log(
          'Google Calendar events response:',
          response
        );

        if (
          response?.success
        ) {
          const loadedEvents =
            Array.isArray(
              response.events
            )
              ? response.events
              : [];

          setEvents(
            loadedEvents
          );

          setConnected(true);

          console.log(
            `Loaded ${loadedEvents.length} calendar event(s).`
          );

          return;
        }

        throw new Error(
          response?.error ||
            'Unable to load calendar events.'
        );
      } catch (err) {
        console.error(
          'Error loading calendar events:',
          err
        );

        if (
          err?.code ===
          'GOOGLE_NOT_CONNECTED'
        ) {
          setConnected(false);
          setEvents([]);
          setError('');
          return;
        }

        if (
          err?.code ===
          'GOOGLE_RECONNECT_REQUIRED'
        ) {
          setConnected(false);
          setEvents([]);

          setError(
            'Your Google Calendar connection has expired. Please reconnect.'
          );

          return;
        }

        setEvents([]);

        setError(
          err?.message ||
            'Unable to load Google Calendar events.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // INITIAL LOAD / MONTH CHANGE
  // ============================================================

  useEffect(() => {
    const initialize =
      async () => {
        const isConnected =
          await checkConnection();

        if (isConnected) {
          await loadEvents();
        } else {
          setLoading(false);
        }
      };

    initialize();
  }, [currentDate]);

  // ============================================================
  // NAVIGATION
  // ============================================================

  const goToPreviousMonth =
    () => {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1
        )
      );
    };

  const goToNextMonth =
    () => {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1
        )
      );
    };

  const goToToday =
    () => {
      setCurrentDate(
        new Date()
      );
    };

  // ============================================================
  // CREATE EVENT MODAL
  // ============================================================

  const openCreateModal =
    (date = null) => {
      const targetDate =
        date || new Date();

      setSelectedDate(
        targetDate
      );

      setFormData({
        title: '',
        description: '',
        location: '',
        date:
          formatDateForAPI(
            targetDate
          ),
        startTime: '09:00',
        endTime: '10:00',
      });

      setError('');
      setShowCreateModal(true);
    };

  const closeCreateModal =
    () => {
      if (creating) {
        return;
      }

      setShowCreateModal(false);

      setSelectedDate(null);
    };

  const handleFormChange =
    (e) => {
      const {
        name,
        value,
      } = e.target;

      setFormData(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  // ============================================================
  // CREATE GOOGLE CALENDAR EVENT
  // ============================================================

  const handleCreateEvent =
    async (e) => {
      e.preventDefault();

      if (
        !formData.title.trim()
      ) {
        setError(
          'Please enter an event title.'
        );

        return;
      }

      if (!formData.date) {
        setError(
          'Please select a date.'
        );

        return;
      }

      if (
        !formData.startTime ||
        !formData.endTime
      ) {
        setError(
          'Please select start and end times.'
        );

        return;
      }

      if (
        formData.endTime <=
        formData.startTime
      ) {
        setError(
          'End time must be after start time.'
        );

        return;
      }

      try {
        setCreating(true);
        setError('');

        const timeZone =
          Intl.DateTimeFormat().resolvedOptions()
            .timeZone ||
          'Asia/Kolkata';

        const eventData = {
          summary:
            formData.title.trim(),

          description:
            formData.description.trim(),

          location:
            formData.location.trim(),

          start: {
            dateTime:
              `${formData.date}T${formData.startTime}:00`,

            timeZone,
          },

          end: {
            dateTime:
              `${formData.date}T${formData.endTime}:00`,

            timeZone,
          },
        };

        console.log(
          'Creating Google Calendar event:',
          eventData
        );

        const response =
          await apiRequest(
            '/api/google/calendar/events',
            {
              method: 'POST',

              body:
                JSON.stringify(
                  eventData
                ),
            }
          );

        console.log(
          'Create event response:',
          response
        );

        if (
          !response?.success
        ) {
          throw new Error(
            response?.error ||
              'Failed to create calendar event.'
          );
        }

        setShowCreateModal(
          false
        );

        setSelectedDate(
          null
        );

        setFormData({
          title: '',
          description: '',
          location: '',
          date: '',
          startTime: '09:00',
          endTime: '10:00',
        });

        // Fetch the newly created event
        await loadEvents();
      } catch (err) {
        console.error(
          'Error creating calendar event:',
          err
        );

        setError(
          err?.message ||
            'Unable to create calendar event.'
        );
      } finally {
        setCreating(false);
      }
    };

  // ============================================================
  // CALENDAR DAYS
  // ============================================================

  const calendarDays =
    useMemo(() => {
      const year =
        currentDate.getFullYear();

      const month =
        currentDate.getMonth();

      const firstDay =
        new Date(
          year,
          month,
          1
        );

      const lastDay =
        new Date(
          year,
          month + 1,
          0
        );

      const previousMonthLastDay =
        new Date(
          year,
          month,
          0
        ).getDate();

      const days = [];

      // Previous month
      for (
        let i =
          firstDay.getDay() - 1;
        i >= 0;
        i--
      ) {
        days.push({
          date: new Date(
            year,
            month - 1,
            previousMonthLastDay -
              i
          ),
          currentMonth: false,
        });
      }

      // Current month
      for (
        let day = 1;
        day <=
        lastDay.getDate();
        day++
      ) {
        days.push({
          date: new Date(
            year,
            month,
            day
          ),
          currentMonth: true,
        });
      }

      // Next month
      let nextDay = 1;

      while (
        days.length < 42
      ) {
        days.push({
          date: new Date(
            year,
            month + 1,
            nextDay
          ),
          currentMonth: false,
        });

        nextDay++;
      }

      return days;
    }, [currentDate]);

  // ============================================================
  // EVENT HELPERS
  // ============================================================

  const getEventDate = (
    event
  ) => {
    if (!event) {
      return null;
    }

    const value =
      event?.start?.dateTime ||
      event?.start?.date ||
      event?.startDate ||
      event?.start;

    if (!value) {
      return null;
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };

  const isSameDay = (
    date1,
    date2
  ) => {
    return (
      date1.getFullYear() ===
        date2.getFullYear() &&
      date1.getMonth() ===
        date2.getMonth() &&
      date1.getDate() ===
        date2.getDate()
    );
  };

  const getEventsForDay = (
    date
  ) => {
    return events.filter(
      (event) => {
        const eventDate =
          getEventDate(event);

        if (!eventDate) {
          return false;
        }

        return isSameDay(
          eventDate,
          date
        );
      }
    );
  };

  const isToday = (
    date
  ) =>
    isSameDay(
      date,
      new Date()
    );

  const getEventTitle = (
    event
  ) =>
    event?.summary ||
    event?.title ||
    'Untitled event';

  const getEventLocation = (
    event
  ) =>
    event?.location ||
    event?.venue ||
    '';

  // ============================================================
  // EVENT TIME
  // ============================================================

  const formatEventTime = (
    event
  ) => {
    if (
      event?.start?.date
    ) {
      return 'All day';
    }

    const value =
      event?.start?.dateTime ||
      event?.startDate ||
      event?.start;

    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  };

  const formatEventDate = (
    event
  ) => {
    const date =
      getEventDate(event);

    if (!date) {
      return '';
    }

    return date.toLocaleDateString(
      [],
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  // ============================================================
  // NOT CONNECTED UI
  // ============================================================

  if (
    !loading &&
    !connected
  ) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="max-w-xl mx-auto text-center">

            <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center">
              <CalendarDays
                size={38}
                className="text-blue-600"
              />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Connect your Google Calendar
            </h2>

            <p className="mt-3 text-gray-600 leading-relaxed">
              Connect your Google account to see
              your personal calendar events directly
              inside Employee Copilot.
            </p>

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <CalendarDays
                  size={20}
                  className="text-blue-600"
                />

                <p className="mt-2 text-sm font-medium text-gray-900">
                  View events
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  See your meetings and appointments.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <Clock
                  size={20}
                  className="text-blue-600"
                />

                <p className="mt-2 text-sm font-medium text-gray-900">
                  Check schedule
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Quickly understand your availability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <CheckCircle
                  size={20}
                  className="text-blue-600"
                />

                <p className="mt-2 text-sm font-medium text-gray-900">
                  Stay organized
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Keep your workday in one place.
                </p>
              </div>

            </div>

            {error && (
              <div className="mt-6 flex items-start gap-3 text-left p-4 rounded-xl border border-red-200 bg-red-50">
                <AlertCircle
                  size={18}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />

                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={connectGoogle}
              disabled={connecting}
              className="mt-7 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />

                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon
                    size={18}
                  />

                  Connect Google Calendar
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-gray-400">
              You can disconnect your Google Calendar
              at any time.
            </p>

          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // CALENDAR UI
  // ============================================================

  return (
    <div className="relative h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="px-6 py-5 border-b border-gray-200">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays
                size={23}
                className="text-blue-600"
              />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-xl font-bold text-gray-900">
                  My Calendar
                </h2>

                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                </span>

              </div>

              <p className="text-sm text-gray-500">
                Your Google Calendar events
              </p>

            </div>

          </div>

          {/* CONTROLS */}

          <div className="flex items-center gap-2 flex-wrap">

            {/* ADD EVENT */}

            <button
              onClick={() =>
                openCreateModal()
              }
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus
                size={17}
              />

              Add event
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Today
            </button>

            <button
              onClick={
                goToPreviousMonth
              }
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              aria-label="Previous month"
            >
              <ChevronLeft
                size={18}
              />
            </button>

            <button
              onClick={
                goToNextMonth
              }
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              aria-label="Next month"
            >
              <ChevronRight
                size={18}
              />
            </button>

            <button
              onClick={
                loadEvents
              }
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
              aria-label="Refresh calendar"
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>

            <button
              onClick={
                disconnectGoogle
              }
              disabled={
                disconnecting
              }
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Unlink
                size={16}
              />

              Disconnect
            </button>

          </div>

        </div>

        {/* MONTH */}

        <div className="mt-5 flex items-center justify-center">

          <h3 className="text-lg font-semibold text-gray-900">
            {
              monthNames[
                currentDate.getMonth()
              ]
            }{' '}
            {currentDate.getFullYear()}
          </h3>

        </div>

        <p className="text-center text-xs text-gray-400 mt-1">
          Click any date to create an event
        </p>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

          <AlertCircle
            size={18}
            className="text-red-500 mt-0.5 flex-shrink-0"
          />

          <div className="flex-1">

            <p className="text-sm font-medium text-red-700">
              Calendar error
            </p>

            <p className="text-sm text-red-600 mt-1">
              {error}
            </p>

          </div>

          <button
            onClick={
              connectGoogle
            }
            className="text-sm font-semibold text-red-700 hover:text-red-900 whitespace-nowrap"
          >
            Reconnect
          </button>

        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-white/30">

          <div className="bg-white/95 rounded-xl px-5 py-3 shadow-sm border border-gray-200">

            <div className="flex items-center gap-3">

              <RefreshCw
                size={18}
                className="animate-spin text-blue-600"
              />

              <span className="text-sm text-gray-600">
                Loading calendar...
              </span>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          CALENDAR
      ====================================================== */}

      <div className="flex-1 p-4 md:p-6 overflow-auto">

        {/* WEEK HEADERS */}

        <div className="grid grid-cols-7 border-t border-l border-gray-200">

          {dayNames.map(
            (day) => (
              <div
                key={day}
                className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-b border-gray-200 bg-gray-50"
              >
                {day}
              </div>
            )
          )}

        </div>

        {/* DAYS */}

        <div className="grid grid-cols-7 border-l border-gray-200">

          {calendarDays.map(
            (
              {
                date,
                currentMonth,
              },
              index
            ) => {

              const dayEvents =
                getEventsForDay(
                  date
                );

              return (
                <div
                  key={`${date.toISOString()}-${index}`}
                  onClick={() => {
                    if (
                      currentMonth
                    ) {
                      openCreateModal(
                        date
                      );
                    }
                  }}
                  className={`group relative min-h-[105px] md:min-h-[125px] p-2 border-r border-b border-gray-200 transition ${
                    currentMonth
                      ? 'bg-white hover:bg-blue-50/40 cursor-pointer'
                      : 'bg-gray-50'
                  }`}
                >

                  {/* DATE */}

                  <div className="flex items-center justify-between mb-1">

                    {/* PLUS ICON */}

                    {currentMonth && (
                      <span className="opacity-0 group-hover:opacity-100 transition text-blue-500">
                        <Plus
                          size={14}
                        />
                      </span>
                    )}

                    <span
                      className={`ml-auto w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                        isToday(date)
                          ? 'bg-blue-600 text-white'
                          : currentMonth
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                  </div>

                  {/* EVENTS */}

                  <div className="space-y-1">

                    {dayEvents
                      .slice(0, 3)
                      .map(
                        (
                          event,
                          eventIndex
                        ) => (
                          <button
                            key={
                              event.id ||
                              `${date.toISOString()}-${eventIndex}`
                            }
                            onClick={(e) => {
                              e.stopPropagation();

                              setSelectedEvent(
                                event
                              );
                            }}
                            className="relative z-10 w-full text-left px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition overflow-hidden"
                          >

                            <div className="text-xs font-semibold text-blue-700 truncate">
                              {getEventTitle(
                                event
                              )}
                            </div>

                            <div className="text-[11px] text-blue-600 mt-0.5 truncate">
                              {formatEventTime(
                                event
                              )}
                            </div>

                          </button>
                        )
                      )}

                    {dayEvents.length >
                      3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          setSelectedEvent(
                            dayEvents[3]
                          );
                        }}
                        className="relative z-10 text-xs text-gray-500 hover:text-blue-600 px-1"
                      >
                        +
                        {dayEvents.length -
                          3}{' '}
                        more
                      </button>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>

        {/* EMPTY MONTH */}

        {!loading &&
          events.length ===
            0 && (
            <div className="py-8 text-center">

              <CalendarDays
                size={30}
                className="mx-auto text-gray-300"
              />

              <p className="mt-2 text-sm text-gray-500">
                No events found for this month.
              </p>

              <button
                onClick={() =>
                  openCreateModal()
                }
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                <Plus
                  size={16}
                />

                Create your first event
              </button>

            </div>
          )}

      </div>

      {/* ======================================================
          CREATE EVENT MODAL
      ====================================================== */}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          onClick={
            closeCreateModal
          }
        >

          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Plus
                      size={19}
                      className="text-blue-600"
                    />
                  </div>

                  <div>

                    <h3 className="text-lg font-bold text-gray-900">
                      Create Calendar Event
                    </h3>

                    <p className="text-xs text-gray-500">
                      Add an event to Google Calendar
                    </p>

                  </div>

                </div>

              </div>

              <button
                onClick={
                  closeCreateModal
                }
                disabled={creating}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X
                  size={19}
                />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleCreateEvent
              }
              className="p-6 space-y-5"
            >

              {/* TITLE */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Event title
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="e.g. Team meeting"
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

              </div>

              {/* DATE */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={
                    formData.date
                  }
                  onChange={
                    handleFormChange
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

              </div>

              {/* TIME */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start time
                  </label>

                  <input
                    type="time"
                    name="startTime"
                    value={
                      formData.startTime
                    }
                    onChange={
                      handleFormChange
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End time
                  </label>

                  <input
                    type="time"
                    name="endTime"
                    value={
                      formData.endTime
                    }
                    onChange={
                      handleFormChange
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                </div>

              </div>

              {/* LOCATION */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location
                  <span className="text-gray-400 font-normal">
                    {' '}
                    (optional)
                  </span>
                </label>

                <div className="relative">

                  <MapPin
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    name="location"
                    value={
                      formData.location
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Meeting room or location"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                </div>

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                  <span className="text-gray-400 font-normal">
                    {' '}
                    (optional)
                  </span>
                </label>

                <textarea
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleFormChange
                  }
                  rows={3}
                  placeholder="Add event details..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

              </div>

              {/* ERROR */}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50">

                  <AlertCircle
                    size={17}
                    className="text-red-500 mt-0.5 flex-shrink-0"
                  />

                  <p className="text-sm text-red-700">
                    {error}
                  </p>

                </div>
              )}

              {/* BUTTONS */}

              <div className="flex items-center justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={creating}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >

                  {creating ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle
                        size={16}
                      />

                      Create event
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ======================================================
          EVENT DETAILS MODAL
      ====================================================== */}

      {selectedEvent && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40"
          onClick={() =>
            setSelectedEvent(null)
          }
        >

          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="px-6 py-5 border-b border-gray-200">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Calendar Event
                  </p>

                  <h3 className="text-xl font-bold text-gray-900">
                    {getEventTitle(
                      selectedEvent
                    )}
                  </h3>

                </div>

                <button
                  onClick={() =>
                    setSelectedEvent(
                      null
                    )
                  }
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>

              </div>

            </div>

            {/* BODY */}

            <div className="p-6 space-y-4">

              <div className="flex items-start gap-3">

                <CalendarDays
                  size={19}
                  className="text-gray-400 mt-0.5"
                />

                <div>

                  <p className="text-xs text-gray-500">
                    Date
                  </p>

                  <p className="text-sm font-medium text-gray-900">
                    {formatEventDate(
                      selectedEvent
                    )}
                  </p>

                </div>

              </div>

              <div className="flex items-start gap-3">

                <Clock
                  size={19}
                  className="text-gray-400 mt-0.5"
                />

                <div>

                  <p className="text-xs text-gray-500">
                    Time
                  </p>

                  <p className="text-sm font-medium text-gray-900">
                    {formatEventTime(
                      selectedEvent
                    )}
                  </p>

                </div>

              </div>

              {getEventLocation(
                selectedEvent
              ) && (
                <div className="flex items-start gap-3">

                  <MapPin
                    size={19}
                    className="text-gray-400 mt-0.5"
                  />

                  <div>

                    <p className="text-xs text-gray-500">
                      Location
                    </p>

                    <p className="text-sm font-medium text-gray-900">
                      {getEventLocation(
                        selectedEvent
                      )}
                    </p>

                  </div>

                </div>
              )}

              {selectedEvent.description && (
                <div className="pt-2">

                  <p className="text-xs text-gray-500 mb-1">
                    Description
                  </p>

                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {
                      selectedEvent.description
                    }
                  </p>

                </div>
              )}

              {selectedEvent.htmlLink && (
                <a
                  href={
                    selectedEvent.htmlLink
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <ExternalLink
                    size={17}
                  />

                  Open in Google Calendar
                </a>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default EmployeeCalendar;