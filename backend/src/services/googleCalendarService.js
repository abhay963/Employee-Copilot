import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';
import { query } from '../db/connection.js';

class GoogleCalendarService {
  // ============================================================
  // CONSTANTS
  // ============================================================

  CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  CALENDAR_ID = 'primary';

  // ============================================================
  // GET GOOGLE OAUTH CLIENT
  //
  // IMPORTANT:
  // Create a fresh OAuth client for each operation.
  // Do NOT share one OAuth client between users.
  // ============================================================

  createOAuth2Client() {
    const clientId = config.googleClientId;
    const clientSecret = config.googleClientSecret;
    const redirectUri = config.googleCalendarRedirectUri?.trim();

    if (!clientId) {
      throw new Error(
        'Google Calendar OAuth client ID is not configured'
      );
    }

    if (!clientSecret) {
      throw new Error(
        'Google Calendar OAuth client secret is not configured'
      );
    }

    if (!redirectUri) {
      throw new Error(
        'Google Calendar redirect URI is not configured'
      );
    }

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  // ============================================================
  // CREATE CALENDAR API CLIENT
  // ============================================================

  createCalendarClient(oauth2Client) {
    if (!oauth2Client) {
      throw new Error(
        'OAuth2 client is required'
      );
    }

    return google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  // ============================================================
  // OAUTH STATE
  // ============================================================

  createOAuthState(userId) {
    const secret =
      config.jwtSecret ||
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured'
      );
    }

    if (!userId) {
      throw new Error(
        'User ID is required'
      );
    }

    return jwt.sign(
      {
        userId,
        purpose: 'google_calendar_oauth',
      },
      secret,
      {
        expiresIn: '10m',
      }
    );
  }

  // ============================================================
  // VERIFY OAUTH STATE
  // ============================================================

