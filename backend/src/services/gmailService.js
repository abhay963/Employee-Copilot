import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';
import { query } from '../db/connection.js';

class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
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

    this.gmail = google.gmail({
      version: 'v1',
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
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
      {
        userId,
        purpose: 'google_gmail_oauth',
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
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(
      state,
      secret
    );

    if (
      decoded.purpose !==
      'google_gmail_oauth'
    ) {
      throw new Error(
        'Invalid Google Gmail OAuth state'
      );
    }

    return decoded.userId;
  }

  // ============================================================
  // STORE GMAIL TOKENS
  //
  // IMPORTANT:
  //
  // Gmail tokens are stored ONLY in:
  //
  // google_gmail_oauth_tokens
  //
  // Calendar tokens are completely separate.
  // ============================================================

  async storeTokens(userId, tokens) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!tokens?.access_token) {
        throw new Error(
          'Google Gmail access token is missing'
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

          access_token =
            EXCLUDED.access_token,

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

      console.log(
        'Google Gmail tokens stored for user:',
        userId
      );

      return true;
    } catch (error) {
      console.error(
        'Error storing Google Gmail tokens:',
        error
      );

      throw new Error(
        'Failed to store Google Gmail tokens'
      );
    }
  }

  // ============================================================
  // GET GMAIL TOKENS
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

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];

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
        'Error getting Google Gmail tokens:',
        error
      );

      throw new Error(
        'Failed to get Google Gmail tokens'
      );
    }
  }

  // ============================================================
  // CHECK GMAIL CONNECTION
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
        'Error checking Google Gmail connection:',
        error
      );

      return false;
    }
  }

  // ============================================================
  // SET GMAIL CREDENTIALS
  // ============================================================

  async setCredentials(userId) {
    try {
      const tokens =
        await this.getTokens(userId);

      if (!tokens) {
        const error =
          new Error(
            'GOOGLE_GMAIL_NOT_CONNECTED'
          );

        error.code =
          'GOOGLE_GMAIL_NOT_CONNECTED';

        throw error;
      }

      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      this.oauth2Client.setCredentials(
        tokens
      );

      // --------------------------------------------------------
      // Refresh token if it is expired or about to expire
      // --------------------------------------------------------

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
        'Error setting Google Gmail credentials:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // REFRESH GMAIL ACCESS TOKEN
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
            'GOOGLE_GMAIL_RECONNECT_REQUIRED'
          );

        error.code =
          'GOOGLE_GMAIL_RECONNECT_REQUIRED';

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

      console.log(
        'Google Gmail access token refreshed for user:',
        userId
      );

      return credentials;
    } catch (error) {
      console.error(
        'Error refreshing Google Gmail access token:',
        error
      );

      const errorText =
        error?.message?.toLowerCase() || '';

      if (
        errorText.includes('invalid_grant') ||
        errorText.includes('invalid grant')
      ) {
        const reconnectError =
          new Error(
            'GOOGLE_GMAIL_RECONNECT_REQUIRED'
          );

        reconnectError.code =
          'GOOGLE_GMAIL_RECONNECT_REQUIRED';

        throw reconnectError;
      }

      throw error;
    }
  }

  // ============================================================
  // GMAIL AUTH URL
  //
  // ONLY GMAIL SCOPES
  // ============================================================

  getAuthUrl(state) {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }

    const gmailScopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',

      prompt: 'consent',

      scope: gmailScopes,

      state,
    });
  }

  // ============================================================
  // EXCHANGE GMAIL GOOGLE CODE
  // ============================================================

  async exchangeCodeForTokens(
    code,
    userId
  ) {
    try {
      if (!code) {
        throw new Error(
          'Google Gmail authorization code is missing'
        );
      }

      if (!userId) {
        throw new Error(
          'User ID is required'
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

      console.log(
        'Google Gmail OAuth scopes received:',
        tokens.scope
      );

      await this.storeTokens(
        userId,
        tokens
      );

      return tokens;
    } catch (error) {
      console.error(
        'Error exchanging Google Gmail authorization code:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // SEND EMAIL
  // ============================================================

  async sendEmail(
    userId,
    to,
    subject,
    body,
    isHtml = false
  ) {
    try {
      await this.setCredentials(
        userId
      );

      const contentType = isHtml
        ? 'text/html'
        : 'text/plain';

      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: ${contentType}; charset=utf-8`,
        '',
        body,
      ].join('\r\n');

      const encodedEmail =
        Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

      const response =
        await this.gmail.users.messages.send({
          userId: 'me',

          requestBody: {
            raw: encodedEmail,
          },
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error sending Gmail email:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // GET RECENT EMAILS
  // ============================================================

  async getRecentEmails(
    userId,
    maxResults = 10
  ) {
    try {
      await this.setCredentials(
        userId
      );

      const response =
        await this.gmail.users.messages.list({
          userId: 'me',

          maxResults,

          labelIds: ['INBOX'],
        });

      const messages =
        response.data.messages || [];

      const fullMessages =
        await Promise.all(
          messages.map(
            async (message) => {
              const detail =
                await this.gmail.users.messages.get({
                  userId: 'me',

                  id: message.id,

                  format: 'metadata',

                  metadataHeaders: [
                    'From',
                    'Subject',
                    'Date',
                  ],
                });

              return detail.data;
            }
          )
        );

      return fullMessages;
    } catch (error) {
      console.error(
        'Error getting recent Gmail emails:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // GET EMAIL BY ID
  // ============================================================

  async getEmailById(
    userId,
    messageId
  ) {
    try {
      await this.setCredentials(
        userId
      );

      const response =
        await this.gmail.users.messages.get({
          userId: 'me',

          id: messageId,

          format: 'full',
        });

      return response.data;
    } catch (error) {
      console.error(
        'Error getting Gmail email by ID:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // REVOKE GMAIL TOKENS ONLY
  //
  // IMPORTANT:
  //
  // This does NOT touch Calendar tokens.
  // ============================================================

  async revokeTokens(userId) {
    try {
      const tokens =
        await this.getTokens(userId);

      if (tokens?.access_token) {
        try {
          if (!this.oauth2Client) {
            this.initializeOAuth2Client();
          }

          await this.oauth2Client.revokeToken(
            tokens.access_token
          );
        } catch (googleError) {
          console.warn(
            'Google Gmail token revoke failed:',
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

      console.log(
        'Google Gmail connection revoked for user:',
        userId
      );

      return true;
    } catch (error) {
      console.error(
        'Error revoking Google Gmail tokens:',
        error
      );

      throw new Error(
        'Failed to revoke Google Gmail connection'
      );
    }
  }
}

export default new GmailService();