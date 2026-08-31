// ============================================================
// STRUCTURED LOGGING SERVICE
// ============================================================
// Provides structured logging for observability and debugging
// ============================================================

class LoggingService {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  // ============================================================
  // LOG LEVELS
  // ============================================================

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  // ============================================================
  // STRUCTURED LOG ENTRY
  // ============================================================

  log(level, context, event, data = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      event,
      ...this.sanitizeData(data)
    };

    // Output based on level
    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'debug':
        console.debug(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }

  // ============================================================
  // SANITIZE DATA
  // ============================================================

  sanitizeData(data) {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'access_token', 'refresh_token', 'authorization'];
    
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(data);
  }

  // ============================================================
  // CONVERSATION LOGGING
  // ============================================================

  logConversationEvent(conversationId, userId, event, data = {}) {
    this.log('info', 'conversation', event, {
      conversationId,
      userId,
      ...data
    });
  }

  logConversationError(conversationId, userId, error, data = {}) {
    this.log('error', 'conversation', 'error', {
      conversationId,
      userId,
      error: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...data
    });
  }

  // ============================================================
  // WORKFLOW LOGGING
  // ============================================================

  logWorkflowEvent(conversationId, userId, workflowType, event, data = {}) {
    this.log('info', 'workflow', event, {
      conversationId,
      userId,
      workflowType,
      ...data
    });
  }

  logWorkflowTransition(conversationId, userId, workflowType, fromStep, toStep, data = {}) {
    this.log('info', 'workflow', 'transition', {
      conversationId,
      userId,
      workflowType,
      fromStep,
      toStep,
      ...data
    });
  }

  logWorkflowError(conversationId, userId, workflowType, error, data = {}) {
    this.log('error', 'workflow', 'error', {
      conversationId,
      userId,
      workflowType,
      error: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...data
    });
  }

  // ============================================================
  // LEAVE WORKFLOW LOGGING
  // ============================================================

  logLeaveWorkflowStart(conversationId, userId, leaveDetails) {
    this.logWorkflowEvent(conversationId, userId, 'leave_request', 'start', {
      leaveType: leaveDetails.leave_type,
      startDate: leaveDetails.start_date,
      endDate: leaveDetails.end_date,
      numberOfDays: leaveDetails.number_of_days
    });
  }

  logLeaveWorkflowValidation(conversationId, userId, validationResult) {
    this.logWorkflowEvent(conversationId, userId, 'leave_request', 'validation', {
      valid: validationResult.valid,
      errors: validationResult.errors || [],
      warnings: validationResult.warnings || []
    });
  }

  logLeaveWorkflowConfirmation(conversationId, userId, actionId, leaveDetails) {
    this.logWorkflowEvent(conversationId, userId, 'leave_request', 'confirmation', {
      actionId,
      leaveType: leaveDetails.leave_type,
      startDate: leaveDetails.start_date,
      endDate: leaveDetails.end_date,
      numberOfDays: leaveDetails.number_of_days
    });
  }

  logLeaveWorkflowSubmission(conversationId, userId, actionId, result) {
    this.logWorkflowEvent(conversationId, userId, 'leave_request', 'submission', {
      actionId,
      success: result.success,
      leaveRequestId: result.leaveRequest?.id,
      error: result.error
    });
  }

  logLeaveWorkflowCancellation(conversationId, userId, actionId) {
    this.logWorkflowEvent(conversationId, userId, 'leave_request', 'cancellation', {
      actionId
    });
  }

  // ============================================================
  // CALENDAR LOGGING
  // ============================================================

  logCalendarCheck(conversationId, userId, startDate, endDate, result) {
    this.log('info', 'calendar', 'check', {
      conversationId,
      userId,
      startDate,
      endDate,
      status: result.status,
      hasConflicts: result.hasConflicts,
      conflictCount: result.conflicts?.length || 0
    });
  }

  logCalendarError(conversationId, userId, error) {
    this.log('error', 'calendar', 'error', {
      conversationId,
      userId,
      error: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }

  // ============================================================
  // AI/LLM LOGGING
  // ============================================================

  logAIRequest(userId, conversationId, intent, message) {
    this.log('info', 'ai', 'request', {
      userId,
      conversationId,
      intent,
      messageLength: message?.length || 0
    });
  }

  logAIResponse(userId, conversationId, intent, response, metadata = {}) {
    this.log('info', 'ai', 'response', {
      userId,
      conversationId,
      intent,
      responseLength: response?.length || 0,
      requiresConfirmation: metadata.requiresConfirmation,
      hasPendingAction: metadata.hasPendingAction,
      processingTime: metadata.processingTime
    });
  }

  logAIError(userId, conversationId, error, metadata = {}) {
    this.log('error', 'ai', 'error', {
      userId,
      conversationId,
      error: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...metadata
    });
  }

  // ============================================================
  // INTEGRATION LOGGING
  // ============================================================

  logIntegrationCall(service, operation, userId, data = {}) {
    this.log('info', 'integration', 'call', {
      service,
      operation,
      userId,
      ...data
    });
  }

  logIntegrationSuccess(service, operation, userId, data = {}) {
    this.log('info', 'integration', 'success', {
      service,
      operation,
      userId,
      ...data
    });
  }

  logIntegrationFailure(service, operation, userId, error, data = {}) {
    this.log('error', 'integration', 'failure', {
      service,
      operation,
      userId,
      error: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...data
    });
  }

  // ============================================================
  // PERFORMANCE LOGGING
  // ============================================================

  logPerformance(context, operation, duration, data = {}) {
    this.log('info', 'performance', 'timing', {
      context,
      operation,
      duration,
      ...data
    });
  }

  // ============================================================
  // SECURITY LOGGING
  // ============================================================

  logSecurityEvent(userId, event, data = {}) {
    this.log('warn', 'security', event, {
      userId,
      ...data
    });
  }

  logAuthEvent(userId, event, data = {}) {
    this.log('info', 'auth', event, {
      userId,
      ...data
    });
  }
}

export default new LoggingService();