import express from 'express';

import { authenticate } from '../middleware/auth.js';
import { config } from '../config/index.js';

import googleCalendarService from '../services/googleCalendarService.js';
import gmailService from '../services/gmailService.js';

const router =
  express.Router();

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

// ============================================================
// ERROR HELPERS
// ============================================================

function getErrorCode(error) {
  return (
    error?.code ||
    error?.response?.data?.error ||
    error?.response?.status ||
    null
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data
      ?.error_description ||
    error?.response?.data
      ?.message ||
    error?.message ||
    ''
  );
}

function isPermissionError(error) {
  const message =
    getErrorMessage(
      error
    ).toLowerCase();

  const code =
    getErrorCode(error);

  return (
    code === 403 ||
    message.includes(
      'insufficient permission'
    ) ||
    message.includes(
      'insufficientpermissions'
    ) ||
    message.includes(
      'permission'
    )
  );
}

// ============================================================
// GOOGLE OAUTH ERROR DESCRIPTION
// ============================================================

function getGoogleOAuthErrorDescription(
  error
) {
  switch (error) {
    case 'access_denied':
      return (
        'You denied access to Google. Please try again and grant the required permissions.'
      );

    case 'invalid_request':
      return (
        'Invalid Google OAuth request. Please try again.'
      );

    case 'unauthorized_client':
      return (
        'The application is not authorized. Please check your Google OAuth configuration.'
      );

    case 'invalid_client':
      return (
        'The Google OAuth client configuration is invalid.'
      );

    case 'redirect_uri_mismatch':
      return (
        'The redirect URI does not match the Google OAuth configuration.'
      );

    case 'invalid_grant':
      return (
        'The Google authorization code is invalid or expired. Please reconnect.'
      );

    default:
      return (
        'Google authorization failed. Please try again.'
      );
  }
}

// ============================================================
// GMAIL OAUTH URL
// ============================================================

