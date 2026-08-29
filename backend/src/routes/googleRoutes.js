import express from 'express';

import { authenticate } from '../middleware/auth.js';

import googleCalendarService from '../services/googleCalendarService.js';
import gmailService from '../services/gmailService.js';

const router = express.Router();

const FRONTEND_URL = 'http://localhost:5173';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getErrorCode(error) {
  return (
    error?.code ||
    error?.response?.data?.error ||
    null
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error_description ||
    error?.response?.data?.message ||
    error?.message ||
    ''
  );
}

function isPermissionError(error) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    getErrorCode(error) === 403 ||
    message.includes('insufficient permission') ||
    message.includes('insufficientpermissions') ||
    message.includes('permission')
  );
}

// ============================================================
// GMAIL OAUTH
// ============================================================

/**
 * GET /api/google/auth/url
 *
 * Gmail OAuth only.
 *
 * Gmail service is responsible for:
 * - Gmail OAuth scopes
 * - Gmail authorization URL
 * - Gmail token storage
 */
router.get(
  '/auth/url',
  authenticate,
  (req, res) => {
    try {
      const state = String(req.user.id);

      const authUrl =
        gmailService.getAuthUrl(state);

      console.log(
        '=========================================='
      );
      console.log(
        'Gmail OAuth URL generated'
      );
      console.log(
        'User ID:',
        req.user.id
      );
      console.log(
        'Redirect URI:',
        process.env.GOOGLE_GMAIL_REDIRECT_URI ||
          process.env.GOOGLE_REDIRECT_URI
      );
      console.log(
        '=========================================='
      );

      return res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      console.error(
        'Error generating Gmail auth URL:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to generate Gmail authorization URL',
      });
    }
  }
);

// ============================================================
// GMAIL OAUTH CALLBACK
// ============================================================

/**
 * GET /api/google/callback
 *
 * Gmail OAuth callback only.
 */
