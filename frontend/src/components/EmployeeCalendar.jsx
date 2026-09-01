import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { toast } from 'react-hot-toast';
import { googleAPI } from '../services/api';

// ============================================================
// DATE HELPERS
// ============================================================

const pad = (value) =>
  String(value).padStart(2, '0');

const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;

const formatDateTimeLocal = (date) =>
  `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;

const getMonthStart = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

const getMonthEnd = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );

const getCalendarGrid = (currentDate) => {
  const firstDay =
    getMonthStart(currentDate);

  const lastDay =
    getMonthEnd(currentDate);

  const start = new Date(firstDay);

  start.setDate(
    start.getDate() - start.getDay()
  );

  const end = new Date(lastDay);

  end.setDate(
    end.getDate() +
      (6 - end.getDay())
  );

  const days = [];

  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));

    cursor.setDate(
      cursor.getDate() + 1
    );
  }

  return days;
};

const formatMonthTitle = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

const formatEventTime = (event) => {
  if (!event?.start) {
    return '';
  }

  if (event.start.date) {
    return 'All day';
  }

  if (event.start.dateTime) {
    const date =
      new Date(event.start.dateTime);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
    );
  }

  return '';
};

const getEventDateKey = (event) => {
  if (!event?.start) {
    return null;
  }

  // Google all-day event
  if (event.start.date) {
    return event.start.date;
  }

  // Google timed event
  if (event.start.dateTime) {
    const date =
      new Date(event.start.dateTime);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return formatDateKey(date);
  }

  return null;
};

const getInitialForm = () => {
  const now = new Date();

  const start = new Date(now);

  const remainder =
    start.getMinutes() % 30;

  start.setMinutes(
    start.getMinutes() +
      (remainder === 0
        ? 0
        : 30 - remainder),
    0,
    0
  );

  const end = new Date(start);

  end.setHours(
    end.getHours() + 1
  );

  return {
    summary: '',
    description: '',
    location: '',
    start:
      formatDateTimeLocal(start),
    end:
      formatDateTimeLocal(end),
  };
};

// ============================================================
// COMPONENT
// ============================================================

function EmployeeCalendar() {
  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [events, setEvents] =
    useState([]);

  const [
    calendarConnected,
    setCalendarConnected,
  ] = useState(false);

  const [
    checkingConnection,
    setCheckingConnection,
  ] = useState(true);

  const [connecting, setConnecting] =
    useState(false);

  const [
    disconnecting,
    setDisconnecting,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    showEventModal,
    setShowEventModal,
  ] = useState(false);

  const [
    creatingEvent,
    setCreatingEvent,
  ] = useState(false);

  const [eventForm, setEventForm] =
    useState(getInitialForm());

  // ============================================================
  // CALENDAR GRID
  // ============================================================

  const calendarDays = useMemo(
    () =>
      getCalendarGrid(currentDate),
    [currentDate]
  );

  // ============================================================
  // MONTH RANGE
  // ============================================================

  const monthRange = useMemo(() => {
    return {
      start:
        getMonthStart(currentDate),

      end:
        getMonthEnd(currentDate),
    };
  }, [currentDate]);

  // ============================================================
  // CHECK CONNECTION
  // ============================================================

  const checkConnection =
    useCallback(async () => {
      try {
        setCheckingConnection(true);

        const response =
          await googleAPI.getCalendarStatus();

        const connected =
          Boolean(response?.connected);

        setCalendarConnected(
          connected
        );

        return connected;
      } catch (error) {
        console.error(
          'Calendar status error:',
          error
        );

        setCalendarConnected(false);

        // Do NOT show an error toast for
        // a normal disconnected state.
        if (
          error?.code !==
          'GOOGLE_CALENDAR_NOT_CONNECTED'
        ) {
          toast.error(
            error?.error ||
              error?.message ||
              'Unable to check Google Calendar connection.'
          );
        }

        return false;
      } finally {
        setCheckingConnection(false);
      }
    }, []);

  // ============================================================
  // LOAD EVENTS
  // ============================================================

  const loadEvents =
    useCallback(async () => {
      if (!calendarConnected) {
        setEvents([]);
        return;
      }

      try {
        setLoading(true);

        const response =
          await googleAPI.getCalendarEvents(
            formatDateKey(
              monthRange.start
            ),
            formatDateKey(
              monthRange.end
            )
          );

        const loadedEvents =
          Array.isArray(
            response?.events
          )
            ? response.events
            : [];

        setEvents(loadedEvents);
      } catch (error) {
        console.error(
          'Calendar events error:',
          error
        );

        if (
          error?.code ===
          'GOOGLE_CALENDAR_NOT_CONNECTED'
        ) {
          setCalendarConnected(false);
          setEvents([]);

          toast.error(
            'Google Calendar is not connected.'
          );

          return;
        }

        if (
          error?.code ===
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
        ) {
          setCalendarConnected(false);
          setEvents([]);

          toast.error(
            'Google Calendar authorization expired. Please reconnect.'
          );

          return;
        }

        if (
          error?.code ===
          'GOOGLE_CALENDAR_PERMISSION_REQUIRED'
        ) {
          setCalendarConnected(false);
          setEvents([]);

          toast.error(
            'Google Calendar permission is missing. Please reconnect.'
          );

          return;
        }

        toast.error(
          error?.error ||
            error?.message ||
            'Failed to load calendar events.'
        );
      } finally {
        setLoading(false);
      }
    }, [
      calendarConnected,
      monthRange,
    ]);

  // ============================================================
  // INITIALIZE CALENDAR
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const initialize =
      async () => {
        const connected =
          await checkConnection();

        if (
          cancelled
        ) {
          return;
        }

        if (connected) {
          await loadEvents();
        } else {
          setEvents([]);
        }
      };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    checkConnection,
    loadEvents,
  ]);

  // ============================================================
  // HANDLE OAUTH CALLBACK
  // ============================================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const connected =
      params.get(
        'google_connected'
      );

    const googleError =
      params.get(
        'google_error'
      );

    const errorDescription =
      params.get(
        'error_description'
      );

    if (
      connected === 'true'
    ) {
      toast.success(
        'Google Calendar connected successfully.'
      );

      // Remove OAuth parameters.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      // IMPORTANT:
      // Ask backend for the real state.
      checkConnection().then(
        (isConnected) => {
          if (isConnected) {
            loadEvents();
          }
        }
      );

      return;
    }

    if (googleError) {
      console.error(
        'Google Calendar OAuth error:',
        {
          error: googleError,
          description:
            errorDescription,
        }
      );

      toast.error(
        errorDescription ||
          `Google Calendar connection failed: ${googleError}`,
        {
          duration: 6000,
        }
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, [
    checkConnection,
    loadEvents,
  ]);

  // ============================================================
  // CONNECT
  // ============================================================

  const handleConnect =
    async () => {
      try {
        setConnecting(true);

        const response =
          await googleAPI.getCalendarAuthUrl();

        if (
          !response?.authUrl
        ) {
          throw new Error(
            'Google Calendar authorization URL was not returned.'
          );
        }

        window.location.assign(
          response.authUrl
        );
      } catch (error) {
        console.error(
          'Calendar connect error:',
          error
        );

        toast.error(
          error?.error ||
            error?.message ||
            'Failed to connect Google Calendar.'
        );

        setConnecting(false);
      }
    };

  // ============================================================
  // DISCONNECT
  // ============================================================

  const handleDisconnect =
    async () => {
      const confirmed =
        window.confirm(
          'Disconnect Google Calendar from Employee Copilot?'
        );

      if (!confirmed) {
        return;
      }

      try {
        setDisconnecting(true);

        await googleAPI.revokeCalendarTokens();

        setCalendarConnected(false);
        setEvents([]);

        toast.success(
          'Google Calendar disconnected successfully.'
        );
      } catch (error) {
        console.error(
          'Calendar disconnect error:',
          error
        );

        toast.error(
          error?.error ||
            error?.message ||
            'Failed to disconnect Google Calendar.'
        );
      } finally {
        setDisconnecting(false);
      }
    };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const goToPreviousMonth =
    () => {
      setCurrentDate(
        (previous) =>
          new Date(
            previous.getFullYear(),
            previous.getMonth() - 1,
            1
          )
      );
    };

  const goToNextMonth =
    () => {
      setCurrentDate(
        (previous) =>
          new Date(
            previous.getFullYear(),
            previous.getMonth() + 1,
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
  // EVENTS BY DATE
  // ============================================================

  const eventsByDate =
    useMemo(() => {
      const grouped = {};

      for (
        const calendarEvent of events
      ) {
        const dateKey =
          getEventDateKey(
            calendarEvent
          );

        if (!dateKey) {
          continue;
        }

        if (
          !grouped[dateKey]
        ) {
          grouped[dateKey] = [];
        }

        grouped[dateKey].push(
          calendarEvent
        );
      }

      return grouped;
    }, [events]);

  // ============================================================
  // OPEN CREATE MODAL
  // ============================================================

  const openCreateEventModal =
    (date = null) => {
      const form =
        getInitialForm();

      if (date) {
        const selected =
          new Date(date);

        selected.setHours(
          9,
          0,
          0,
          0
        );

        const end =
          new Date(selected);

        end.setHours(
          10,
          0,
          0,
          0
        );

        form.start =
          formatDateTimeLocal(
            selected
          );

        form.end =
          formatDateTimeLocal(
            end
          );
      }

      setEventForm(form);

      setShowEventModal(true);
    };

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  const closeEventModal =
    () => {
      if (creatingEvent) {
        return;
      }

      setShowEventModal(false);

      setEventForm(
        getInitialForm()
      );
    };

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleFormChange =
    (field, value) => {
      setEventForm(
        (previous) => ({
          ...previous,
          [field]: value,
        })
      );
    };

  // ============================================================
  // CREATE EVENT
  // ============================================================

  const handleCreateEvent =
    async (event) => {
      event.preventDefault();

      const title =
        eventForm.summary.trim();

      if (!title) {
        toast.error(
          'Event title is required.'
        );

        return;
      }

      if (
        !eventForm.start ||
        !eventForm.end
      ) {
        toast.error(
          'Start and end time are required.'
        );

        return;
      }

      const startDate =
        new Date(
          eventForm.start
        );

      const endDate =
        new Date(
          eventForm.end
        );

      if (
        Number.isNaN(
          startDate.getTime()
        ) ||
        Number.isNaN(
          endDate.getTime()
        )
      ) {
        toast.error(
          'Please enter valid dates and times.'
        );

        return;
      }

      if (
        endDate <= startDate
      ) {
        toast.error(
          'End time must be after start time.'
        );

        return;
      }

      try {
        setCreatingEvent(true);

        const timeZone =
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone ||
          'Asia/Kolkata';

        const eventData = {
          summary: title,

          description:
            eventForm.description.trim() ||
            undefined,

          location:
            eventForm.location.trim() ||
            undefined,

          start: {
            dateTime:
              `${eventForm.start}:00`,
            timeZone,
          },

          end: {
            dateTime:
              `${eventForm.end}:00`,
            timeZone,
          },
        };

        await googleAPI.createCalendarEvent(
          eventData
        );

        toast.success(
          'Calendar event created successfully.'
        );

        setShowEventModal(false);

        setEventForm(
          getInitialForm()
        );

        await loadEvents();
      } catch (error) {
        console.error(
          'Create calendar event error:',
          error
        );

        if (
          error?.code ===
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
        ) {
          setCalendarConnected(false);

          toast.error(
            'Google Calendar authorization expired. Please reconnect.'
          );

          return;
        }

        toast.error(
          error?.error ||
            error?.message ||
            'Failed to create calendar event.'
        );
      } finally {
        setCreatingEvent(false);
      }
    };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="calendar-page">
      <style>{`
        .calendar-page {
          min-height: 100%;
          width: 100%;
          padding: 28px;
          box-sizing: border-box;
          color: #f5f7fb;
          background:
            radial-gradient(
              circle at top right,
              rgba(99,102,241,.12),
              transparent 30%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(56,189,248,.06),
              transparent 28%
            );
        }

        .calendar-container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .calendar-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -.5px;
        }

        .calendar-subtitle {
          margin: 6px 0 0;
          color: #8d96a8;
          font-size: 14px;
        }

        .calendar-header-actions {
          display: flex;
          gap: 10px;
        }

        .calendar-button {
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.045);
          color: #f5f7fb;
          border-radius: 10px;
          padding: 10px 15px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s ease;
        }

        .calendar-button:hover {
          background: rgba(255,255,255,.08);
        }

        .calendar-button.primary {
          border-color: transparent;
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #7c3aed
            );
        }

        .calendar-button.primary:hover {
          transform: translateY(-1px);
          box-shadow:
            0 8px 24px rgba(99,102,241,.25);
        }

        .calendar-button.danger {
          color: #ff8d9b;
        }

        .calendar-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .calendar-card {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(17,20,29,.72);
          backdrop-filter: blur(18px);
          box-shadow:
            0 20px 70px rgba(0,0,0,.2);
        }

        .connection-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 20px;
          border-bottom:
            1px solid rgba(255,255,255,.07);
        }

        .connection-left {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .google-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.06);
          font-weight: 700;
        }

        .connection-title {
          margin-bottom: 3px;
          font-size: 14px;
          font-weight: 600;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #8d96a8;
          font-size: 12px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #737b8c;
        }

        .status-dot.connected {
          background: #4ade80;
          box-shadow:
            0 0 10px rgba(74,222,128,.55);
        }

        .calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom:
            1px solid rgba(255,255,255,.07);
        }

        .month-navigation {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .month-button {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px;
          background: rgba(255,255,255,.035);
          color: #dce1ea;
          cursor: pointer;
          font-size: 17px;
        }

        .month-button:hover {
          background: rgba(255,255,255,.08);
        }

        .month-title {
          min-width: 190px;
          margin-left: 7px;
          font-size: 18px;
          font-weight: 650;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns:
            repeat(7,minmax(0,1fr));
        }

        .weekday {
          padding: 13px 12px;
          border-bottom:
            1px solid rgba(255,255,255,.07);
          color: #777f91;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .calendar-day {
          min-height: 130px;
          padding: 10px;
          box-sizing: border-box;
          border-right:
            1px solid rgba(255,255,255,.055);
          border-bottom:
            1px solid rgba(255,255,255,.055);
          background: rgba(255,255,255,.008);
          cursor: pointer;
        }

        .calendar-day:nth-child(7n) {
          border-right: none;
        }

        .calendar-day:hover {
          background: rgba(255,255,255,.035);
        }

        .calendar-day.other-month {
          opacity: .42;
        }

        .calendar-day.today {
          background:
            linear-gradient(
              180deg,
              rgba(99,102,241,.09),
              rgba(255,255,255,.008)
            );
        }

        .day-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .day-number {
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #cdd3df;
          font-size: 12px;
          font-weight: 600;
        }

        .day-number.today {
          color: white;
          background: #6366f1;
          box-shadow:
            0 4px 15px rgba(99,102,241,.32);
        }

        .add-day {
          opacity: 0;
          border: none;
          background: transparent;
          color: #9da6b7;
          cursor: pointer;
          font-size: 17px;
        }

        .calendar-day:hover .add-day {
          opacity: 1;
        }

        .event-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .calendar-event {
          width: 100%;
          box-sizing: border-box;
          padding: 5px 7px;
          border:
            1px solid rgba(99,102,241,.18);
          border-left:
            3px solid #6366f1;
          border-radius: 5px;
          background:
            rgba(99,102,241,.1);
          color: #dfe3ff;
          text-align: left;
          cursor: pointer;
        }

        .calendar-event:hover {
          background:
            rgba(99,102,241,.18);
        }

        .event-time {
          margin-bottom: 2px;
          color: #9ea7c5;
          font-size: 9px;
        }

        .event-title {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 11px;
          font-weight: 600;
        }

        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: #858d9e;
        }

        .empty-state-icon {
          margin-bottom: 12px;
          font-size: 42px;
        }

        .empty-state-title {
          margin-bottom: 8px;
          color: #dce1ea;
          font-size: 18px;
          font-weight: 650;
        }

        .empty-state-text {
          max-width: 450px;
          margin:
            0 auto 20px;
          line-height: 1.6;
          font-size: 13px;
        }

        .loading-state {
          padding: 80px 20px;
          text-align: center;
          color: #8d96a8;
          font-size: 13px;
        }

        .spinner {
          width: 25px;
          height: 25px;
          margin: 0 auto 12px;
          border:
            2px solid rgba(255,255,255,.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation:
            calendar-spin .8s linear infinite;
        }

        @keyframes calendar-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0,0,0,.62);
          backdrop-filter: blur(7px);
        }

        .modal {
          width: 100%;
          max-width: 530px;
          overflow: hidden;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 18px;
          background: #151821;
          box-shadow:
            0 30px 100px rgba(0,0,0,.45);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px;
          border-bottom:
            1px solid rgba(255,255,255,.07);
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .close-button {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,.05);
          color: #a7afbf;
          cursor: pointer;
          font-size: 18px;
        }

        .modal-body {
          padding: 22px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-label {
          display: block;
          margin-bottom: 7px;
          color: #aeb6c5;
          font-size: 12px;
          font-weight: 600;
        }

        .form-input {
          width: 100%;
          box-sizing: border-box;
          outline: none;
          padding: 11px 12px;
          border:
            1px solid rgba(255,255,255,.09);
          border-radius: 9px;
          background: rgba(255,255,255,.045);
          color: #f5f7fb;
          font-size: 13px;
        }

        .form-input:focus {
          border-color:
            rgba(99,102,241,.7);
          box-shadow:
            0 0 0 3px
            rgba(99,102,241,.1);
        }

        textarea.form-input {
          min-height: 90px;
          resize: vertical;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 17px 22px;
          border-top:
            1px solid rgba(255,255,255,.07);
        }

        @media (max-width: 900px) {
          .calendar-page {
            padding: 18px;
          }

          .calendar-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .calendar-day {
            min-height: 105px;
          }
        }

        @media (max-width: 650px) {
          .calendar-page {
            padding: 10px;
          }

          .calendar-day {
            min-height: 85px;
            padding: 5px;
          }

          .event-time {
            display: none;
          }

          .event-title {
            font-size: 9px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .connection-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="calendar-container">

        {/* HEADER */}

        <div className="calendar-header">
          <div>
            <h1 className="calendar-title">
              Calendar
            </h1>

            <p className="calendar-subtitle">
              Manage your schedule and Google Calendar events.
            </p>
          </div>

          <div className="calendar-header-actions">
            {calendarConnected && (
              <button
                className="calendar-button primary"
                onClick={() =>
                  openCreateEventModal()
                }
              >
                + New Event
              </button>
            )}

            <button
              className="calendar-button"
              onClick={goToToday}
            >
              Today
            </button>
          </div>
        </div>

        {/* CARD */}

        <div className="calendar-card">

          {/* CONNECTION */}

          <div className="connection-card">
            <div className="connection-left">

              <div className="google-icon">
                G
              </div>

              <div>
                <div className="connection-title">
                  Google Calendar
                </div>

                <div className="connection-status">
                  <span
                    className={`status-dot ${
                      calendarConnected
                        ? 'connected'
                        : ''
                    }`}
                  />

                  {checkingConnection
                    ? 'Checking connection...'
                    : calendarConnected
                    ? 'Connected'
                    : 'Not connected'}
                </div>
              </div>
            </div>

            {!checkingConnection &&
              (
                calendarConnected ? (
                  <button
                    className="calendar-button danger"
                    onClick={
                      handleDisconnect
                    }
                    disabled={
                      disconnecting
                    }
                  >
                    {disconnecting
                      ? 'Disconnecting...'
                      : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    className="calendar-button primary"
                    onClick={
                      handleConnect
                    }
                    disabled={
                      connecting
                    }
                  >
                    {connecting
                      ? 'Connecting...'
                      : 'Connect Google Calendar'}
                  </button>
                )
              )}
          </div>

          {/* NOT CONNECTED */}

          {!calendarConnected ? (
            <div className="empty-state">

              <div className="empty-state-icon">
                📅
              </div>

              <div className="empty-state-title">
                Connect your Google Calendar
              </div>

              <p className="empty-state-text">
                Connect Google Calendar to view
                your events, check availability,
                and create new events directly
                from Employee Copilot.
              </p>

              <button
                className="calendar-button primary"
                onClick={
                  handleConnect
                }
                disabled={connecting}
              >
                {connecting
                  ? 'Connecting...'
                  : 'Connect Google Calendar'}
              </button>

            </div>
          ) : (
            <>
              {/* TOOLBAR */}

              <div className="calendar-toolbar">

                <div className="month-navigation">

                  <button
                    className="month-button"
                    onClick={
                      goToPreviousMonth
                    }
                  >
                    ‹
                  </button>

                  <button
                    className="month-button"
                    onClick={
                      goToNextMonth
                    }
                  >
                    ›
                  </button>

                  <div className="month-title">
                    {formatMonthTitle(
                      currentDate
                    )}
                  </div>

                </div>

                <button
                  className="calendar-button"
                  onClick={
                    loadEvents
                  }
                  disabled={loading}
                >
                  {loading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </button>

              </div>

              {/* CALENDAR */}

              {loading &&
              events.length === 0 ? (
                <div className="loading-state">
                  <div className="spinner" />
                  Loading your calendar...
                </div>
              ) : (
                <div className="calendar-grid">

                  {[
                    'Sun',
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat',
                  ].map(
                    (day) => (
                      <div
                        key={day}
                        className="weekday"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {calendarDays.map(
                    (day) => {
                      const dateKey =
                        formatDateKey(
                          day
                        );

                      const dayEvents =
                        eventsByDate[
                          dateKey
                        ] || [];

                      const isCurrentMonth =
                        day.getMonth() ===
                          currentDate.getMonth() &&
                        day.getFullYear() ===
                          currentDate.getFullYear();

                      const isToday =
                        formatDateKey(
                          new Date()
                        ) === dateKey;

                      return (
                        <div
                          key={dateKey}
                          className={`calendar-day ${
                            !isCurrentMonth
                              ? 'other-month'
                              : ''
                          } ${
                            isToday
                              ? 'today'
                              : ''
                          }`}
                          onClick={() =>
                            openCreateEventModal(
                              day
                            )
                          }
                        >
                          <div className="day-header">

                            <div
                              className={`day-number ${
                                isToday
                                  ? 'today'
                                  : ''
                              }`}
                            >
                              {day.getDate()}
                            </div>

                            <button
                              className="add-day"
                              onClick={(event) => {
                                event.stopPropagation();

                                openCreateEventModal(
                                  day
                                );
                              }}
                            >
                              +
                            </button>

                          </div>

                          <div className="event-list">

                            {dayEvents
                              .slice(0, 4)
                              .map(
                                (calendarEvent) => (
                                  <button
                                    key={
                                      calendarEvent.id
                                    }
                                    className="calendar-event"
                                    onClick={(event) =>
                                      event.stopPropagation()
                                    }
                                    title={
                                      calendarEvent.summary ||
                                      'Untitled event'
                                    }
                                  >
                                    <div className="event-time">
                                      {formatEventTime(
                                        calendarEvent
                                      )}
                                    </div>

                                    <div className="event-title">
                                      {calendarEvent.summary ||
                                        'Untitled event'}
                                    </div>
                                  </button>
                                )
                              )}

                            {dayEvents.length >
                              4 && (
                              <div
                                style={{
                                  color:
                                    '#858da0',
                                  fontSize:
                                    '10px',
                                  padding:
                                    '2px 5px',
                                }}
                              >
                                +
                                {dayEvents.length -
                                  4}{' '}
                                more
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    }
                  )}

                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* CREATE EVENT MODAL */}

      {showEventModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEventModal();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">

              <h2 className="modal-title">
                Create Calendar Event
              </h2>

              <button
                className="close-button"
                onClick={
                  closeEventModal
                }
                disabled={
                  creatingEvent
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleCreateEvent
              }
            >
              <div className="modal-body">

                <div className="form-group">
                  <label className="form-label">
                    Event title *
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    value={
                      eventForm.summary
                    }
                    onChange={(event) =>
                      handleFormChange(
                        'summary',
                        event.target.value
                      )
                    }
                    placeholder="e.g. Team meeting"
                    autoFocus
                  />
                </div>

                <div className="form-row">

                  <div className="form-group">
                    <label className="form-label">
                      Start *
                    </label>

                    <input
                      className="form-input"
                      type="datetime-local"
                      value={
                        eventForm.start
                      }
                      onChange={(event) =>
                        handleFormChange(
                          'start',
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      End *
                    </label>

                    <input
                      className="form-input"
                      type="datetime-local"
                      value={
                        eventForm.end
                      }
                      onChange={(event) =>
                        handleFormChange(
                          'end',
                          event.target.value
                        )
                      }
                    />
                  </div>

                </div>

                <div className="form-group">
                  <label className="form-label">
                    Location
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    value={
                      eventForm.location
                    }
                    onChange={(event) =>
                      handleFormChange(
                        'location',
                        event.target.value
                      )
                    }
                    placeholder="Meeting room or video link"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Description
                  </label>

                  <textarea
                    className="form-input"
                    value={
                      eventForm.description
                    }
                    onChange={(event) =>
                      handleFormChange(
                        'description',
                        event.target.value
                      )
                    }
                    placeholder="Add event details..."
                  />
                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="calendar-button"
                  onClick={
                    closeEventModal
                  }
                  disabled={
                    creatingEvent
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="calendar-button primary"
                  disabled={
                    creatingEvent
                  }
                >
                  {creatingEvent
                    ? 'Creating...'
                    : 'Create Event'}
                </button>

              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeCalendar;