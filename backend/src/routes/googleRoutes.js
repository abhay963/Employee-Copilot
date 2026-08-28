import express from 'express';
import { authenticate } from '../middleware/auth.js';
import googleCalendarService from '../services/googleCalendarService.js';
import gmailService from '../services/gmailService.js';

const router = express.Router();

// Google OAuth routes
router.get('/auth/url', authenticate, (req, res) => {
  try {
    const state = req.user.id; // Use user ID as state
    const authUrl = googleCalendarService.getAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

router.post('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Code and state are required' });
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.exchangeCodeForTokens(code, state);
    
    res.json({ 
      success: true,
      message: 'OAuth tokens stored successfully'
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ error: 'Failed to handle OAuth callback' });
  }
});

// Calendar routes
router.get('/calendar/conflicts', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const conflicts = await googleCalendarService.checkConflicts(
      req.user.id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      ...conflicts
    });
  } catch (error) {
    console.error('Error checking calendar conflicts:', error);
    res.status(500).json({ error: 'Failed to check calendar conflicts' });
  }
});

router.get('/calendar/events', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const events = await googleCalendarService.getEvents(
      req.user.id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error getting calendar events:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

router.post('/calendar/events', authenticate, async (req, res) => {
  try {
    const eventData = req.body;
    
    const event = await googleCalendarService.createEvent(
      req.user.id,
      eventData
    );

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Gmail routes
router.post('/gmail/send', authenticate, async (req, res) => {
  try {
    const { to, subject, body, isHtml } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required' });
    }

    const result = await gmailService.sendEmail(
      req.user.id,
      to,
      subject,
      body,
      isHtml || false
    );

    res.json({
      success: true,
      message: 'Email sent successfully',
      result
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.get('/gmail/recent', authenticate, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    
    const emails = await gmailService.getRecentEmails(
      req.user.id,
      maxResults
    );

    res.json({
      success: true,
      emails
    });
  } catch (error) {
    console.error('Error getting recent emails:', error);
    res.status(500).json({ error: 'Failed to get recent emails' });
  }
});

router.get('/gmail/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const email = await gmailService.getEmailById(
      req.user.id,
      messageId
    );

    res.json({
      success: true,
      email
    });
  } catch (error) {
    console.error('Error getting email by ID:', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
});

// Revoke OAuth tokens
router.delete('/auth/revoke', authenticate, async (req, res) => {
  try {
    await googleCalendarService.revokeTokens(req.user.id);
    
    res.json({
      success: true,
      message: 'OAuth tokens revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking tokens:', error);
    res.status(500).json({ error: 'Failed to revoke OAuth tokens' });
  }
});

export default router;