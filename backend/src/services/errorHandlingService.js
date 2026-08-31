// ============================================================
// ERROR HANDLING SERVICE
// ============================================================
// Centralized error handling with graceful degradation for all integrations
// ============================================================

class ErrorHandlingService {
  // ============================================================
  // HANDLE GOOGLE CALENDAR ERRORS
  // ============================================================

  handleCalendarError(error) {
    console.error('[ErrorHandlingService] Calendar error:', error);

    // Connection errors
    if (error.code === 'GOOGLE_NOT_CONNECTED' || error.message === 'GOOGLE_NOT_CONNECTED') {
      return {
        shouldFail: false,
        userMessage: 'Your Google Calendar is not connected. Calendar features are unavailable, but you can continue with other tasks.',
        logLevel: 'warn'
      };
    }

    if (error.code === 'GOOGLE_RECONNECT_REQUIRED' || error.message === 'GOOGLE_RECONNECT_REQUIRED') {
      return {
        shouldFail: false,
        userMessage: 'Your Google Calendar connection needs to be renewed. Please reconnect it from the Calendar page.',
        logLevel: 'warn'
      };
    }

    // Network/API errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return {
        shouldFail: false,
        userMessage: 'Google Calendar is temporarily unavailable. Please try again later.',
        logLevel: 'warn'
      };
    }

    // Token errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('token')) {
      return {
        shouldFail: false,
        userMessage: 'Your Google Calendar authentication has expired. Please reconnect your account.',
        logLevel: 'warn'
      };
    }

    // Rate limiting
    if (error.code === 429 || error.status === 429) {
      return {
        shouldFail: false,
        userMessage: 'Google Calendar is rate-limited. Please try again in a few minutes.',
        logLevel: 'warn'
      };
    }

    // Default: don't fail the workflow, but log the error
    return {
      shouldFail: false,
      userMessage: 'Google Calendar encountered an error. Calendar features are temporarily unavailable.',
      logLevel: 'error'
    };
  }

  // ============================================================
  // HANDLE GMAIL ERRORS
  // ============================================================

  handleGmailError(error) {
    console.error('[ErrorHandlingService] Gmail error:', error);

    // Connection errors
    if (error.code === 'GOOGLE_NOT_CONNECTED' || error.message === 'GOOGLE_NOT_CONNECTED') {
      return {
        shouldFail: false,
        userMessage: 'Your Gmail is not connected. Email features are unavailable, but you can continue with other tasks.',
        logLevel: 'warn'
      };
    }

    if (error.code === 'GOOGLE_RECONNECT_REQUIRED' || error.message === 'GOOGLE_RECONNECT_REQUIRED') {
      return {
        shouldFail: false,
        userMessage: 'Your Gmail connection needs to be renewed. Please reconnect it from the settings page.',
        logLevel: 'warn'
      };
    }

    // Network/API errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return {
        shouldFail: false,
        userMessage: 'Gmail is temporarily unavailable. Please try again later.',
        logLevel: 'warn'
      };
    }

    // Authentication errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('token')) {
      return {
        shouldFail: false,
        userMessage: 'Your Gmail authentication has expired. Please reconnect your account.',
        logLevel: 'warn'
      };
    }

    // Email sending errors
    if (error.message?.includes('email') || error.message?.includes('recipient')) {
      return {
        shouldFail: false,
        userMessage: 'There was an issue sending the email. Please check the recipient address and try again.',
        logLevel: 'warn'
      };
    }

    // Default: don't fail the workflow
    return {
      shouldFail: false,
      userMessage: 'Gmail encountered an error. Email features are temporarily unavailable.',
      logLevel: 'error'
    };
  }

  // ============================================================
  // HANDLE RAG ERRORS
  // ============================================================

  handleRAGError(error) {
    console.error('[ErrorHandlingService] RAG error:', error);

    // Database errors
    if (error.code?.includes('database') || error.message?.includes('database')) {
      return {
        shouldFail: false,
        userMessage: 'Company knowledge is temporarily unavailable. I can still help with other tasks.',
        logLevel: 'error'
      };
    }

    // Vector search errors
    if (error.message?.includes('vector') || error.message?.includes('embedding')) {
      return {
        shouldFail: false,
        userMessage: 'Knowledge search is temporarily unavailable. I can still help with other tasks.',
        logLevel: 'error'
      };
    }

    // Default: provide graceful fallback
    return {
      shouldFail: false,
      userMessage: 'I could not access the company knowledge right now. Please try again.',
      logLevel: 'error'
    };
  }

  // ============================================================
  // HANDLE DATABASE ERRORS
  // ============================================================

  handleDatabaseError(error) {
    console.error('[ErrorHandlingService] Database error:', error);

    // Connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        shouldFail: true,
        userMessage: 'Database connection failed. Please try again later.',
        logLevel: 'error'
      };
    }

    // Constraint violations
    if (error.code?.includes('constraint') || error.message?.includes('constraint')) {
      return {
        shouldFail: true,
        userMessage: 'This action conflicts with existing data. Please check your request.',
        logLevel: 'warn'
      };
    }

    // Default: database errors should fail the operation
    return {
      shouldFail: true,
      userMessage: 'A database error occurred. Please try again.',
      logLevel: 'error'
    };
  }

  // ============================================================
  // HANDLE LLM ERRORS
  // ============================================================

  handleLLMError(error) {
    console.error('[ErrorHandlingService] LLM error:', error);

    // API key errors
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return {
        shouldFail: true,
        userMessage: 'AI service authentication failed. Please contact support.',
        logLevel: 'error'
      };
    }

    // Rate limiting
    if (error.status === 429 || error.code === 429) {
      return {
        shouldFail: false,
        userMessage: 'AI service is rate-limited. Please try again in a few moments.',
        logLevel: 'warn'
      };
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        shouldFail: false,
        userMessage: 'AI service is temporarily unavailable. Please try again.',
      logLevel: 'warn'
      };
    }

    // Content policy violations
    if (error.message?.includes('policy') || error.message?.includes('safety')) {
      return {
        shouldFail: false,
        userMessage: 'I could not process that request due to content guidelines.',
        logLevel: 'warn'
      };
    }

    // Default: provide graceful fallback
    return {
      shouldFail: false,
      userMessage: 'I encountered an error processing your request. Please try again.',
      logLevel: 'error'
    };
  }

  // ============================================================
  // HANDLE GENERAL ERRORS
  // ============================================================

  handleGeneralError(error) {
    console.error('[ErrorHandlingService] General error:', error);

    // Validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return {
        shouldFail: false,
        userMessage: error.message || 'Please check your input and try again.',
        logLevel: 'warn'
      };
    }

    // Permission errors
    if (error.message?.includes('permission') || error.message?.includes('access denied')) {
      return {
        shouldFail: true,
        userMessage: 'You do not have permission to perform this action.',
        logLevel: 'warn'
      };
    }

    // Default
    return {
      shouldFail: false,
      userMessage: 'An unexpected error occurred. Please try again.',
      logLevel: 'error'
    };
  }

  // ============================================================
  // WRAP FUNCTION WITH ERROR HANDLING
  // ============================================================

  async withErrorHandling(fn, errorType = 'general') {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        error: null,
        userMessage: null,
        shouldFail: false
      };
    } catch (error) {
      let handledError;

      switch (errorType) {
        case 'calendar':
          handledError = this.handleCalendarError(error);
          break;
        case 'gmail':
          handledError = this.handleGmailError(error);
          break;
        case 'rag':
          handledError = this.handleRAGError(error);
          break;
        case 'database':
          handledError = this.handleDatabaseError(error);
          break;
        case 'llm':
          handledError = this.handleLLMError(error);
          break;
        default:
          handledError = this.handleGeneralError(error);
      }

      // Log at appropriate level
      if (handledError.logLevel === 'error') {
        console.error(`[${errorType.toUpperCase()}]`, error);
      } else if (handledError.logLevel === 'warn') {
        console.warn(`[${errorType.toUpperCase()}]`, error);
      }

      // Return error information
      return {
        success: !handledError.shouldFail,
        data: null,
        error: error.message,
        userMessage: handledError.userMessage,
        shouldFail: handledError.shouldFail
      };
    }
  }

  // ============================================================
  // LOG STRUCTURED ERROR
  // ============================================================

  logStructuredError(context, errorType, error, additionalData = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context,
      errorType,
      error: {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      ...additionalData
    };

    // Remove sensitive data
    const sanitizedLogEntry = this.sanitizeLogEntry(logEntry);

    console.error('[StructuredError]', JSON.stringify(sanitizedLogEntry));
  }

  // ============================================================
  // SANITIZE LOG ENTRY
  // ============================================================

  sanitizeLogEntry(logEntry) {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'access_token', 'refresh_token'];
    
    const sanitized = { ...logEntry };
    
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

    return sanitizeObject(sanitized);
  }
}

export default new ErrorHandlingService();