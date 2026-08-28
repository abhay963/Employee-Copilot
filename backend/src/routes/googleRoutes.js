import express from 'express';

import { authenticate } from '../middleware/auth.js';

import googleCalendarService from '../services/googleCalendarService.js';

import gmailService from '../services/gmailService.js';

const router = express.Router();

// ============================================================
// GOOGLE OAUTH - GENERATE AUTH URL
// ============================================================

router.get(
  '/auth/url',
  authenticate,
  (req, res) => {
    try {
      const state = String(req.user.id);

      const authUrl =
        googleCalendarService.getAuthUrl(state);

      console.log('==========================================');
      console.log('Google OAuth URL generated');
      console.log('User ID:', req.user.id);
      console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
      console.log('==========================================');

      return res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      console.error(
        'Error generating Google auth URL:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL',
      });
    }
  }
);

// ============================================================
// GOOGLE OAUTH CALLBACK
//
// Google redirects here with:
// GET /api/google/callback?code=...&state=...
// ============================================================

router.get(
  '/callback',
  async (req, res) => {
    try {
      const { code, state, error } = req.query;

      console.log('==========================================');
      console.log('Google OAuth callback received');
      console.log('Code exists:', Boolean(code));
      console.log('State:', state);
      console.log('Error:', error);
      console.log(
        'Redirect URI:',
        process.env.GOOGLE_REDIRECT_URI
      );
      console.log('==========================================');

      // Google returned an OAuth error
      if (error) {
        console.error(
          'Google OAuth error:',
          error
        );

        // Handle specific Google OAuth errors with user-friendly messages
        let errorMessage = 'oauth_error';
        let errorDescription = error;

        if (error === 'access_denied') {
          errorDescription = 'You denied access to your Google Calendar. Please try again and accept the permissions.';
        } else if (error === 'invalid_request') {
          errorDescription = 'Invalid OAuth request. Please try again.';
        } else if (error === 'unauthorized_client') {
          errorDescription = 'The application is not authorized. Please contact the administrator.';
        } else if (error === 'response_type_error') {
          errorDescription = 'Invalid response type. Please contact the administrator.';
        }

        return res.redirect(
          `http://localhost:5173/calendar?google_error=${encodeURIComponent(errorMessage)}&error_description=${encodeURIComponent(errorDescription)}`
        );
      }

      // Missing authorization code
      if (!code) {
        return res.redirect(
          'http://localhost:5173/calendar?google_error=missing_code&error_description=Authorization code is missing from the response.'
        );
      }

      // Missing state
      if (!state) {
        return res.redirect(
          'http://localhost:5173/calendar?google_error=missing_state&error_description=OAuth state parameter is missing. Please try again.'
        );
      }

      // Exchange authorization code for Google tokens
      await googleCalendarService.exchangeCodeForTokens(
        code,
        state
      );

      console.log(
        'Google Calendar authorization successful for user:',
        state
      );

      // Send user back to frontend
      return res.redirect(
        'http://localhost:5173/calendar?google_connected=true'
      );
    } catch (error) {
      console.error(
        'Error handling Google OAuth callback:',
        error
      );

      // Handle specific error cases
      let errorMessage = 'callback_failed';
      let errorDescription = 'Failed to complete Google Calendar authorization. Please try again.';

      if (error.message && error.message.includes('access blocked')) {
        errorMessage = 'access_blocked';
        errorDescription = 'Your Google account is not configured as a test user for this application. If you are the developer, please add your email to the Google Cloud Console test users list. Otherwise, please contact the administrator.';
      } else if (error.message && error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'redirect_uri_mismatch';
        errorDescription = 'The redirect URI does not match. Please contact the administrator.';
      }

      return res.redirect(
        `http://localhost:5173/calendar?google_error=${encodeURIComponent(errorMessage)}&error_description=${encodeURIComponent(errorDescription)}`
      );
    }
  }
);

// ============================================================
// LEGACY POST CALLBACK
//
// Kept only in case your frontend currently calls it.
// Google itself uses GET /callback above.
// ============================================================

router.post(
  '/auth/callback',
  async (req, res) => {
    try {
      const {
        code,
        state,
      } = req.body;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Code and state are required',
        });
      }

      await googleCalendarService.exchangeCodeForTokens(
        code,
        state
      );

      return res.json({
        success: true,
        message:
          'Google Calendar connected successfully',
      });
    } catch (error) {
      console.error(
        'Error handling OAuth POST callback:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to connect Google Calendar',
      });
    }
  }
);

// ============================================================
// CHECK GOOGLE CONNECTION
// ============================================================

const getGoogleConnectionStatus = async (
  req,
  res
) => {
  try {
    const tokens =
      await googleCalendarService.getTokens(
        req.user.id
      );

    return res.json({
      success: true,
      connected: Boolean(tokens),
    });
  } catch (error) {
    console.error(
      'Error checking Google connection:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Failed to check Google connection',
    });
  }
};

// ============================================================
// GOOGLE AUTH STATUS
// ============================================================

router.get(
  '/auth/status',
  authenticate,
  getGoogleConnectionStatus
);

// ============================================================
// CALENDAR STATUS
// ============================================================

router.get(
  '/calendar/status',
  authenticate,
  getGoogleConnectionStatus
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

      if (!startDate || !endDate) {
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

      if (!startDate || !endDate) {
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
        error?.code ||
        error?.response?.data?.error;

      if (
        errorCode ===
        'GOOGLE_NOT_CONNECTED'
      ) {
        return res.status(401).json({
          success: false,
          code: 'GOOGLE_NOT_CONNECTED',
          error:
            'Google Calendar is not connected',
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
      const eventData = req.body;

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

      return res.status(500).json({
        success: false,
        error:
          'Failed to create calendar event',
      });
    }
  }
);

// ============================================================
// GMAIL - SEND
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
          isHtml || false
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

      return res.status(500).json({
        success: false,
        error:
          'Failed to send email',
      });
    }
  }
);

// ============================================================
// GMAIL - RECENT EMAILS
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

      return res.status(500).json({
        success: false,
        error:
          'Failed to get recent emails',
      });
    }
  }
);

// ============================================================
// GMAIL - GET EMAIL
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

      return res.status(500).json({
        success: false,
        error:
          'Failed to get email',
      });
    }
  }
);

// ============================================================
// REVOKE GOOGLE TOKENS
// ============================================================

router.delete(
  '/auth/revoke',
  authenticate,
  async (req, res) => {
    try {
      await googleCalendarService.revokeTokens(
        req.user.id
      );

      return res.json({
        success: true,
        message:
          'Google connection revoked successfully',
      });
    } catch (error) {
      console.error(
        'Error revoking tokens:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to revoke Google connection',
      });
    }
  }
);

export default router;