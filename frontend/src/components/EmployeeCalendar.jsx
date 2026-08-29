import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { googleAPI } from '../services/api';

// ============================================================
// HELPERS
// ============================================================

const pad = (value) =>
  String(value).padStart(2, '0');

const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;

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
  const firstDay = getMonthStart(currentDate);
  const lastDay = getMonthEnd(currentDate);

  const start = new Date(firstDay);
  start.setDate(
    firstDay.getDate() - firstDay.getDay()
  );

  const end = new Date(lastDay);
  end.setDate(
    lastDay.getDate() +
      (6 - lastDay.getDay())
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
    const date = new Date(
      event.start.dateTime
    );

    return date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  }

  return '';
};

const getEventDateKey = (event) => {
  if (!event?.start) {
    return null;
  }

  if (event.start.date) {
    return event.start.date;
  }

  if (event.start.dateTime) {
    return formatDateKey(
      new Date(event.start.dateTime)
    );
  }

  return null;
};

const getInitialForm = () => {
  const now = new Date();

  const start = new Date(now);
  start.setMinutes(
    Math.ceil(start.getMinutes() / 30) * 30,
    0,
    0
  );

  const end = new Date(start);
  end.setHours(
    end.getHours() + 1
  );

  const toDateTimeLocal = (date) =>
    `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;

  return {
    summary: '',
    description: '',
    location: '',
    start: toDateTimeLocal(start),
    end: toDateTimeLocal(end),
  };
};

// ============================================================
// COMPONENT
// ============================================================

function EmployeeCalendar() {
  // ----------------------------------------------------------
  // CALENDAR STATE
  // ----------------------------------------------------------

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [events, setEvents] = useState(
    []
  );

  // ----------------------------------------------------------
  // CONNECTION STATE
  // ----------------------------------------------------------

  const [
    calendarConnected,
    setCalendarConnected,
  ] = useState(false);

  const [
    checkingConnection,
    setCheckingConnection,
  ] = useState(true);

  const [
    connecting,
    setConnecting,
  ] = useState(false);

  const [
    disconnecting,
    setDisconnecting,
  ] = useState(false);

  // ----------------------------------------------------------
  // LOADING / ERROR
  // ----------------------------------------------------------

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  // ----------------------------------------------------------
  // EVENT MODAL
  // ----------------------------------------------------------

  const [showEventModal, setShowEventModal] =
    useState(false);

  const [creatingEvent, setCreatingEvent] =
    useState(false);

  const [eventForm, setEventForm] =
    useState(getInitialForm());

  // ----------------------------------------------------------
  // SELECTED DAY
  // ----------------------------------------------------------

  const [selectedDate, setSelectedDate] =
    useState(null);

  // ==========================================================
  // CALENDAR GRID
  // ==========================================================

  const calendarDays = useMemo(
    () =>
      getCalendarGrid(
        currentDate
      ),
    [currentDate]
  );

  // ==========================================================
  // MONTH RANGE
  // ==========================================================

  const monthRange = useMemo(() => {
    const start = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    const end = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    return {
      start,
      end,
    };
  }, [currentDate]);

  // ==========================================================
  // CHECK GOOGLE CALENDAR CONNECTION
  // ==========================================================

  const checkConnection = useCallback(
    async () => {
      try {
        setCheckingConnection(true);
        setError('');

        const response =
          await googleAPI.getCalendarStatus();

        setCalendarConnected(
          Boolean(response?.connected)
        );
      } catch (err) {
        console.error(
          'Calendar connection check failed:',
          err
        );

        setCalendarConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    },
    []
  );

  // ==========================================================
  // LOAD EVENTS
  // ==========================================================

  const loadEvents = useCallback(
    async () => {
      if (!calendarConnected) {
        setEvents([]);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const start =
          monthRange.start;

        const end =
          monthRange.end;

        const response =
          await googleAPI.getCalendarEvents(
            formatDateKey(start),
            formatDateKey(end)
          );

        setEvents(
          Array.isArray(response?.events)
            ? response.events
            : []
        );
      } catch (err) {
        console.error(
          'Failed to load calendar events:',
          err
        );

        const errorCode =
          err?.code;

        if (
          errorCode ===
            'GOOGLE_CALENDAR_NOT_CONNECTED' ||
          errorCode ===
            'GOOGLE_NOT_CONNECTED'
        ) {
          setCalendarConnected(
            false
          );

          setEvents([]);

          setError(
            'Google Calendar is not connected.'
          );
        } else if (
          errorCode ===
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED' ||
          errorCode ===
            'GOOGLE_RECONNECT_REQUIRED'
        ) {
          setCalendarConnected(
            false
          );

          setEvents([]);

          setError(
            'Google Calendar authorization has expired. Please reconnect your Google Calendar.'
          );
        } else {
          setError(
            err?.error ||
              err?.message ||
              'Failed to load calendar events.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [
      calendarConnected,
      monthRange,
    ]
  );

  // ==========================================================
  // INITIAL CONNECTION CHECK
  // ==========================================================

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // ==========================================================
  // LOAD EVENTS WHEN CONNECTED / MONTH CHANGES
  // ==========================================================

  useEffect(() => {
    if (calendarConnected) {
      loadEvents();
    }
  }, [
    calendarConnected,
    loadEvents,
  ]);

  // ==========================================================
  // HANDLE GOOGLE CALENDAR CONNECT
  // ==========================================================

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError('');
      setSuccessMessage('');

      const response =
        await googleAPI.getCalendarAuthUrl();

      if (!response?.authUrl) {
        throw new Error(
          'Google Calendar authorization URL was not returned.'
        );
      }

      window.location.href =
        response.authUrl;
    } catch (err) {
      console.error(
        'Google Calendar connection failed:',
        err
      );

      setError(
        err?.error ||
          err?.message ||
          'Failed to connect Google Calendar.'
      );

      setConnecting(false);
    }
  };

  // ==========================================================
  // HANDLE GOOGLE CALENDAR DISCONNECT
  // ==========================================================

  const handleDisconnect = async () => {
    const confirmed =
      window.confirm(
        'Disconnect Google Calendar from Employee Copilot?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setDisconnecting(true);
      setError('');
      setSuccessMessage('');

      await googleAPI.revokeCalendarTokens();

      setCalendarConnected(false);
      setEvents([]);

      setSuccessMessage(
        'Google Calendar disconnected successfully.'
      );
    } catch (err) {
      console.error(
        'Failed to disconnect Google Calendar:',
        err
      );

      setError(
        err?.error ||
          err?.message ||
          'Failed to disconnect Google Calendar.'
      );
    } finally {
      setDisconnecting(false);
    }
  };

  // ==========================================================
  // URL CALLBACK RESULT
  // ==========================================================

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

    if (connected === 'true') {
      setCalendarConnected(true);

      setSuccessMessage(
        'Google Calendar connected successfully.'
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (googleError) {
      setError(
        errorDescription ||
          'Google Calendar connection failed.'
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const goToPreviousMonth = () => {
    setCurrentDate(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() - 1,
          1
        )
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() + 1,
          1
        )
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ==========================================================
  // EVENTS BY DATE
  // ==========================================================

  const eventsByDate = useMemo(() => {
    const grouped = {};

    events.forEach((event) => {
      const dateKey =
        getEventDateKey(event);

      if (!dateKey) {
        return;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  // ==========================================================
  // OPEN CREATE EVENT MODAL
  // ==========================================================

  const openCreateEventModal = (
    date = null
  ) => {
    const form = getInitialForm();

    if (date) {
      const selected =
        new Date(date);

      const start =
        new Date(selected);

      start.setHours(
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

      const toDateTimeLocal = (
        value
      ) =>
        `${value.getFullYear()}-${pad(
          value.getMonth() + 1
        )}-${pad(
          value.getDate()
        )}T${pad(
          value.getHours()
        )}:${pad(
          value.getMinutes()
        )}`;

      form.start =
        toDateTimeLocal(start);

      form.end =
        toDateTimeLocal(end);

      setSelectedDate(date);
    }

    setEventForm(form);
    setShowEventModal(true);
    setError('');
    setSuccessMessage('');
  };

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const closeEventModal = () => {
    if (creatingEvent) {
      return;
    }

    setShowEventModal(false);
    setEventForm(
      getInitialForm()
    );
    setSelectedDate(null);
  };

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleFormChange = (
    field,
    value
  ) => {
    setEventForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  // ==========================================================
  // CREATE CALENDAR EVENT
  // ==========================================================

  const handleCreateEvent = async (
    event
  ) => {
    event.preventDefault();

    if (!eventForm.summary.trim()) {
      setError(
        'Event title is required.'
      );

      return;
    }

    if (
      !eventForm.start ||
      !eventForm.end
    ) {
      setError(
        'Start and end time are required.'
      );

      return;
    }

    const startDate =
      new Date(eventForm.start);

    const endDate =
      new Date(eventForm.end);

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      setError(
        'Please enter valid dates and times.'
      );

      return;
    }

    if (
      endDate <= startDate
    ) {
      setError(
        'End time must be after the start time.'
      );

      return;
    }

    try {
      setCreatingEvent(true);
      setError('');
      setSuccessMessage('');

      const eventData = {
        summary:
          eventForm.summary.trim(),

        description:
          eventForm.description.trim() ||
          undefined,

        location:
          eventForm.location.trim() ||
          undefined,

        start: {
          dateTime:
            startDate.toISOString(),
        },

        end: {
          dateTime:
            endDate.toISOString(),
        },
      };

      await googleAPI.createCalendarEvent(
        eventData
      );

      setShowEventModal(false);

      setEventForm(
        getInitialForm()
      );

      setSuccessMessage(
        'Calendar event created successfully.'
      );

      await loadEvents();
    } catch (err) {
      console.error(
        'Failed to create calendar event:',
        err
      );

      const errorCode =
        err?.code;

      if (
        errorCode ===
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
      ) {
        setCalendarConnected(false);

        setError(
          'Google Calendar authorization has expired. Please reconnect.'
        );
      } else {
        setError(
          err?.error ||
            err?.message ||
            'Failed to create calendar event.'
        );
      }
    } finally {
      setCreatingEvent(false);
    }
  };

  // ==========================================================
  // CLEAR NOTIFICATIONS
  // ==========================================================

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="calendar-page">
      <style>{`
        .calendar-page {
          min-height: 100%;
          width: 100%;
          padding: 28px;
          color: #f5f7fb;
          background:
            radial-gradient(
              circle at top right,
              rgba(99, 102, 241, 0.12),
              transparent 30%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(56, 189, 248, 0.06),
              transparent 28%
            );
          box-sizing: border-box;
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

        .calendar-title-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .calendar-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .calendar-subtitle {
          margin: 0;
          color: #8d96a8;
          font-size: 14px;
        }

        .calendar-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .calendar-button {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.045);
          color: #f5f7fb;
          border-radius: 10px;
          padding: 10px 15px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .calendar-button:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
        }

        .calendar-button.primary {
          background: linear-gradient(
            135deg,
            #6366f1,
            #7c3aed
          );
          border-color: transparent;
        }

        .calendar-button.primary:hover {
          transform: translateY(-1px);
          box-shadow:
            0 8px 24px rgba(99,102,241,0.25);
        }

        .calendar-button.danger {
          color: #ff8d9b;
        }

        .calendar-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .notification {
          padding: 12px 15px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 13px;
          border: 1px solid;
        }

        .notification.error {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.22);
          color: #ff9da7;
        }

        .notification.success {
          background: rgba(34,197,94,0.08);
          border-color: rgba(34,197,94,0.20);
          color: #83e6a2;
        }

        .calendar-card {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(17, 20, 29, 0.72);
          backdrop-filter: blur(18px);
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 20px 70px rgba(0,0,0,0.20);
        }

        .connection-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .connection-left {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .google-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 18px;
        }

        .connection-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 3px;
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
            0 0 10px rgba(74,222,128,0.55);
        }

        .calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .month-navigation {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .month-button {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: #dce1ea;
          cursor: pointer;
          font-size: 17px;
        }

        .month-button:hover {
          background: rgba(255,255,255,0.08);
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
            repeat(7, minmax(0, 1fr));
        }

        .weekday {
          padding: 13px 12px;
          color: #777f91;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .calendar-day {
          min-height: 130px;
          padding: 10px;
          border-right: 1px solid rgba(255,255,255,0.055);
          border-bottom: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.008);
          cursor: pointer;
          transition: background 0.15s ease;
          box-sizing: border-box;
        }

        .calendar-day:nth-child(7n) {
          border-right: none;
        }

        .calendar-day:hover {
          background: rgba(255,255,255,0.035);
        }

        .calendar-day.other-month {
          opacity: 0.42;
        }

        .calendar-day.today {
          background:
            linear-gradient(
              180deg,
              rgba(99,102,241,0.09),
              rgba(255,255,255,0.008)
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
            0 4px 15px rgba(99,102,241,0.32);
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
          padding: 5px 7px;
          border: 1px solid rgba(99,102,241,0.18);
          border-left: 3px solid #6366f1;
          border-radius: 5px;
          background: rgba(99,102,241,0.10);
          color: #dfe3ff;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          box-sizing: border-box;
        }

        .calendar-event:hover {
          background: rgba(99,102,241,0.18);
        }

        .event-time {
          font-size: 9px;
          color: #9ea7c5;
          margin-bottom: 2px;
        }

        .event-title {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 11px;
          font-weight: 600;
        }

        .empty-state {
          padding: 70px 20px;
          text-align: center;
          color: #858d9e;
        }

        .empty-state-icon {
          font-size: 40px;
          margin-bottom: 12px;
          opacity: 0.65;
        }

        .empty-state-title {
          color: #dce1ea;
          font-size: 17px;
          font-weight: 650;
          margin-bottom: 7px;
        }

        .empty-state-text {
          max-width: 430px;
          margin: 0 auto 20px;
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
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.10);
          border-top-color: #6366f1;
          animation: calendar-spin 0.8s linear infinite;
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
          background: rgba(0,0,0,0.62);
          backdrop-filter: blur(7px);
        }

        .modal {
          width: 100%;
          max-width: 530px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: #151821;
          box-shadow:
            0 30px 100px rgba(0,0,0,0.45);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
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
          background: rgba(255,255,255,0.05);
          color: #a7afbf;
          cursor: pointer;
          font-size: 18px;
        }

        .close-button:hover {
          background: rgba(255,255,255,0.09);
          color: white;
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
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 9px;
          padding: 11px 12px;
          outline: none;
          background: rgba(255,255,255,0.045);
          color: #f5f7fb;
          font-size: 13px;
        }

        .form-input:focus {
          border-color: rgba(99,102,241,0.7);
          box-shadow:
            0 0 0 3px rgba(99,102,241,0.10);
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
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        @media (max-width: 900px) {
          .calendar-page {
            padding: 18px;
          }

          .calendar-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .calendar-header-actions {
            width: 100%;
          }

          .calendar-header-actions .calendar-button {
            flex: 1;
          }

          .calendar-day {
            min-height: 105px;
            padding: 7px;
          }

          .calendar-event {
            padding: 4px 5px;
          }
        }

        @media (max-width: 650px) {
          .calendar-page {
            padding: 10px;
          }

          .calendar-toolbar {
            padding: 13px;
          }

          .month-title {
            min-width: auto;
            font-size: 15px;
          }

          .weekday {
            padding: 9px 5px;
            font-size: 9px;
          }

          .calendar-day {
            min-height: 85px;
            padding: 5px;
          }

          .day-number {
            width: 23px;
            height: 23px;
            font-size: 10px;
          }

          .event-title {
            font-size: 9px;
          }

          .event-time {
            display: none;
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

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="calendar-header">
          <div className="calendar-title-section">
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

        {/* ================================================== */}
        {/* NOTIFICATIONS */}
        {/* ================================================== */}

        {error && (
          <div
            className="notification error"
            onClick={clearMessages}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="notification success"
            onClick={clearMessages}
          >
            {successMessage}
          </div>
        )}

        {/* ================================================== */}
        {/* CALENDAR CARD */}
        {/* ================================================== */}

        <div className="calendar-card">

          {/* ================================================ */}
          {/* GOOGLE CONNECTION */}
          {/* ================================================ */}

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
              (calendarConnected ? (
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
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting
                    ? 'Connecting...'
                    : 'Connect Google Calendar'}
                </button>
              ))}
          </div>

          {/* ================================================ */}
          {/* CALENDAR CONTENT */}
          {/* ================================================ */}

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
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting
                  ? 'Connecting...'
                  : 'Connect Google Calendar'}
              </button>
            </div>
          ) : (
            <>
              {/* ============================================ */}
              {/* MONTH TOOLBAR */}
              {/* ============================================ */}

              <div className="calendar-toolbar">

                <div className="month-navigation">

                  <button
                    className="month-button"
                    onClick={
                      goToPreviousMonth
                    }
                    aria-label="Previous month"
                  >
                    ‹
                  </button>

                  <button
                    className="month-button"
                    onClick={
                      goToNextMonth
                    }
                    aria-label="Next month"
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
                  onClick={loadEvents}
                  disabled={loading}
                >
                  {loading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </button>
              </div>

              {/* ============================================ */}
              {/* CALENDAR */}
              {/* ============================================ */}

              {loading &&
              events.length === 0 ? (
                <div className="loading-state">
                  <div className="spinner" />
                  Loading your calendar...
                </div>
              ) : (
                <div className="calendar-grid">

                  {/* WEEKDAYS */}

                  {[
                    'Sun',
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat',
                  ].map((day) => (
                    <div
                      key={day}
                      className="weekday"
                    >
                      {day}
                    </div>
                  ))}

                  {/* DAYS */}

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

                      const today =
                        new Date();

                      const isToday =
                        formatDateKey(
                          today
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
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openCreateEventModal(
                                  day
                                );
                              }}
                              aria-label="Add event"
                            >
                              +
                            </button>
                          </div>

                          <div className="event-list">

                            {dayEvents
                              .slice(0, 4)
                              .map(
                                (
                                  calendarEvent
                                ) => (
                                  <button
                                    key={
                                      calendarEvent.id
                                    }
                                    className="calendar-event"
                                    onClick={(
                                      event
                                    ) =>
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

      {/* ==================================================== */}
      {/* CREATE EVENT MODAL */}
      {/* ==================================================== */}

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