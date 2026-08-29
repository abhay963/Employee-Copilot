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
    if (
      !config.googleClientId ||
      !config.googleClientSecret
    ) {
      throw new Error(
        'Google OAuth client credentials are not configured'
      );
    }

    if (!config.googleCalendarRedirectUri) {
      throw new Error(
        'Google Calendar redirect URI is not configured'
      );
    }

    console.log(
      '=========================================='
    );

    console.log(
      'Initializing Google Calendar OAuth client'
    );

    console.log(
      'Google Client ID:',
      config.googleClientId
        ? 'SET'
        : 'MISSING'
    );

    console.log(
      'Google Client Secret:',
      config.googleClientSecret
        ? 'SET'
        : 'MISSING'
    );

    console.log(
      'Calendar Redirect URI from config:',
      config.googleCalendarRedirectUri
    );

    console.log(
      'Calendar Redirect URI length:',
      config.googleCalendarRedirectUri.length
    );

    console.log(
      'Calendar Redirect URI trimmed:',
      config.googleCalendarRedirectUri.trim()
    );

    console.log(
      '=========================================='
    );

    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleCalendarRedirectUri.trim()
    );

    // Ensure the redirect URI is properly set
    this.oauth2Client.redirectUri = config.googleCalendarRedirectUri.trim();

    console.log(
      'OAuth client redirect URI after initialization:',
      this.oauth2Client.redirectUri
    );

    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }



  // ============================================================
  // OAUTH STATE
  // ============================================================

  createOAuthState(userId) {
    const secret =
      config.jwtSecret;

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
        purpose:
          'google_calendar_oauth',
      },
      secret,
      {
        expiresIn: '10m',
      }
    );
  }

  verifyOAuthState(state) {
    const secret =
      config.jwtSecret;

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

    console.log(
      'Calendar: Verifying OAuth state...'
    );

    const decoded =
      jwt.verify(
        state,
        secret
      );

    console.log(
      'Calendar: State decoded successfully'
    );

    console.log(
      'Calendar: State purpose:',
      decoded.purpose
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

    console.log(
      'Calendar: User ID from state:',
      decoded.userId
    );

    return decoded.userId;
  }

  // ============================================================
  // STORE CALENDAR TOKENS
  //
  // ONLY:
  // google_calendar_oauth_tokens
  //
  // Gmail is completely separate.
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

      console.log(
        'Calendar: Storing tokens for user:',
        userId
      );

      const expiresAt =
        tokens.expiry_date
          ? new Date(
              tokens.expiry_date
            ).toISOString()
          : null;

      console.log(
        'Calendar: Token expiry date:',
        expiresAt
      );

      console.log(
        'Calendar: Executing INSERT/UPDATE to google_calendar_oauth_tokens...'
      );

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
        VALUES ($1, $2, $3, $4, $5, $6)

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
            EXCLUDED.token_type,

          expires_at =
            EXCLUDED.expires_at,

          scope =
            EXCLUDED.scope,

          updated_at =
            CURRENT_TIMESTAMP
        `,
        [
          userId,
          tokens.access_token,
          tokens.refresh_token ||
            null,
          tokens.token_type ||
            'Bearer',
          expiresAt,
          tokens.scope ||
            null,
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
          tokenData.token_type,

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

      return Boolean(
        tokens?.access_token
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
  // SET USER CREDENTIALS
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

    this.initializeOAuth2Client();

    const oauth2Client = this.oauth2Client;

    oauth2Client.setCredentials(
      tokens
    );

    // ----------------------------------------------------------
    // Refresh access token if necessary
    // ----------------------------------------------------------

    if (
      tokens.expiry_date &&
      Date.now() >=
        tokens.expiry_date - 60000
    ) {
      const refreshed =
        await this.refreshAccessToken(
          userId,
          oauth2Client
        );

      oauth2Client.setCredentials(
        refreshed
      );
    }

    return this.calendar;
  }

  // ============================================================
  // REFRESH ACCESS TOKEN
  // ============================================================

  async refreshAccessToken(
    userId,
    oauth2Client = null
  ) {
    try {
      const client =
        oauth2Client ||
        this.oauth2Client;

      if (!client) {
        this.initializeOAuth2Client();
      }

      const tokens =
        await this.getTokens(
          userId
        );

      if (
        !tokens ||
        !tokens.refresh_token
      ) {
        const error =
          new Error(
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
          );

        error.code =
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED';

        throw error;
      }

      client.setCredentials(
        tokens
      );

      const {
        credentials,
      } =
        await client.refreshAccessToken();

      // Google may return a new refresh token,
      // but usually does not. storeTokens()
      // preserves the existing one.
      await this.storeTokens(
        userId,
        credentials
      );

      console.log(
        'Google Calendar access token refreshed for user:',
        userId
      );

      return credentials;
    } catch (error) {
      console.error(
        'Error refreshing Google Calendar access token:',
        error
      );

      const errorText =
        error?.message
          ?.toLowerCase() || '';

      if (
        errorText.includes(
          'invalid_grant'
        ) ||
        errorText.includes(
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
  // CALENDAR AUTH URL
  //
  // CALENDAR SCOPES ONLY
  // ============================================================

  getAuthUrl(state) {
    if (!state) {
      throw new Error(
        'OAuth state is required'
      );
    }

    // Always reinitialize to ensure correct redirect URI
    this.initializeOAuth2Client();

    const calendarScopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    console.log(
      'Google Calendar OAuth scopes:',
      calendarScopes
    );

    console.log(
      'Google Calendar OAuth redirect URI:',
      config.googleCalendarRedirectUri
    );

    console.log(
      'OAuth client redirect URI:',
      this.oauth2Client.redirectUri
    );

    // Explicitly set redirect URI before generating auth URL
    this.oauth2Client.redirectUri = config.googleCalendarRedirectUri;

    const authUrl = this.oauth2Client.generateAuthUrl(
      {
        access_type:
          'offline',

        prompt:
          'consent',

        scope:
          calendarScopes,

        state,
      }
    );

    // Extract redirect_uri from the generated auth URL for debugging
    const redirectUriMatch = authUrl.match(/[?&]redirect_uri=([^&]+)/);
    const redirectUriInUrl = redirectUriMatch
      ? decodeURIComponent(redirectUriMatch[1])
      : 'Could not extract';

    console.log(
      'Redirect URI in generated Auth URL:',
      redirectUriInUrl
    );

    console.log(
      'Config redirect URI vs Generated redirect URI match:',
      config.googleCalendarRedirectUri === redirectUriInUrl
    );

    console.log(
      'Generated Calendar Auth URL (first 300 chars):',
      authUrl.substring(0, 300)
    );

    return authUrl;
  }

  // ============================================================
  // EXCHANGE GOOGLE CODE
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

      console.log(
        'Calendar: Starting token exchange for user:',
        userId
      );

      // Always reinitialize to ensure correct redirect URI
      this.initializeOAuth2Client();

      console.log(
        'Calendar: OAuth client initialized, calling getToken...'
      );

      const {
        tokens,
      } =
        await this.oauth2Client.getToken(
          code
        );

      console.log(
        'Calendar: Token received from Google'
      );

      console.log(
        'Google Calendar OAuth scopes received:',
        tokens.scope
      );

      console.log(
        'Calendar: Storing tokens in google_calendar_oauth_tokens...'
      );

      await this.storeTokens(
        userId,
        tokens
      );

      console.log(
        'Calendar: Tokens stored successfully'
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
  // GET EVENTS
  // ============================================================

  async getEvents(
    userId,
    startDate,
    endDate
  ) {
    try {
      console.log(
        `Getting Google Calendar events for user ${userId} from ${startDate} to ${endDate}`
      );

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

      end.setHours(
        23,
        59,
        59,
        999
      );

      const response =
        await calendar.events.list(
          {
            calendarId:
              'primary',

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
          }
        );

      const events =
        response.data.items ||
        [];

      console.log(
        `Retrieved ${events.length} Google Calendar events`
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

      end.setHours(
        23,
        59,
        59,
        999
      );

      const response =
        await calendar.freebusy.query(
          {
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
          }
        );

      const busyTimes =
        response.data
          ?.calendars
          ?.primary
          ?.busy || [];

      return {
        hasConflicts:
          busyTimes.length > 0,

        conflicts:
          busyTimes.map(
            (event) => ({
              start:
                event.start,

              end:
                event.end,
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
        await calendar.events.insert(
          {
            calendarId:
              'primary',

            requestBody:
              eventData,
          }
        );

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
  // REVOKE CALENDAR TOKENS ONLY
  // ============================================================

  async revokeTokens(userId) {
    try {
      const tokens =
        await this.getTokens(
          userId
        );

      if (
        tokens?.access_token
      ) {
        try {
          this.initializeOAuth2Client();

          await this.oauth2Client.revokeToken(
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