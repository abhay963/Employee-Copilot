import { google } from 'googleapis';
import { config } from '../config/index.js';
import { query } from '../db/connection.js';

class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
  }

  // Initialize OAuth2 client
  initializeOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Store OAuth tokens for a user (shared with Calendar service)
  async storeTokens(userId, tokens) {
    try {
      const expiresAt = tokens.expiry_date 
        ? new Date(tokens.expiry_date).toISOString() 
        : null;

      await query(
        `INSERT INTO google_oauth_tokens (user_id, access_token, refresh_token, token_type, expires_at, scope)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
           token_type = EXCLUDED.token_type,
           expires_at = EXCLUDED.expires_at,
           scope = EXCLUDED.scope,
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.token_type || 'Bearer',
          expiresAt,
          tokens.scope || null
        ]
      );
      return true;
    } catch (error) {
      console.error('Error storing OAuth tokens:', error);
      throw new Error('Failed to store OAuth tokens');
    }
  }

  // Get OAuth tokens for a user
  async getTokens(userId) {
    try {
      const result = await query(
        'SELECT * FROM google_oauth_tokens WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : null,
        scope: tokenData.scope
      };
    } catch (error) {
      console.error('Error getting OAuth tokens:', error);
      throw new Error('Failed to get OAuth tokens');
    }
  }

  // Set credentials for a user
  async setCredentials(userId) {
    try {
      const tokens = await this.getTokens(userId);
      if (!tokens) {
        throw new Error('No OAuth tokens found for user');
      }

      this.initializeOAuth2Client();
      this.oauth2Client.setCredentials(tokens);

      // Check if token needs refresh
      if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
        await this.refreshAccessToken(userId);
      }

      return true;
    } catch (error) {
      console.error('Error setting credentials:', error);
      throw new Error('Failed to set OAuth credentials');
    }
  }

  // Refresh access token
  async refreshAccessToken(userId) {
    try {
      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      const tokens = await this.getTokens(userId);
      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available');
      }

      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      await this.storeTokens(userId, credentials);
      this.oauth2Client.setCredentials(credentials);

      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Get authorization URL
  getAuthUrl(state = null) {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code, userId) {
    try {
      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      await this.storeTokens(userId, tokens);

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Send email
  async sendEmail(userId, to, subject, body, isHtml = false) {
    try {
      await this.setCredentials(userId);

      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body
      ].join('\r\n');

      const encodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Get recent emails
  async getRecentEmails(userId, maxResults = 10) {
    try {
      await this.setCredentials(userId);

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        labelIds: ['INBOX']
      });

      const messages = response.data.messages || [];

      // Get full message details for each message
      const fullMessages = await Promise.all(
        messages.map(async (message) => {
          const detail = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          });
          return detail.data;
        })
      );

      return fullMessages;
    } catch (error) {
      console.error('Error getting recent emails:', error);
      throw new Error('Failed to get recent emails');
    }
  }

  // Get email by ID
  async getEmailById(userId, messageId) {
    try {
      await this.setCredentials(userId);

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting email by ID:', error);
      throw new Error('Failed to get email');
    }
  }

  // Revoke OAuth tokens for a user
  async revokeTokens(userId) {
    try {
      await query('DELETE FROM google_oauth_tokens WHERE user_id = $1', [userId]);
      return true;
    } catch (error) {
      console.error('Error revoking tokens:', error);
      throw new Error('Failed to revoke OAuth tokens');
    }
  }
}

export default new GmailService();