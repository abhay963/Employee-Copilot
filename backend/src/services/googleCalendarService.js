import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';
import { query } from '../db/connection.js';

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
  }

  // ============================================================
  // INITIALIZE OAUTH CLIENT
  // ============================================================

  initializeOAuth2Client() {
    const clientId = config.googleClientId?.trim();
    const clientSecret = config.googleClientSecret?.trim();
    const redirectUri = config.googleCalendarRedirectUri?.trim();

    if (!clientId) {
      throw new Error(
        'GOOGLE_CLIENT_ID is not configured'
      );
    }

    if (!clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_SECRET is not configured'
      );
    }

    if (!redirectUri) {
      throw new Error(
        'GOOGLE_CALENDAR_REDIRECT_URI is not configured'
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });

    return this.oauth2Client;
  }

  // ============================================================
  // GET OAUTH CLIENT
  // ============================================================

  getOAuthClient() {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }

    return this.oauth2Client;
  }

  // ============================================================
  // CREATE OAUTH STATE
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
        'Calendar OAuth state verification failed:',
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
      this.initializeOAuth2Client();

    const redirectUri =
      config.googleCalendarRedirectUri.trim();

    /*
     * Calendar permissions.
     *
     * calendar.readonly -> read calendar data
     * calendar.events    -> create/update/delete events
     */

    const calendarScopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const authUrl =
      oauth2Client.generateAuthUrl({
        access_type: 'offline',

        prompt: 'consent',

        include_granted_scopes: true,

        scope: calendarScopes,

        state,

        redirect_uri: redirectUri,
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
      'Redirect URI:',
      redirectUri
    );

    console.log(
      '=========================================='
    );

    return authUrl;
  }

  // ============================================================
  // EXCHANGE AUTHORIZATION CODE
  // ============================================================

  async exchangeCodeForTokens(
    code,
    userId
  ) {
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

    try {
      const oauth2Client =
        this.initializeOAuth2Client();

      const { tokens } =
        await oauth2Client.getToken(
          code
        );

      if (!tokens?.access_token) {
        throw new Error(
          'Google Calendar access token was not returned'
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
        'Google Calendar token exchange failed:',
        error.response?.data ||
          error.message ||
          error
      );

      throw error;
    }
  }

  // ============================================================
  // STORE TOKENS
  // ============================================================

  async storeTokens(
    userId,
    tokens
  ) {
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

    const expiresAt =
      tokens.expiry_date
        ? new Date(
            tokens.expiry_date
          ).toISOString()
        : null;

    try {
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
          tokens.refresh_token || null,
          tokens.token_type || 'Bearer',
          expiresAt,
          tokens.scope || null,
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
  // GET TOKENS
  // ============================================================

  async getTokens(userId) {
    if (!userId) {
      return null;
    }

    try {
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
          LIMIT 1
          `,
          [userId]
        );

      if (
        result.rows.length === 0
      ) {
        return null;
      }

      const row =
        result.rows[0];

      return {
        access_token:
          row.access_token,

        refresh_token:
          row.refresh_token,

        token_type:
          row.token_type || 'Bearer',

        expiry_date:
          row.expires_at
            ? new Date(
                row.expires_at
              ).getTime()
            : null,

        scope:
          row.scope,
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

      return Boolean(
        tokens?.access_token &&
        tokens?.refresh_token
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
  // REFRESH ACCESS TOKEN
  // ============================================================

  async refreshAccessToken(
    userId
  ) {
    try {
      const tokens =
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

      if (!tokens.refresh_token) {
        const error =
          new Error(
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
          );

        error.code =
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED';

        throw error;
      }

      const oauth2Client =
        this.initializeOAuth2Client();

      oauth2Client.setCredentials(
        tokens
      );

      const {
        credentials,
      } =
        await oauth2Client.refreshAccessToken();

      /*
       * Google normally does not return
       * refresh_token during refresh.
       *
       * storeTokens() preserves the old
       * refresh token automatically.
       */

      await this.storeTokens(
        userId,
        credentials
      );

      oauth2Client.setCredentials(
        credentials
      );

      console.log(
        'Google Calendar access token refreshed for user:',
        userId
      );

      return credentials;
    } catch (error) {
      console.error(
        'Calendar token refresh failed:',
        error.response?.data ||
          error.message ||
          error
      );

      const message =
        error?.message
          ?.toLowerCase() || '';

      if (
        message.includes(
          'invalid_grant'
        ) ||
        message.includes(
          'invalid grant'
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
  // GET AUTHORIZED CALENDAR
  // ============================================================

  async getAuthorizedCalendar(
    userId
  ) {
    const tokens =
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
      this.initializeOAuth2Client();

    oauth2Client.setCredentials(
      tokens
    );

    /*
     * Refresh if token is expired
     * or will expire within 60 seconds.
     */

    if (
      tokens.expiry_date &&
      Date.now() >=
        tokens.expiry_date - 60000
    ) {
      const credentials =
        await this.refreshAccessToken(
          userId
        );

      oauth2Client.setCredentials(
        credentials
      );
    }

    return google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  // ============================================================
  // GET EVENTS
  // ============================================================

  async getEvents(
    userId,
    startDate,
    endDate
  ) {
    const calendar =
      await this.getAuthorizedCalendar(
        userId
      );

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

    end.setHours(
      23,
      59,
      59,
      999
    );

    try {
      const response =
        await calendar.events.list({
          calendarId: 'primary',

          timeMin:
            start.toISOString(),

          timeMax:
            end.toISOString(),

          singleEvents: true,

          orderBy: 'startTime',

          maxResults: 2500,
        });

      return (
        response.data.items || []
      );
    } catch (error) {
      console.error(
        'Error getting Google Calendar events:',
        error.response?.data ||
          error.message ||
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
    const calendar =
      await this.getAuthorizedCalendar(
        userId
      );

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

    try {
      const response =
        await calendar.freebusy.query({
          requestBody: {
            timeMin:
              start.toISOString(),

            timeMax:
              end.toISOString(),

            items: [
              {
                id: 'primary',
              },
            ],
          },
        });

      const busy =
        response.data
          ?.calendars
          ?.primary
          ?.busy || [];

      return {
        hasConflicts:
          busy.length > 0,

        conflicts:
          busy.map(
            (item) => ({
              start:
                item.start,

              end:
                item.end,
            })
          ),
      };
    } catch (error) {
      console.error(
        'Error checking Google Calendar conflicts:',
        error.response?.data ||
          error.message ||
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
    if (
      !eventData ||
      typeof eventData !== 'object'
    ) {
      throw new Error(
        'Calendar event data is required'
      );
    }

    const calendar =
      await this.getAuthorizedCalendar(
        userId
      );

    try {
      const response =
        await calendar.events.insert({
          calendarId: 'primary',

          requestBody:
            eventData,
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error creating Google Calendar event:',
        error.response?.data ||
          error.message ||
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
    if (!eventId) {
      throw new Error(
        'Calendar event ID is required'
      );
    }

    if (
      !eventData ||
      typeof eventData !== 'object'
    ) {
      throw new Error(
        'Calendar event data is required'
      );
    }

    const calendar =
      await this.getAuthorizedCalendar(
        userId
      );

    try {
      const response =
        await calendar.events.update({
          calendarId: 'primary',

          eventId,

          requestBody:
            eventData,
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error updating Google Calendar event:',
        error.response?.data ||
          error.message ||
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
    if (!eventId) {
      throw new Error(
        'Calendar event ID is required'
      );
    }

    const calendar =
      await this.getAuthorizedCalendar(
        userId
      );

    try {
      await calendar.events.delete({
        calendarId: 'primary',

        eventId,
      });

      return true;
    } catch (error) {
      console.error(
        'Error deleting Google Calendar event:',
        error.response?.data ||
          error.message ||
          error
      );

      throw error;
    }
  }

  // ============================================================
  // REVOKE CALENDAR ONLY
  // ============================================================

  async revokeTokens(userId) {
    try {
      const tokens =
        await this.getTokens(
          userId
        );

      if (tokens?.access_token) {
        try {
          const oauth2Client =
            this.initializeOAuth2Client();

          await oauth2Client.revokeToken(
            tokens.access_token
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
        'Google Calendar connection revoked for user:',
        userId
      );

      return true;
    } catch (error) {
      console.error(
        'Error revoking Google Calendar connection:',
        error
      );

      throw new Error(
        'Failed to revoke Google Calendar connection'
      );
    }
  }
}

export default new GoogleCalendarService();