  verifyOAuthState(state) {
    const secret =
      config.jwtSecret ||
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured'
      );
    }

    if (!state) {
      throw new Error(
        'Google Calendar OAuth state is missing'
      );
    }

    try {
      const decoded = jwt.verify(
        state,
        secret
      );

      if (
        decoded.purpose !==
        'google_calendar_oauth'
      ) {
        throw new Error(
          'Invalid Google Calendar OAuth state'
        );
      }

      if (!decoded.userId) {
        throw new Error(
          'Google Calendar OAuth state does not contain user ID'
        );
      }

      return decoded.userId;
    } catch (error) {
      console.error(
        'Google Calendar OAuth state verification failed:',
        error.message
      );

      throw new Error(
        'Invalid or expired Google Calendar OAuth state'
      );
    }
  }

  // ============================================================
  // GET AUTH URL
  // ============================================================

  getAuthUrl(state) {
    if (!state) {
      throw new Error(
        'OAuth state is required'
      );
    }

    const oauth2Client =
      this.createOAuth2Client();

    const redirectUri =
      config.googleCalendarRedirectUri.trim();

    const authUrl =
      oauth2Client.generateAuthUrl({
        access_type: 'offline',

        prompt: 'consent',

        scope: this.CALENDAR_SCOPES,

        state,

        include_granted_scopes: true,
      });

    console.log(
      '=========================================='
    );

    console.log(
      'GOOGLE CALENDAR OAUTH'
    );

    console.log(
      '=========================================='
    );

    console.log(
      'Client ID:',
      config.googleClientId
    );

    console.log(
      'Calendar Redirect URI:',
      redirectUri
    );

    console.log(
      'Calendar Scopes:',
      this.CALENDAR_SCOPES
    );

    console.log(
      '=========================================='
    );

    return authUrl;
  }

  // ============================================================
  // EXCHANGE AUTHORIZATION CODE FOR TOKENS
  // ============================================================

  async exchangeCodeForTokens(
    code,
    userId
  ) {
    try {
      if (!code) {
        throw new Error(
          'Google Calendar authorization code is missing'
        );
      }

      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      const oauth2Client =
        this.createOAuth2Client();

      console.log(
        'Exchanging Google Calendar authorization code...'
      );

      const {
        tokens,
      } =
        await oauth2Client.getToken(
          code
        );

      if (!tokens?.access_token) {
        throw new Error(
          'Google did not return a Calendar access token'
        );
      }

      await this.storeTokens(
        userId,
        tokens
      );

      console.log(
        'Google Calendar OAuth completed for user:',
        userId
      );

      return tokens;
    } catch (error) {
      console.error(
        'Error exchanging Google Calendar authorization code:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // STORE CALENDAR TOKENS
  //
  // ONLY:
  // google_calendar_oauth_tokens
  //
  // Gmail is NOT touched.
  // ============================================================

  async storeTokens(
    userId,
    tokens
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      if (!tokens?.access_token) {
        throw new Error(
          'Google Calendar access token is missing'
        );
      }

      const existingResult =
        await query(
          `
          SELECT
            refresh_token,
            scope
          FROM google_calendar_oauth_tokens
          WHERE user_id = $1
          `,
          [userId]
        );

      const existingToken =
        existingResult.rows[0];

      const refreshToken =
        tokens.refresh_token ||
        existingToken?.refresh_token ||
        null;

      const scope =
        tokens.scope ||
        existingToken?.scope ||
        this.CALENDAR_SCOPES.join(' ');

      const expiresAt =
        tokens.expiry_date
          ? new Date(
              tokens.expiry_date
            ).toISOString()
          : null;

      await query(
        `
        INSERT INTO google_calendar_oauth_tokens (
          user_id,
          access_token,
          refresh_token,
          token_type,
          expires_at,
          scope
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )

        ON CONFLICT (user_id)

        DO UPDATE SET

          access_token =
            EXCLUDED.access_token,

          refresh_token =
            COALESCE(
              EXCLUDED.refresh_token,
              google_calendar_oauth_tokens.refresh_token
            ),

          token_type =
            COALESCE(
              EXCLUDED.token_type,
              google_calendar_oauth_tokens.token_type
            ),

          expires_at =
            EXCLUDED.expires_at,

          scope =
            COALESCE(
              EXCLUDED.scope,
              google_calendar_oauth_tokens.scope
            ),

          updated_at =
            CURRENT_TIMESTAMP
        `,
        [
          userId,
          tokens.access_token,
          refreshToken,
          tokens.token_type || 'Bearer',
          expiresAt,
          scope,
        ]
      );

      console.log(
        'Google Calendar tokens stored for user:',
        userId
      );

      return true;
    } catch (error) {
      console.error(
        'Error storing Google Calendar tokens:',
        error
      );

      throw new Error(
        'Failed to store Google Calendar tokens'
      );
    }
  }

  // ============================================================
  // GET CALENDAR TOKENS
  // ============================================================

  async getTokens(userId) {
    try {
      if (!userId) {
        return null;
      }

      const result =
        await query(
          `
          SELECT
            access_token,
            refresh_token,
            token_type,
            expires_at,
            scope
          FROM google_calendar_oauth_tokens
          WHERE user_id = $1
          `,
          [userId]
        );

      if (
        result.rows.length === 0
      ) {
        return null;
      }

      const tokenData =
        result.rows[0];

      return {
        access_token:
          tokenData.access_token,

        refresh_token:
          tokenData.refresh_token,

        token_type:
          tokenData.token_type ||
          'Bearer',

        expiry_date:
          tokenData.expires_at
            ? new Date(
                tokenData.expires_at
              ).getTime()
            : null,

        scope:
          tokenData.scope,
      };
    } catch (error) {
      console.error(
        'Error getting Google Calendar tokens:',
        error
      );

      throw new Error(
        'Failed to get Google Calendar tokens'
      );
    }
  }

  // ============================================================
  // CHECK CONNECTION
  // ============================================================

  async isConnected(userId) {
    try {
      const tokens =
        await this.getTokens(
          userId
        );

      if (!tokens) {
        return false;
      }

      return Boolean(
        tokens.access_token ||
        tokens.refresh_token
      );
    } catch (error) {
      console.error(
        'Error checking Google Calendar connection:',
        error
      );

      return false;
    }
  }

  // ============================================================
  // GET AUTHORIZED CALENDAR
  // ============================================================

  async getAuthorizedCalendar(
    userId
  ) {
    if (!userId) {
      throw new Error(
        'User ID is required'
      );
    }

    let tokens =
      await this.getTokens(
        userId
      );

    if (!tokens) {
      const error =
        new Error(
          'GOOGLE_CALENDAR_NOT_CONNECTED'
        );

      error.code =
        'GOOGLE_CALENDAR_NOT_CONNECTED';

      throw error;
    }

    const oauth2Client =
      this.createOAuth2Client();

    oauth2Client.setCredentials(
      tokens
    );

    // ----------------------------------------------------------
    // Refresh access token if expired/about to expire
    // ----------------------------------------------------------

    if (
      tokens.expiry_date &&
      Date.now() >=
        tokens.expiry_date - 60_000
    ) {
      tokens =
        await this.refreshAccessToken(
          userId,
          oauth2Client
        );

      oauth2Client.setCredentials(
        tokens
      );
    }

    return this.createCalendarClient(
      oauth2Client
    );
  }

  // ============================================================
  // REFRESH ACCESS TOKEN
  // ============================================================

  async refreshAccessToken(
    userId,
    oauth2Client = null
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      const tokens =
        await this.getTokens(
          userId
        );

      if (
        !tokens?.refresh_token
      ) {
        const error =
          new Error(
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
          );

        error.code =
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED';

        throw error;
      }

      const client =
        oauth2Client ||
        this.createOAuth2Client();

      client.setCredentials(
        tokens
      );

      console.log(
        'Refreshing Google Calendar access token for user:',
        userId
      );

      const {
        credentials,
      } =
        await client.refreshAccessToken();

      if (
        !credentials?.access_token
      ) {
        throw new Error(
          'Google did not return a refreshed Calendar access token'
        );
      }

      await this.storeTokens(
        userId,
        credentials
      );

      console.log(
        'Google Calendar access token refreshed for user:',
        userId
      );

      return {
        access_token:
          credentials.access_token,

        refresh_token:
          credentials.refresh_token ||
          tokens.refresh_token,

        token_type:
          credentials.token_type ||
          tokens.token_type ||
          'Bearer',

        expiry_date:
          credentials.expiry_date ||
          null,

        scope:
          credentials.scope ||
          tokens.scope ||
          null,
      };
    } catch (error) {
      console.error(
        'Error refreshing Google Calendar access token:',
        error
      );

      const errorText =
        [
          error?.message,
          error?.response?.data?.error,
          error?.response?.data?.error_description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

      if (
        errorText.includes(
          'invalid_grant'
        ) ||
        errorText.includes(
          'invalid grant'
        ) ||
        errorText.includes(
          'token has been expired or revoked'
        )
      ) {
        const reconnectError =
          new Error(
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
          );

        reconnectError.code =
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED';

        throw reconnectError;
      }

      throw error;
    }
  }

  // ============================================================
  // GET EVENTS
  // ============================================================

  async getEvents(
    userId,
    startDate,
    endDate
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      const start =
        new Date(startDate);

      const end =
        new Date(endDate);

      if (
        Number.isNaN(
          start.getTime()
        )
      ) {
        throw new Error(
          'Invalid start date'
        );
      }

      if (
        Number.isNaN(
          end.getTime()
        )
      ) {
        throw new Error(
          'Invalid end date'
        );
      }

      if (
        start > end
      ) {
        throw new Error(
          'Start date cannot be after end date'
        );
      }

      // Include the complete end day.
      end.setHours(
        23,
        59,
        59,
        999
      );

      const calendar =
        await this.getAuthorizedCalendar(
          userId
        );

      console.log(
        `Getting Calendar events for user ${userId}`
      );

      console.log(
        'Calendar timeMin:',
        start.toISOString()
      );

      console.log(
        'Calendar timeMax:',
        end.toISOString()
      );

      const response =
        await calendar.events.list({
          calendarId:
            this.CALENDAR_ID,

          timeMin:
            start.toISOString(),

          timeMax:
            end.toISOString(),

          singleEvents:
            true,

          orderBy:
            'startTime',

          maxResults:
            2500,
        });

      const events =
        response?.data?.items ||
        [];

      console.log(
        `Retrieved ${events.length} Calendar events`
      );

      return events;
    } catch (error) {
      console.error(
        'Error getting Google Calendar events:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // CHECK CONFLICTS
  // ============================================================

  async checkConflicts(
    userId,
    startDate,
    endDate
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      const start =
        new Date(startDate);

      const end =
        new Date(endDate);

      if (
        Number.isNaN(
          start.getTime()
        ) ||
        Number.isNaN(
          end.getTime()
        )
      ) {
        throw new Error(
          'Invalid start or end date'
        );
      }

      if (
        start > end
      ) {
        throw new Error(
          'Start date cannot be after end date'
        );
      }

      end.setHours(
        23,
        59,
        59,
        999
      );

      const calendar =
        await this.getAuthorizedCalendar(
          userId
        );

      const response =
        await calendar.freebusy.query({
          requestBody: {
            timeMin:
              start.toISOString(),

            timeMax:
              end.toISOString(),

            items: [
              {
                id:
                  this.CALENDAR_ID,
              },
            ],
          },
        });

      const busyTimes =
        response?.data
          ?.calendars
          ?.primary
          ?.busy ||
        [];

      return {
        hasConflicts:
          busyTimes.length > 0,

        conflicts:
          busyTimes.map(
            (busy) => ({
              start:
                busy.start,

              end:
                busy.end,
            })
          ),
      };
    } catch (error) {
      console.error(
        'Error checking Google Calendar conflicts:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // CREATE EVENT
  // ============================================================

  async createEvent(
    userId,
    eventData
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      if (
        !eventData ||
        typeof eventData !==
          'object'
      ) {
        throw new Error(
          'Calendar event data is required'
        );
      }

      if (
        !eventData.summary &&
        !eventData.description
      ) {
        throw new Error(
          'Calendar event must contain a summary or description'
        );
      }

      const calendar =
        await this.getAuthorizedCalendar(
          userId
        );

      const response =
        await calendar.events.insert({
          calendarId:
            this.CALENDAR_ID,

          requestBody:
            eventData,
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error creating Google Calendar event:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // UPDATE EVENT
  // ============================================================

  async updateEvent(
    userId,
    eventId,
    eventData
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      if (!eventId) {
        throw new Error(
          'Calendar event ID is required'
        );
      }

      if (
        !eventData ||
        typeof eventData !==
          'object'
      ) {
        throw new Error(
          'Calendar event data is required'
        );
      }

      const calendar =
        await this.getAuthorizedCalendar(
          userId
        );

      const response =
        await calendar.events.update({
          calendarId:
            this.CALENDAR_ID,

          eventId,

          requestBody:
            eventData,
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error updating Google Calendar event:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // DELETE EVENT
  // ============================================================

  async deleteEvent(
    userId,
    eventId
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      if (!eventId) {
        throw new Error(
          'Calendar event ID is required'
        );
      }

      const calendar =
        await this.getAuthorizedCalendar(
          userId
        );

      await calendar.events.delete({
        calendarId:
          this.CALENDAR_ID,

        eventId,
      });

      return true;
    } catch (error) {
      console.error(
        'Error deleting Google Calendar event:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // GET SINGLE EVENT
  // ============================================================

  async getEvent(
    userId,
    eventId
  ) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      if (!eventId) {
        throw new Error(
          'Calendar event ID is required'
        );
      }

      const calendar =
        await this.getAuthorizedCalendar(
          userId
        );

      const response =
        await calendar.events.get({
          calendarId:
            this.CALENDAR_ID,

          eventId,
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error getting Google Calendar event:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // REVOKE CALENDAR TOKENS ONLY
  //
  // NEVER touches Gmail tokens.
  // ============================================================

  async revokeTokens(userId) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      const tokens =
        await this.getTokens(
          userId
        );

      if (
        tokens?.access_token
      ) {
        try {
          const oauth2Client =
            this.createOAuth2Client();

          await oauth2Client.revokeToken(
            tokens.access_token
          );

          console.log(
            'Google Calendar token revoked at Google'
          );
        } catch (googleError) {
          console.warn(
            'Google Calendar token revoke failed:',
            googleError.message
          );
        }
      }

      await query(
        `
        DELETE FROM google_calendar_oauth_tokens
        WHERE user_id = $1
        `,
        [userId]
      );

      console.log(
        'Google Calendar connection removed for user:',
        userId
      );

      return true;
    } catch (error) {
      console.error(
        'Error revoking Google Calendar tokens:',
        error
      );

      throw new Error(
        'Failed to revoke Google Calendar connection'
      );
    }
  }
}

export default new GoogleCalendarService();