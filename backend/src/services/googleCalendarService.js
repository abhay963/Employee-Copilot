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
  // OAUTH CLIENT
  // ============================================================

  initializeOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
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
      config.jwtSecret ||
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured'
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

  verifyOAuthState(state) {
    const secret =
      config.jwtSecret ||
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured'
      );
    }

    const decoded = jwt.verify(
      state,
      secret
    );

    if (
      decoded.purpose !==
      'google_calendar_oauth'
    ) {
      throw new Error(
        'Invalid OAuth state'
      );
    }

    return decoded.userId;
  }

  // ============================================================
  // STORE TOKENS
  // ============================================================

  async storeTokens(userId, tokens) {
    try {
      if (!userId) {
        throw new Error(
          'User ID is required'
        );
      }

      if (!tokens?.access_token) {
        throw new Error(
          'Google access token is missing'
        );
      }

      const expiresAt =
        tokens.expiry_date
          ? new Date(
              tokens.expiry_date
            ).toISOString()
          : null;

      await query(
        `
        INSERT INTO google_oauth_tokens (
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
          access_token = EXCLUDED.access_token,

          refresh_token =
            COALESCE(
              EXCLUDED.refresh_token,
              google_oauth_tokens.refresh_token
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
          tokens.refresh_token || null,
          tokens.token_type || 'Bearer',
          expiresAt,
          tokens.scope || null,
        ]
      );

      return true;
    } catch (error) {
      console.error(
        'Error storing OAuth tokens:',
        error
      );

      throw new Error(
        'Failed to store OAuth tokens'
      );
    }
  }

  // ============================================================
  // GET TOKENS
  // ============================================================

  async getTokens(userId) {
    try {
      const result = await query(
        `
        SELECT
          access_token,
          refresh_token,
          token_type,
          expires_at,
          scope
        FROM google_oauth_tokens
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
        'Error getting OAuth tokens:',
        error
      );

      throw new Error(
        'Failed to get OAuth tokens'
      );
    }
  }

  // ============================================================
  // CHECK CONNECTION
  // ============================================================

  async isConnected(userId) {
    try {
      const tokens =
        await this.getTokens(userId);

      return Boolean(
        tokens?.access_token
      );
    } catch (error) {
      console.error(
        'Error checking Google connection:',
        error
      );

      return false;
    }
  }

  // ============================================================
  // SET USER CREDENTIALS
  // ============================================================

  async setCredentials(userId) {
    try {
      const tokens =
        await this.getTokens(userId);

      if (!tokens) {
        const error =
          new Error(
            'GOOGLE_NOT_CONNECTED'
          );

        error.code =
          'GOOGLE_NOT_CONNECTED';

        throw error;
      }

      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      this.oauth2Client.setCredentials(
        tokens
      );

      // Refresh expired token
      if (
        tokens.expiry_date &&
        Date.now() >=
          tokens.expiry_date - 60000
      ) {
        await this.refreshAccessToken(
          userId
        );
      }

      return true;
    } catch (error) {
      console.error(
        'Error setting credentials:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // REFRESH ACCESS TOKEN
  // ============================================================

  async refreshAccessToken(userId) {
    try {
      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      const tokens =
        await this.getTokens(userId);

      if (
        !tokens ||
        !tokens.refresh_token
      ) {
        const error =
          new Error(
            'GOOGLE_RECONNECT_REQUIRED'
          );

        error.code =
          'GOOGLE_RECONNECT_REQUIRED';

        throw error;
      }

      this.oauth2Client.setCredentials(
        tokens
      );

      const {
        credentials,
      } =
        await this.oauth2Client.refreshAccessToken();

      await this.storeTokens(
        userId,
        credentials
      );

      this.oauth2Client.setCredentials(
        credentials
      );

      return credentials;
    } catch (error) {
      console.error(
        'Error refreshing access token:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // GOOGLE AUTH URL
  // ============================================================

  getAuthUrl(state) {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl(
      {
        access_type: 'offline',

        prompt: 'consent',

        scope: scopes,

        state,
      }
    );
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
          'Authorization code is missing'
        );
      }

      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      const {
        tokens,
      } =
        await this.oauth2Client.getToken(
          code
        );

      await this.storeTokens(
        userId,
        tokens
      );

      return tokens;
    } catch (error) {
      console.error(
        'Error exchanging code for tokens:',
        error
      );

      throw new Error(
        'Failed to exchange authorization code for tokens'
      );
    }
  }

  // ============================================================
  // GET CALENDAR EVENTS
  // ============================================================

  async getEvents(
    userId,
    startDate,
    endDate
  ) {
    try {
      await this.setCredentials(
        userId
      );

      const start =
        new Date(startDate);

      const end =
        new Date(endDate);

      // Include entire end date
      end.setHours(
        23,
        59,
        59,
        999
      );

      const response =
        await this.calendar.events.list(
          {
            calendarId: 'primary',

            timeMin:
              start.toISOString(),

            timeMax:
              end.toISOString(),

            singleEvents: true,

            orderBy: 'startTime',

            maxResults: 2500,
          }
        );

      return (
        response.data.items || []
      );
    } catch (error) {
      console.error(
        'Error getting calendar events:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // CHECK CALENDAR CONFLICTS
  // ============================================================

  async checkConflicts(
    userId,
    startDate,
    endDate
  ) {
    try {
      await this.setCredentials(
        userId
      );

      const start =
        new Date(startDate);

      const end =
        new Date(endDate);

      end.setHours(
        23,
        59,
        59,
        999
      );

      const response =
        await this.calendar.freebusy.query(
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
          .calendars
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
        'Error checking calendar conflicts:',
        error
      );

      // Do NOT silently say "no conflicts".
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
      await this.setCredentials(
        userId
      );

      const response =
        await this.calendar.events.insert(
          {
            calendarId: 'primary',

            requestBody:
              eventData,
          }
        );

      return response.data;
    } catch (error) {
      console.error(
        'Error creating calendar event:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // REVOKE TOKENS
  // ============================================================

  async revokeTokens(userId) {
    try {
      const tokens =
        await this.getTokens(userId);

      if (
        tokens?.access_token
      ) {
        try {
          if (!this.oauth2Client) {
            this.initializeOAuth2Client();
          }

          await this.oauth2Client.revokeToken(
            tokens.access_token
          );
        } catch (googleError) {
          console.warn(
            'Google token revoke failed:',
            googleError.message
          );
        }
      }

      await query(
        `
        DELETE FROM google_oauth_tokens
        WHERE user_id = $1
        `,
        [userId]
      );

      return true;
    } catch (error) {
      console.error(
        'Error revoking OAuth tokens:',
        error
      );

      throw new Error(
        'Failed to revoke OAuth tokens'
      );
    }
  }
}

export default new GoogleCalendarService();