router.get(
  '/callback',
  async (req, res) => {
    try {
      const {
        code,
        state,
        error,
        error_description,
      } = req.query;

      console.log(
        '=========================================='
      );

      console.log(
        'Gmail OAuth callback received'
      );

      console.log(
        'Code exists:',
        Boolean(code)
      );

      console.log(
        'State:',
        state
      );

      console.log(
        'Error:',
        error
      );

      console.log(
        'Redirect URI:',
        process.env.GOOGLE_GMAIL_REDIRECT_URI ||
          process.env.GOOGLE_REDIRECT_URI
      );

      console.log(
        '=========================================='
      );

      // --------------------------------------------------------
      // GOOGLE RETURNED ERROR
      // --------------------------------------------------------

      if (error) {
        const description =
          error_description ||
          getGoogleOAuthErrorDescription(error);

        console.error(
          'Google Gmail OAuth error:',
          error,
          description
        );

        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=${encodeURIComponent(
            error
          )}&error_description=${encodeURIComponent(
            description
          )}`
        );
      }

      // --------------------------------------------------------
      // MISSING CODE
      // --------------------------------------------------------

      if (!code) {
        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=missing_code&error_description=${encodeURIComponent(
            'Authorization code is missing from the Google response.'
          )}`
        );
      }

      // --------------------------------------------------------
      // MISSING STATE
      // --------------------------------------------------------

      if (!state) {
        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=missing_state&error_description=${encodeURIComponent(
            'OAuth state parameter is missing. Please try again.'
          )}`
        );
      }

      // --------------------------------------------------------
      // EXCHANGE GMAIL CODE
      // --------------------------------------------------------

      const tokens =
        await gmailService.exchangeCodeForTokens(
          code,
          state
        );

      console.log(
        '=========================================='
      );

      console.log(
        'Gmail authorization successful'
      );

      console.log(
        'User ID:',
        state
      );

      console.log(
        'OAuth scopes received:',
        tokens?.scope || 'Not returned'
      );

      console.log(
        'Gmail readonly scope:',
        tokens?.scope?.includes(
          'gmail.readonly'
        )
          ? 'YES'
          : 'NO'
      );

      console.log(
        'Gmail send scope:',
        tokens?.scope?.includes(
          'gmail.send'
        )
          ? 'YES'
          : 'NO'
      );

      console.log(
        'Calendar scope:',
        tokens?.scope?.includes(
          'calendar'
        )
          ? 'YES'
          : 'NO'
      );

      console.log(
        '=========================================='
      );

      return res.redirect(
        `${FRONTEND_URL}/gmail?google_connected=true`
      );
    } catch (error) {
      console.error(
        'Error handling Gmail OAuth callback:',
        error
      );

      const errorText =
        getErrorMessage(error).toLowerCase();

      let errorMessage =
        'callback_failed';

      let errorDescription =
        'Failed to complete Gmail authorization. Please try again.';

      if (
        errorText.includes('access blocked')
      ) {
        errorMessage =
          'access_blocked';

        errorDescription =
          'Your Google account is not configured as a test user for this application. Add your Google email to the Google Cloud Console test users list.';
      } else if (
        errorText.includes(
          'redirect_uri_mismatch'
        )
      ) {
        errorMessage =
          'redirect_uri_mismatch';

        errorDescription =
          'The Gmail redirect URI does not match the Google OAuth configuration.';
      } else if (
        errorText.includes('invalid_grant')
      ) {
        errorMessage =
          'invalid_grant';

        errorDescription =
          'The Google authorization code is invalid or expired. Please reconnect Gmail.';
      }

      return res.redirect(
        `${FRONTEND_URL}/gmail?google_error=${encodeURIComponent(
          errorMessage
        )}&error_description=${encodeURIComponent(
          errorDescription
        )}`
      );
    }
  }
);

// ============================================================
// LEGACY GMAIL POST CALLBACK
// ============================================================

router.post(
  '/auth/callback',
  authenticate,
  async (req, res) => {
    try {
      const {
        code,
        state,
      } = req.body;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error:
            'Code and state are required',
        });
      }

      const tokens =
        await gmailService.exchangeCodeForTokens(
          code,
          state
        );

      return res.json({
        success: true,
        message:
          'Gmail connected successfully',
        scopes:
          tokens?.scope || null,
      });
    } catch (error) {
      console.error(
        'Error handling Gmail OAuth POST callback:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to connect Gmail',
      });
    }
  }
);

// ============================================================
// GMAIL CONNECTION STATUS
// ============================================================

router.get(
  '/auth/status',
  authenticate,
  async (req, res) => {
    try {
      const tokens =
        await gmailService.getTokens(
          req.user.id
        );

      return res.json({
        success: true,
        connected:
          Boolean(tokens),
        scopes:
          tokens?.scope || null,
      });
    } catch (error) {
      console.error(
        'Error checking Gmail connection:',
        error
      );

      return res.status(500).json({
        success: false,
        connected: false,
        error:
          'Failed to check Gmail connection',
      });
    }
  }
);

// ============================================================
// CALENDAR OAUTH
// ============================================================

/**
 * GET /api/google/calendar/auth/url
 *
 * Calendar OAuth ONLY.
 *
 * IMPORTANT:
 * This must use googleCalendarService.
 *
 * Gmail service must never generate the Calendar
 * authorization URL.
 */
router.get(
  '/calendar/auth/url',
  authenticate,
  (req, res) => {
    try {
      const state =
        googleCalendarService.createOAuthState(
          req.user.id
        );

      const authUrl =
        googleCalendarService.getAuthUrl(
          state
        );

      console.log(
        '=========================================='
      );

      console.log(
        'Google Calendar OAuth URL generated'
      );

      console.log(
        'User ID:',
        req.user.id
      );

      console.log(
        'Redirect URI:',
        process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
          'http://localhost:3001/api/google/calendar/callback'
      );

      console.log(
        '=========================================='
      );

      return res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      console.error(
        'Error generating Google Calendar auth URL:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to generate Google Calendar authorization URL',
      });
    }
  }
);

// ============================================================
// CALENDAR OAUTH CALLBACK
// ============================================================

/**
 * GET /api/google/calendar/callback
 *
 * Calendar OAuth callback ONLY.
 *
 * Calendar tokens are stored by:
 *
 * googleCalendarService
 *
 * GmailService is NOT involved here.
 */
router.get(
  '/calendar/callback',
  async (req, res) => {
    try {
      const {
        code,
        state,
        error,
        error_description,
      } = req.query;

      console.log(
        '=========================================='
      );

      console.log(
        'Google Calendar OAuth callback received'
      );

      console.log(
        'Code exists:',
        Boolean(code)
      );

      console.log(
        'State:',
        state
      );

      console.log(
        'Error:',
        error
      );

      console.log(
        '=========================================='
      );

      // --------------------------------------------------------
      // GOOGLE RETURNED ERROR
      // --------------------------------------------------------

      if (error) {
        const description =
          error_description ||
          getGoogleOAuthErrorDescription(error);

        console.error(
          'Google Calendar OAuth error:',
          error,
          description
        );

        return res.redirect(
          `${FRONTEND_URL}/calendar?google_error=${encodeURIComponent(
            error
          )}&error_description=${encodeURIComponent(
            description
          )}`
        );
      }

      // --------------------------------------------------------
      // MISSING CODE
      // --------------------------------------------------------

      if (!code) {
        return res.redirect(
          `${FRONTEND_URL}/calendar?google_error=missing_code&error_description=${encodeURIComponent(
            'Authorization code is missing from the Google response.'
          )}`
        );
      }

      // --------------------------------------------------------
      // MISSING STATE
      // --------------------------------------------------------

      if (!state) {
        return res.redirect(
          `${FRONTEND_URL}/calendar?google_error=missing_state&error_description=${encodeURIComponent(
            'OAuth state parameter is missing. Please try again.'
          )}`
        );
      }

      // --------------------------------------------------------
      // VERIFY STATE
      // --------------------------------------------------------

      const userId =
        googleCalendarService.verifyOAuthState(
          state
        );

      if (!userId) {
        return res.redirect(
          `${FRONTEND_URL}/calendar?google_error=invalid_state&error_description=${encodeURIComponent(
            'Invalid or expired Calendar OAuth state. Please try again.'
          )}`
        );
      }

      // --------------------------------------------------------
      // EXCHANGE CALENDAR CODE
      // --------------------------------------------------------

      const tokens =
        await googleCalendarService.exchangeCodeForTokens(
          code,
          userId
        );

      console.log(
        '=========================================='
      );

      console.log(
        'Google Calendar authorization successful'
      );

      console.log(
        'User ID:',
        userId
      );

      console.log(
        'OAuth scopes received:',
        tokens?.scope || 'Not returned'
      );

      console.log(
        'Calendar scope:',
        tokens?.scope?.includes(
          'calendar'
        )
          ? 'YES'
          : 'NO'
      );

      console.log(
        'Gmail scope:',
        tokens?.scope?.includes(
          'gmail'
        )
          ? 'YES'
          : 'NO'
      );

      console.log(
        '=========================================='
      );

      return res.redirect(
        `${FRONTEND_URL}/calendar?google_connected=true`
      );
    } catch (error) {
      console.error(
        'Google Calendar OAuth callback error:',
        error
      );

      const errorText =
        getErrorMessage(error).toLowerCase();

      let errorMessage =
        'calendar_callback_failed';

      let errorDescription =
        error?.message ||
        'Failed to complete Google Calendar authorization. Please try again.';

      if (
        errorText.includes(
          'access blocked'
        )
      ) {
        errorMessage =
          'access_blocked';

        errorDescription =
          'Your Google account is not configured as a test user for this application. Add your Google email to the Google Cloud Console test users list.';
      } else if (
        errorText.includes(
          'redirect_uri_mismatch'
        )
      ) {
        errorMessage =
          'redirect_uri_mismatch';

        errorDescription =
          'The Calendar redirect URI does not match the Google OAuth configuration.';
      } else if (
        errorText.includes(
          'invalid_grant'
        )
      ) {
        errorMessage =
          'invalid_grant';

        errorDescription =
          'The Google authorization code is invalid or expired. Please reconnect Google Calendar.';
      }

      return res.redirect(
        `${FRONTEND_URL}/calendar?google_error=${encodeURIComponent(
          errorMessage
        )}&error_description=${encodeURIComponent(
          errorDescription
        )}`
      );
    }
  }
);

// ============================================================
// CALENDAR CONNECTION STATUS
// ============================================================

router.get(
  '/calendar/status',
  authenticate,
  async (req, res) => {
    try {
      const connected =
        await googleCalendarService.isConnected(
          req.user.id
        );

      return res.json({
        success: true,
        connected,
      });
    } catch (error) {
      console.error(
        'Error checking Google Calendar connection:',
        error
      );

      return res.status(500).json({
        success: false,
        connected: false,
        error:
          'Failed to check Google Calendar connection',
      });
    }
  }
);

// ============================================================
// CALENDAR REVOKE
// ============================================================

router.delete(
  '/calendar/revoke',
  authenticate,
  async (req, res) => {
    try {
      await googleCalendarService.revokeTokens(
        req.user.id
      );

      return res.json({
        success: true,
        message:
          'Google Calendar disconnected successfully',
      });
    } catch (error) {
      console.error(
        'Error revoking Google Calendar:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to disconnect Google Calendar',
      });
    }
  }
);

// ============================================================
// CALENDAR CONFLICTS
// ============================================================

router.get(
  '/calendar/conflicts',
  authenticate,
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
      } = req.query;

      if (
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Start date and end date are required',
        });
      }

      const conflicts =
        await googleCalendarService.checkConflicts(
          req.user.id,
          startDate,
          endDate
        );

      return res.json({
        success: true,
        ...conflicts,
      });
    } catch (error) {
      console.error(
        'Error checking calendar conflicts:',
        error
      );

      const errorCode =
        getErrorCode(error);

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_NOT_CONNECTED',
          error:
            'Google Calendar is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_RECONNECT_REQUIRED',
          error:
            'Google Calendar authorization has expired. Please reconnect.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          'Failed to check calendar conflicts',
      });
    }
  }
);

// ============================================================
// GET CALENDAR EVENTS
// ============================================================

router.get(
  '/calendar/events',
  authenticate,
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
      } = req.query;

      if (
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Start date and end date are required',
        });
      }

      const events =
        await googleCalendarService.getEvents(
          req.user.id,
          startDate,
          endDate
        );

      return res.json({
        success: true,
        events,
      });
    } catch (error) {
      console.error(
        'Error getting calendar events:',
        error
      );

      const errorCode =
        getErrorCode(error);

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_NOT_CONNECTED',
          error:
            'Google Calendar is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_RECONNECT_REQUIRED',
          error:
            'Google Calendar authorization has expired. Please reconnect.',
        });
      }

      if (isPermissionError(error)) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_PERMISSION_REQUIRED',
          error:
            'Google Calendar permission is missing. Please reconnect your Google Calendar.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          'Failed to get calendar events',
      });
    }
  }
);

// ============================================================
// CREATE CALENDAR EVENT
// ============================================================

router.post(
  '/calendar/events',
  authenticate,
  async (req, res) => {
    try {
      const eventData =
        req.body;

      if (
        !eventData ||
        typeof eventData !== 'object'
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Calendar event data is required',
        });
      }

      const event =
        await googleCalendarService.createEvent(
          req.user.id,
          eventData
        );

      return res.json({
        success: true,
        event,
      });
    } catch (error) {
      console.error(
        'Error creating calendar event:',
        error
      );

      const errorCode =
        getErrorCode(error);

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_NOT_CONNECTED',
          error:
            'Google Calendar is not connected.',
        });
      }

      if (isPermissionError(error)) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_PERMISSION_REQUIRED',
          error:
            'Google Calendar permission is missing. Please reconnect your Google Calendar.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          'Failed to create calendar event',
      });
    }
  }
);

// ============================================================
// GMAIL - SEND EMAIL
// ============================================================

router.post(
  '/gmail/send',
  authenticate,
  async (req, res) => {
    try {
      const {
        to,
        subject,
        body,
        isHtml,
      } = req.body;

      if (
        !to ||
        !subject ||
        !body
      ) {
        return res.status(400).json({
          success: false,
          error:
            'To, subject, and body are required',
        });
      }

      const result =
        await gmailService.sendEmail(
          req.user.id,
          to,
          subject,
          body,
          Boolean(isHtml)
        );

      return res.json({
        success: true,
        message:
          'Email sent successfully',
        result,
      });
    } catch (error) {
      console.error(
        'Error sending email:',
        error
      );

      const errorCode =
        getErrorCode(error);

      if (
        errorCode === 403 ||
        isPermissionError(error)
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_GMAIL_PERMISSION_REQUIRED',
          error:
            'Gmail permission is missing. Please reconnect Gmail and grant Gmail permissions.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_NOT_CONNECTED',
          error:
            'Gmail is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_RECONNECT_REQUIRED',
          error:
            'Gmail authorization has expired. Please reconnect Gmail.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          'Failed to send email',
      });
    }
  }
);

// ============================================================
// GMAIL - GET RECENT EMAILS
// ============================================================

router.get(
  '/gmail/recent',
  authenticate,
  async (req, res) => {
    try {
      const maxResults =
        parseInt(
          req.query.maxResults,
          10
        ) || 10;

      const emails =
        await gmailService.getRecentEmails(
          req.user.id,
          maxResults
        );

      return res.json({
        success: true,
        emails,
      });
    } catch (error) {
      console.error(
        'Error getting recent emails:',
        error
      );

      const errorCode =
        getErrorCode(error);

      const errorReason =
        getErrorMessage(error);

      // --------------------------------------------------------
      // GMAIL PERMISSION
      // --------------------------------------------------------

      if (
        errorCode === 403 ||
        errorReason
          .toLowerCase()
          .includes(
            'insufficient permission'
          )
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_GMAIL_PERMISSION_REQUIRED',
          error:
            'Gmail permission is missing. Please reconnect Gmail and grant Gmail access.',
        });
      }

      // --------------------------------------------------------
      // NOT CONNECTED
      // --------------------------------------------------------

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_NOT_CONNECTED',
          error:
            'Gmail is not connected.',
        });
      }

      // --------------------------------------------------------
      // RECONNECT
      // --------------------------------------------------------

      if (
        errorCode ===
        'GOOGLE_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_RECONNECT_REQUIRED',
          error:
            'Gmail authorization has expired. Please reconnect Gmail.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          'Failed to get recent emails',
      });
    }
  }
);

// ============================================================
// GMAIL - GET EMAIL BY ID
// ============================================================

router.get(
  '/gmail/:messageId',
  authenticate,
  async (req, res) => {
    try {
      const {
        messageId,
      } = req.params;

      const email =
        await gmailService.getEmailById(
          req.user.id,
          messageId
        );

      return res.json({
        success: true,
        email,
      });
    } catch (error) {
      console.error(
        'Error getting email by ID:',
        error
      );

      const errorCode =
        getErrorCode(error);

      const errorReason =
        getErrorMessage(error);

      if (
        errorCode === 403 ||
        errorReason
          .toLowerCase()
          .includes(
            'insufficient permission'
          )
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_GMAIL_PERMISSION_REQUIRED',
          error:
            'Gmail permission is missing. Please reconnect Gmail.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_NOT_CONNECTED',
          error:
            'Gmail is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_RECONNECT_REQUIRED',
          error:
            'Gmail authorization has expired. Please reconnect Gmail.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          'Failed to get email',
      });
    }
  }
);

// ============================================================
// GMAIL REVOKE
// ============================================================

router.delete(
  '/auth/revoke',
  authenticate,
  async (req, res) => {
    try {
      await gmailService.revokeTokens(
        req.user.id
      );

      return res.json({
        success: true,
        message:
          'Gmail disconnected successfully',
      });
    } catch (error) {
      console.error(
        'Error revoking Gmail tokens:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to disconnect Gmail',
      });
    }
  }
);

// ============================================================
// GOOGLE OAUTH ERROR DESCRIPTION
// ============================================================

function getGoogleOAuthErrorDescription(
  error
) {
  switch (error) {
    case 'access_denied':
      return 'You denied access to Google. Please try again and grant the required permissions.';

    case 'invalid_request':
      return 'Invalid Google OAuth request. Please try again.';

    case 'unauthorized_client':
      return 'The application is not authorized. Please check your Google OAuth configuration.';

    case 'invalid_client':
      return 'The Google OAuth client configuration is invalid.';

    case 'redirect_uri_mismatch':
      return 'The redirect URI does not match the Google OAuth configuration.';

    case 'invalid_grant':
      return 'The Google authorization code is invalid or expired. Please reconnect.';

    default:
      return 'Google authorization failed. Please try again.';
  }
}

// ============================================================
// EXPORT ROUTER
// ============================================================

export default router;