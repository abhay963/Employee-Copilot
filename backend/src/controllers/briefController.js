import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { User } from '../models/User.js';
import DailyBrief from '../models/DailyBrief.js';
import geminiLLM from '../ai/llm/gemini.js';
import googleCalendarService from '../services/googleCalendarService.js';
import gmailService from '../services/gmailService.js';

class BriefController {
  async getLatestBrief(req, res) {
    try {
      const userId = req.user.id;
      
      console.log(`[BriefController] Getting latest brief for user ${userId}`);
      
      const latestBrief = await DailyBrief.findLatestByUserId(userId);
      
      if (!latestBrief) {
        return res.json({
          success: true,
          hasBrief: false,
          brief: null,
        });
      }
      
      return res.json({
        success: true,
        hasBrief: true,
        brief: {
          ...latestBrief.brief_data,
          id: latestBrief.id,
          generatedAt: latestBrief.generated_at,
          sources: latestBrief.sources,
        },
      });
    } catch (error) {
      console.error('[BriefController] Error getting latest brief:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve daily brief',
      });
    }
  }

  async generateDailyBrief(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      console.log(`[BriefController] Generating daily brief for user ${userId}, role ${userRole}`);

      // Gather role-specific information
      const briefData = await this.gatherBriefData(userId, userRole);

      // Generate AI-powered brief
      const brief = await this.generateAIBrief(briefData, userRole);

      // Save the brief to database
      const savedBrief = await DailyBrief.create(userId, brief, briefData.sources);

      return res.json({
        success: true,
        brief: {
          ...brief,
          id: savedBrief.id,
          generatedAt: savedBrief.generated_at,
          sources: briefData.sources,
        },
      });
    } catch (error) {
      console.error('[BriefController] Error generating brief:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate daily brief',
      });
    }
  }

  async gatherBriefData(userId, userRole) {
    const data = {
      user: {
        id: userId,
        role: userRole,
      },
      sources: [],
      items: [],
      todayEvents: [],
      upcomingEvents: [],
      emails: [],
      leaveBalance: null,
      pendingLeaveRequests: [],
    };

    try {
      // Leave information (all roles)
      const leaveData = await this.getLeaveData(userId, userRole);
      data.items.push(...leaveData.items);
      data.sources.push(...leaveData.sources);
      data.leaveBalance = leaveData.leaveBalance;
      data.pendingLeaveRequests = leaveData.pendingLeaveRequests;
    } catch (error) {
      console.error('[BriefController] Error gathering leave data:', error);
    }

    try {
      // Calendar information (all roles)
      const calendarData = await this.getCalendarData(userId, userRole);
      data.items.push(...calendarData.items);
      data.sources.push(...calendarData.sources);
      data.todayEvents = calendarData.todayEvents;
      data.upcomingEvents = calendarData.upcomingEvents;
    } catch (error) {
      console.error('[BriefController] Error gathering calendar data:', error);
    }

    try {
      // Gmail information (all roles)
      const emailData = await this.getEmailData(userId, userRole);
      data.items.push(...emailData.items);
      data.sources.push(...emailData.sources);
      data.emails = emailData.emails;
    } catch (error) {
      console.error('[BriefController] Error gathering email data:', error);
    }

    // Role-specific additional data
    if (userRole === 'hr') {
      try {
        const hrData = await this.getHRData(userId);
        data.items.push(...hrData.items);
        data.sources.push(...hrData.sources);
      } catch (error) {
        console.error('[BriefController] Error gathering HR data:', error);
      }
    }

    if (userRole === 'admin') {
      try {
        const adminData = await this.getAdminData(userId);
        data.items.push(...adminData.items);
        data.sources.push(...adminData.sources);
      } catch (error) {
        console.error('[BriefController] Error gathering admin data:', error);
      }
    }

    // Prioritize items
    data.items = this.prioritizeItems(data.items);

    return data;
  }

  async getLeaveData(userId, userRole) {
    const items = [];
    const sources = ['leave'];
    let leaveBalance = null;
    let pendingLeaveRequests = [];

    try {
      // Get leave balance
      const balance = await LeaveBalance.findByUserId(userId);
      if (balance) {
        leaveBalance = {
          annual: balance.annual_leave,
          sick: balance.sick_leave,
          personal: balance.personal_leave,
        };
        
        items.push({
          category: 'leave',
          priority: 'medium',
          title: `Leave Balance: ${balance.annual_leave} annual, ${balance.sick_leave} sick, ${balance.personal_leave} personal days remaining`,
          description: 'Your current leave balance',
          actionable: false,
        });
      }

      // Get pending leave requests
      if (userRole === 'employee') {
        const myRequests = await LeaveRequest.findByUserId(userId);
        pendingLeaveRequests = myRequests.filter(req => req.status === 'pending');
        
        if (pendingLeaveRequests.length > 0) {
          pendingLeaveRequests.forEach(req => {
            items.push({
              category: 'leave',
              priority: 'high',
              title: `Leave request pending: ${req.leave_type} from ${req.start_date} to ${req.end_date}`,
              description: `${req.number_of_days} day(s) - Awaiting approval`,
              actionable: true,
              time: req.created_at,
            });
          });
        }
      }

      // HR can see pending approvals
      if (userRole === 'hr') {
        const pendingApprovals = await LeaveRequest.getPendingRequests();
        if (pendingApprovals.length > 0) {
          items.push({
            category: 'approval',
            priority: 'high',
            title: `${pendingApprovals.length} leave requests pending approval`,
            description: 'Review and approve/reject pending leave requests',
            actionable: true,
          });
        }
      }
    } catch (error) {
      console.error('[BriefController] Error getting leave data:', error);
    }

    return { items, sources, leaveBalance, pendingLeaveRequests };
  }

  async getCalendarData(userId, userRole) {
    const items = [];
    const todayEvents = [];
    const upcomingEvents = [];
    const sources = ['calendar'];

    try {
      const isConnected = await googleCalendarService.isConnected(userId);
      
      if (isConnected) {
        // Get today's date in user's timezone
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        // Fetch events for today through next week
        const events = await googleCalendarService.getEvents(
          userId,
          formatDate(today),
          formatDate(nextWeek)
        );

        if (events && events.length > 0) {
          events.forEach(event => {
            const startTime = event.start?.dateTime || event.start?.date;
            const endTime = event.end?.dateTime || event.end?.date;
            const eventDate = new Date(startTime);
            
            const eventData = {
              category: 'calendar',
              priority: 'medium',
              title: event.summary || 'Meeting',
              description: event.description || '',
              startTime: startTime,
              endTime: endTime,
              actionable: false,
              time: startTime,
              isToday: eventDate >= today && eventDate < tomorrow,
            };
            
            // Separate today's events from upcoming
            if (eventData.isToday) {
              todayEvents.push(eventData);
            } else if (eventDate >= tomorrow) {
              upcomingEvents.push(eventData);
            }
            
            items.push(eventData);
          });
        }
      } else {
        sources.push('calendar (not connected)');
      }
    } catch (error) {
      console.error('[BriefController] Error getting calendar data:', error);
      sources.push('calendar (error)');
    }

    return { items, sources, todayEvents, upcomingEvents };
  }

  async getEmailData(userId, userRole) {
    const items = [];
    const emails = [];
    const sources = ['gmail'];

    try {
      const isConnected = await gmailService.isConnected(userId);
      
      if (isConnected) {
        const recentEmails = await gmailService.getRecentEmails(userId, 10);
        
        if (recentEmails && recentEmails.length > 0) {
          // Smart email prioritization for daily brief
          const importantEmails = this.prioritizeEmails(recentEmails);

          if (importantEmails.length > 0) {
            items.push({
              category: 'email',
              priority: 'medium',
              title: `${importantEmails.length} important emails require attention`,
              description: 'Check your inbox for urgent messages',
              actionable: true,
            });
            
            // Store actual email data for the brief
            emails.push(...importantEmails.map(email => ({
              id: email.id,
              from: this.extractSenderName(email.from),
              subject: email.subject || 'No subject',
              snippet: email.snippet || '',
              timestamp: email.timestamp || new Date(),
              labels: email.labels || [],
              isUnread: email.labels?.includes('UNREAD'),
            })));
          } else {
            // Only show "Inbox is clear" if there are genuinely no emails
            if (recentEmails.length === 0) {
              items.push({
                category: 'email',
                priority: 'low',
                title: 'Inbox is clear',
                description: 'No new emails',
                actionable: false,
              });
            } else {
              // There are emails but none classified as important
              items.push({
                category: 'email',
                priority: 'low',
                title: 'No priority emails',
                description: `${recentEmails.length} emails in inbox`,
                actionable: false,
              });
            }
          }
        } else {
          // No emails at all
          items.push({
            category: 'email',
            priority: 'low',
            title: 'Inbox is clear',
            description: 'No new emails',
            actionable: false,
          });
        }
      } else {
        sources.push('gmail (not connected)');
      }
    } catch (error) {
      console.error('[BriefController] Error getting email data:', error);
      sources.push('gmail (error)');
    }

    return { items, sources, emails };
  }

  prioritizeEmails(emails) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return emails.filter(email => {
      const emailDate = new Date(email.timestamp || now);
      const isRecent = emailDate >= oneDayAgo;
      const isUnread = email.labels?.includes('UNREAD');
      const isImportant = email.labels?.includes('IMPORTANT');
      const hasCalendarInvite = this.isCalendarInvite(email);
      const isFromHR = this.isFromHR(email);
      const isFromManager = this.isFromManager(email);
      
      // High priority: recent + important, or recent + unread, or calendar invites
      if (isRecent && (isImportant || isUnread || hasCalendarInvite)) {
        return true;
      }
      
      // Medium priority: HR or manager emails, or recent important
      if (isFromHR || isFromManager || (isImportant && isRecent)) {
        return true;
      }
      
      return false;
    }).slice(0, 5); // Limit to top 5 important emails
  }

  extractSenderName(fromString) {
    if (!fromString) return 'Unknown';
    
    // Handle format: "Name <email@example.com>" or just "email@example.com"
    const match = fromString.match(/"?([^"<]+)"?\s*<([^>]+)>/);
    if (match) {
      return match[1].trim();
    }
    
    // If no angle brackets, return the string
    return fromString.split('<')[0].trim();
  }

  isCalendarInvite(email) {
    const subject = (email.subject || '').toLowerCase();
    const keywords = ['invite', 'invitation', 'meeting', 'calendar', 'schedule', 'agenda'];
    return keywords.some(keyword => subject.includes(keyword));
  }

  isFromHR(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const hrKeywords = ['hr', 'human resources', 'people', 'leave', 'policy', 'benefits'];
    
    return hrKeywords.some(keyword => 
      from.includes(keyword) || subject.includes(keyword)
    );
  }

  isFromManager(email) {
    const from = (email.from || '').toLowerCase();
    const managerKeywords = ['manager', 'lead', 'director', 'head', 'supervisor'];
    
    return managerKeywords.some(keyword => from.includes(keyword));
  }

  async getHRData(userId) {
    const items = [];
    const sources = ['hr'];

    try {
      // Get total pending leave requests
      const pendingRequests = await LeaveRequest.getPendingRequests();
      
      if (pendingRequests.length > 0) {
        items.push({
          category: 'approval',
          priority: 'high',
          title: `${pendingRequests.length} leave requests awaiting your review`,
          description: 'Review and approve/reject pending leave requests',
          actionable: true,
        });
      }

      // Get total employees (could be expanded)
      const allUsers = await User.getAll();
      if (allUsers && allUsers.length > 0) {
        items.push({
          category: 'hr',
          priority: 'low',
          title: `${allUsers.length} employees in the system`,
          description: 'Total employee count',
          actionable: false,
        });
      }
    } catch (error) {
      console.error('[BriefController] Error getting HR data:', error);
    }

    return { items, sources };
  }

  async getAdminData(userId) {
    const items = [];
    const sources = ['admin'];

    try {
      // Get system statistics
      const allUsers = await User.getAll();
      const pendingRequests = await LeaveRequest.getPendingRequests();
      
      items.push({
        category: 'admin',
        priority: 'low',
        title: `${allUsers.length} users, ${pendingRequests.length} pending leave requests`,
        description: 'System overview',
        actionable: false,
      });
    } catch (error) {
      console.error('[BriefController] Error getting admin data:', error);
    }

    return { items, sources };
  }

  prioritizeItems(items) {
    // Sort by priority: high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    return items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by time (most recent first)
      if (a.time && b.time) {
        return new Date(b.time) - new Date(a.time);
      }
      if (a.time) return -1;
      if (b.time) return 1;
      
      return 0;
    });
  }

  async generateAIBrief(data, userRole) {
    try {
      const prompt = this.buildBriefPrompt(data, userRole);
      
      const response = await geminiLLM.invoke(prompt);
      const briefText = response.content || '';

      return this.parseBriefResponse(briefText, data);
    } catch (error) {
      console.error('[BriefController] Error generating AI brief:', error);
      
      // Fallback to simple brief if AI fails
      return this.generateFallbackBrief(data, userRole);
    }
  }

  buildBriefPrompt(data, userRole) {
    const itemsSummary = data.items.map(item => 
      `- [${item.priority.toUpperCase()}] ${item.category}: ${item.title}${item.description ? ` - ${item.description}` : ''}`
    ).join('\n');

    const sourcesSummary = data.sources.join(', ');

    // Add today's calendar information
    const todayCalendarInfo = data.todayEvents && data.todayEvents.length > 0
      ? `\n\nTODAY'S CALENDAR (${data.todayEvents.length} meetings):\n${data.todayEvents.map(e => `- ${e.title} at ${e.startTime ? new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'All day'}`).join('\n')}`
      : '\n\nTODAY\'S CALENDAR: No meetings today';

    // Add upcoming calendar information
    const upcomingCalendarInfo = data.upcomingEvents && data.upcomingEvents.length > 0
      ? `\n\nUPCOMING CALENDAR (next 3):\n${data.upcomingEvents.slice(0, 3).map(e => {
        const eventDate = new Date(e.startTime);
        const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = e.startTime ? new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'All day';
        return `- ${dateStr} · ${timeStr} · ${e.title}`;
      }).join('\n')}`
      : '\n\nUPCOMING CALENDAR: No upcoming events';

    // Add email information
    const emailInfo = data.emails && data.emails.length > 0
      ? `\n\nIMPORTANT EMAILS (${data.emails.length}):\n${data.emails.map(e => `- From ${e.from}: ${e.subject}`).join('\n')}`
      : '\n\nEMAILS: No important emails';

    // Add leave information
    const leaveInfo = data.leaveBalance
      ? `\n\nLEAVE BALANCE: Annual ${data.leaveBalance.annual}, Sick ${data.leaveBalance.sick}, Personal ${data.leaveBalance.personal}`
      : '\n\nLEAVE: No balance information';

    const pendingLeaveInfo = data.pendingLeaveRequests && data.pendingLeaveRequests.length > 0
      ? `\n\nPENDING LEAVE REQUESTS: ${data.pendingLeaveRequests.length}`
      : '\n\nPENDING LEAVE REQUESTS: 0';

    return `You are an AI assistant for an Employee Copilot system. Generate a comprehensive daily brief for a ${userRole} user.

USER ROLE: ${userRole.toUpperCase()}
AVAILABLE DATA SOURCES: ${sourcesSummary}
${todayCalendarInfo}
${upcomingCalendarInfo}
${emailInfo}
${leaveInfo}
${pendingLeaveInfo}

ITEMS TO INCLUDE:
${itemsSummary}

GUIDELINES:
1. Create a comprehensive summary (2-3 sentences) focused on TODAY's activities
2. Focus on today's meetings, important emails, and pending actions
3. Be specific about times, dates, and action items
4. Generate genuine AI insights based on the actual TODAY data
5. DO NOT invent meetings, emails, or priorities
6. If there are no meetings today, clearly state that
7. Format as JSON with this structure:
{
  "summary": "Comprehensive 2-3 sentence summary of TODAY",
  "dayAtAGlance": {
    "meetingCount": number (TODAY only),
    "emailCount": number,
    "pendingLeaveRequests": number,
    "focus": "Today's actual focus or 'Today'"
  },
  "priorities": [
    {
      "rank": number,
      "title": "Priority title",
      "description": "Description",
      "time": "time if applicable",
      "category": "category",
      "priority": "HIGH|MEDIUM|LOW"
    }
  ],
  "todayEvents": [
    {
      "time": "HH:MM AM/PM",
      "title": "Event title",
      "description": "Description if available"
    }
  ],
  "upcomingEvents": [
    {
      "date": "MM/DD",
      "time": "HH:MM AM/PM",
      "title": "Event title"
    }
  ],
  "importantEmails": [
    {
      "from": "Sender name",
      "subject": "Subject",
      "time": "time ago",
      "snippet": "Brief snippet",
      "isUnread": boolean
    }
  ],
  "leaveInformation": {
    "annual": number,
    "sick": number,
    "personal": number,
    "pendingRequests": number
  },
  "aiInsight": "Genuine insight based on TODAY's actual data patterns",
  "companyUpdates": "Relevant company updates if available",
  "recommendation": "One actionable AI recommendation for TODAY",
  "sources": ["list of data sources used"]
}

Return ONLY the JSON, no additional text.`;
  }

  parseBriefResponse(briefText, originalData, userRole) {
    try {
      // Try to extract JSON from response
      const jsonMatch = briefText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Ensure sources are from original data
        parsed.sources = originalData.sources;
        
        // Add raw data for frontend display
        parsed.rawData = {
          todayEvents: originalData.todayEvents || [],
          upcomingEvents: originalData.upcomingEvents || [],
          emails: originalData.emails || [],
          leaveBalance: originalData.leaveBalance || null,
          pendingLeaveRequests: originalData.pendingLeaveRequests || [],
        };
        
        return parsed;
      }
    } catch (error) {
      console.error('[BriefController] Error parsing AI response:', error);
    }

    // Fallback to original data if parsing fails
    return this.generateFallbackBrief(originalData, userRole);
  }

  generateFallbackBrief(data, userRole) {
    const highPriorityItems = data.items.filter(item => item.priority === 'high');
    const mediumPriorityItems = data.items.filter(item => item.priority === 'medium');
    
    const summary = highPriorityItems.length > 0 
      ? `You have ${highPriorityItems.length} urgent item${highPriorityItems.length > 1 ? 's' : ''} requiring attention.`
      : 'No urgent items at this time.';

    const recommendation = highPriorityItems.length > 0
      ? 'Address high-priority items first, then review upcoming events and emails.'
      : 'Review your calendar and emails for any upcoming commitments.';

    // Generate AI insight based on actual data
    const aiInsight = this.generateAIInsight(data);

    return {
      summary,
      dayAtAGlance: {
        meetingCount: data.todayEvents?.length || 0,
        emailCount: data.emails?.length || 0,
        pendingLeaveRequests: data.pendingLeaveRequests?.length || 0,
        focus: 'Today',
      },
      priorities: this.extractPriorities(data.items),
      todayEvents: this.formatTodayEvents(data.todayEvents),
      upcomingEvents: this.formatUpcomingEvents(data.upcomingEvents),
      importantEmails: this.formatEmails(data.emails),
      leaveInformation: this.formatLeaveInfo(data.leaveBalance, data.pendingLeaveRequests),
      aiInsight,
      companyUpdates: null,
      recommendation,
      sources: data.sources,
      rawData: {
        todayEvents: data.todayEvents || [],
        upcomingEvents: data.upcomingEvents || [],
        emails: data.emails || [],
        leaveBalance: data.leaveBalance || null,
        pendingLeaveRequests: data.pendingLeaveRequests || [],
      },
    };
  }

  generateAIInsight(data) {
    const insights = [];
    
    // Check for meeting gaps in TODAY's events
    if (data.todayEvents && data.todayEvents.length > 1) {
      const sortedEvents = data.todayEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentEnd = new Date(sortedEvents[i].endTime);
        const nextStart = new Date(sortedEvents[i + 1].startTime);
        const gap = (nextStart - currentEnd) / (1000 * 60); // gap in minutes
        
        if (gap >= 15 && gap <= 60) {
          insights.push(`You have a ${Math.round(gap)}-minute gap between meetings today. This could be a good time to review your pending emails.`);
          break;
        }
      }
    }
    
    // Check for back-to-back meetings TODAY
    if (data.todayEvents && data.todayEvents.length >= 3) {
      const consecutiveMeetings = data.todayEvents.filter((event, index) => {
        if (index === 0) return false;
        const prevEnd = new Date(data.todayEvents[index - 1].endTime);
        const currentStart = new Date(event.startTime);
        return (currentStart - prevEnd) / (1000 * 60) <= 5;
      });
      
      if (consecutiveMeetings.length >= 2) {
        insights.push('You have back-to-back meetings scheduled today. Consider preparing for your most important meeting beforehand.');
      }
    }
    
    // Check for no urgent items today
    const highPriorityItems = data.items.filter(item => item.priority === 'high');
    if (highPriorityItems.length === 0) {
      insights.push('You have no urgent items today. This may be a good time to review the latest company updates or plan ahead.');
    }
    
    // Check for pending leave
    if (data.pendingLeaveRequests && data.pendingLeaveRequests.length > 0) {
      insights.push(`You have ${data.pendingLeaveRequests.length} pending leave request${data.pendingLeaveRequests.length > 1 ? 's' : ''} awaiting approval.`);
    }
    
    return insights.length > 0 ? insights[0] : 'Review your calendar and emails for any upcoming commitments.';
  }

  extractPriorities(items) {
    return items
      .filter(item => item.priority === 'high' || item.priority === 'medium')
      .slice(0, 5)
      .map((item, index) => ({
        rank: index + 1,
        title: item.title,
        description: item.description || '',
        time: item.time ? new Date(item.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
        category: item.category,
        priority: item.priority?.toUpperCase() || 'MEDIUM',
      }));
  }

  formatTodayEvents(todayEvents) {
    if (!todayEvents) return [];
    
    return todayEvents.map(event => ({
      time: event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'All day',
      title: event.title,
      description: event.description || '',
    }));
  }

  formatUpcomingEvents(upcomingEvents) {
    if (!upcomingEvents) return [];
    
    return upcomingEvents.slice(0, 3).map(event => {
      const eventDate = new Date(event.startTime);
      return {
        date: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'All day',
        title: event.title,
      };
    });
  }

  formatEmails(emails) {
    if (!emails) return [];
    
    return emails.slice(0, 5).map(email => ({
      from: email.from,
      subject: email.subject,
      time: email.timestamp ? this.getTimeAgo(new Date(email.timestamp)) : 'Unknown',
      snippet: email.snippet || '',
      isUnread: email.isUnread || false,
    }));
  }

  formatLeaveInfo(leaveBalance, pendingLeaveRequests) {
    return {
      annual: leaveBalance?.annual || 0,
      sick: leaveBalance?.sick || 0,
      personal: leaveBalance?.personal || 0,
      pendingRequests: pendingLeaveRequests?.length || 0,
    };
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    
    return date.toLocaleDateString();
  }
}

export default new BriefController();