router.get(
  '/auth/url',
  authenticate,
  (req, res) => {
    try {
      const state =
        gmailService.createOAuthState(
          req.user.id
        );

      const authUrl =
        gmailService.getAuthUrl(
          state
        );

      console.log(
        '=========================================='
      );

      console.log(
        'GMAIL OAUTH URL GENERATION'
      );
      console.log(
        '=========================================='
      );

      console.log(
        'User ID:',
        req.user.id
      );

      console.log(
        'Gmail Redirect URI from config:',
        config.googleGmailRedirectUri
      );

      console.log(
        'Full Gmail Redirect URI:',
        config.googleGmailRedirectUri
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

      return res.status(500).json(
        {
          success: false,
          error:
            'Failed to generate Gmail authorization URL',
        }
      );
    }
  }
);

// ============================================================
// GMAIL OAUTH CALLBACK
// ============================================================

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
        'GMAIL OAUTH CALLBACK RECEIVED'
      );
      console.log(
        '=========================================='
      );

      console.log(
        'Request URL:',
        req.originalUrl
      );

      console.log(
        'Request path:',
        req.path
      );

      console.log(
        'Code exists:',
        Boolean(code)
      );

      console.log(
        'State exists:',
        Boolean(state)
      );

      console.log(
        'Google error:',
        error
      );

      console.log(
        'Gmail Redirect URI from config:',
        config.googleGmailRedirectUri
      );

      console.log(
        '=========================================='
      );

      if (error) {
        const description =
          error_description ||
          getGoogleOAuthErrorDescription(
            error
          );

        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=${encodeURIComponent(
            error
          )}&error_description=${encodeURIComponent(
            description
          )}`
        );
      }

      if (!code) {
        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=missing_code&error_description=${encodeURIComponent(
            'Authorization code is missing from the Google response.'
          )}`
        );
      }

      if (!state) {
        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=missing_state&error_description=${encodeURIComponent(
            'OAuth state parameter is missing. Please try again.'
          )}`
        );
      }

      const userId =
        gmailService.verifyOAuthState(
          state
        );

      if (!userId) {
        return res.redirect(
          `${FRONTEND_URL}/gmail?google_error=invalid_state&error_description=${encodeURIComponent(
            'Invalid or expired Gmail OAuth state. Please try again.'
          )}`
        );
      }

      const tokens =
        await gmailService.exchangeCodeForTokens(
          code,
          userId
        );

      console.log(
        '=========================================='
      );

      console.log(
        'Gmail authorization successful'
      );

      console.log(
        'User ID:',
        userId
      );

      console.log(
        'OAuth scopes:',
        tokens?.scope ||
          'Not returned'
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
        getErrorMessage(
          error
        ).toLowerCase();

      let errorMessage =
        'callback_failed';

      let errorDescription =
        'Failed to complete Gmail authorization. Please try again.';

      if (
        errorText.includes(
          'access blocked'
        )
      ) {
        errorMessage =
          'access_blocked';

        errorDescription =
          'Your Google account is not configured as a test user for this application.';
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
        errorText.includes(
          'invalid_grant'
        )
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
// GMAIL STATUS
// ============================================================

router.get(
  '/gmail/status',
  authenticate,
  async (req, res) => {
    try {
      const connected =
        await gmailService.isConnected(
          req.user.id
        );

      return res.json({
        success: true,
        connected,
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
// GMAIL REVOKE
// ============================================================

router.delete(
  '/gmail/revoke',
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
        'Error revoking Gmail:',
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
// CALENDAR OAUTH URL
// ============================================================

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
        'CALENDAR OAUTH URL GENERATION'
      );
      console.log(
        '=========================================='
      );

      console.log(
        'User ID:',
        req.user.id
      );

      console.log(
        'Calendar Redirect URI from config:',
        config.googleCalendarRedirectUri
      );

      console.log(
        'Full Calendar Redirect URI:',
        config.googleCalendarRedirectUri
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
        'CALENDAR OAUTH CALLBACK RECEIVED'
      );
      console.log(
        '=========================================='
      );

      console.log(
        'Request URL:',
        req.originalUrl
      );

      console.log(
        'Request path:',
        req.path
      );

      console.log(
        'Code exists:',
        Boolean(code)
      );

      console.log(
        'State exists:',
        Boolean(state)
      );

      console.log(
        'Google error:',
        error
      );

      console.log(
        'Calendar Redirect URI from config:',
        config.googleCalendarRedirectUri
      );

      console.log(
        'Full Calendar Redirect URI:',
        config.googleCalendarRedirectUri
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
          getGoogleOAuthErrorDescription(
            error
          );

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
      // EXCHANGE CODE
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
        tokens?.scope ||
          'Not returned'
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
        getErrorMessage(
          error
        ).toLowerCase();

      let errorMessage =
        'calendar_callback_failed';

      let errorDescription =
        'Failed to complete Google Calendar authorization. Please try again.';

      if (
        errorText.includes(
          'access blocked'
        )
      ) {
        errorMessage =
          'access_blocked';

        errorDescription =
          'Your Google account is not configured as a test user for this application.';
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
// CALENDAR STATUS
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
// CALENDAR EVENTS
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
        'GOOGLE_CALENDAR_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_NOT_CONNECTED',
          error:
            'Google Calendar is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
          error:
            'Google Calendar authorization has expired. Please reconnect.',
        });
      }

      if (
        isPermissionError(error)
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_PERMISSION_REQUIRED',
          error:
            'Google Calendar permission is missing. Please reconnect Google Calendar.',
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
        'GOOGLE_CALENDAR_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_NOT_CONNECTED',
          error:
            'Google Calendar is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
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
        typeof eventData !==
          'object'
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
        'GOOGLE_CALENDAR_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_NOT_CONNECTED',
          error:
            'Google Calendar is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
          error:
            'Google Calendar authorization has expired. Please reconnect.',
        });
      }

      if (
        isPermissionError(error)
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_CALENDAR_PERMISSION_REQUIRED',
          error:
            'Google Calendar permission is missing. Please reconnect Google Calendar.',
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
// GMAIL RECENT EMAILS
// ============================================================

router.get(
  '/gmail/recent',
  authenticate,
  async (req, res) => {
    try {
      const maxResults =
        Number(
          req.query.maxResults
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

      if (
        errorCode ===
        'GOOGLE_GMAIL_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_GMAIL_NOT_CONNECTED',
          error:
            'Gmail is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_GMAIL_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_GMAIL_RECONNECT_REQUIRED',
          error:
            'Gmail authorization has expired. Please reconnect Gmail.',
        });
      }

      if (
        isPermissionError(error)
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_GMAIL_PERMISSION_REQUIRED',
          error:
            'Gmail permission is missing. Please reconnect Gmail.',
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
// GMAIL GET EMAIL
// ============================================================

router.get(
  '/gmail/:messageId',
  authenticate,
  async (req, res) => {
    try {
      const {
        messageId,
      } = req.params;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          error:
            'Message ID is required',
        });
      }

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

      if (
        errorCode ===
        'GOOGLE_GMAIL_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_GMAIL_NOT_CONNECTED',
          error:
            'Gmail is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_GMAIL_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_GMAIL_RECONNECT_REQUIRED',
          error:
            'Gmail authorization has expired. Please reconnect Gmail.',
        });
      }

      if (
        isPermissionError(error)
      ) {
        return res.status(403).json({
          success: false,
          code:
            'GOOGLE_GMAIL_PERMISSION_REQUIRED',
          error:
            'Gmail permission is missing. Please reconnect Gmail.',
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
// GMAIL SEND
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
        errorCode ===
          403 ||
        isPermissionError(error)
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
        'GOOGLE_GMAIL_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_GMAIL_NOT_CONNECTED',
          error:
            'Gmail is not connected.',
        });
      }

      if (
        errorCode ===
        'GOOGLE_GMAIL_RECONNECT_REQUIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'GOOGLE_GMAIL_RECONNECT_REQUIRED',
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

export default router;