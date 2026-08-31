import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import conversationStateService, { WORKFLOW_STEPS, CALENDAR_STATUS } from './conversationStateService.js';
import googleCalendarService from './googleCalendarService.js';
import errorHandlingService from './errorHandlingService.js';
import loggingService from './loggingService.js';

// ============================================================
// LEAVE WORKFLOW SERVICE
// ============================================================
// This service implements a deterministic state machine for leave requests
// that maintains conversation context and provides robust validation
// ============================================================

class LeaveWorkflowService {
  // ============================================================
  // INITIALIZE LEAVE WORKFLOW
  // ============================================================

  async initializeLeaveWorkflow(conversationId, userId, leaveDetails) {
    try {
      loggingService.logLeaveWorkflowStart(conversationId, userId, leaveDetails);

      // Get or create conversation state
      const state = await conversationStateService.getOrCreateState(conversationId, userId);

      // Update calendar status
      await conversationStateService.updateCalendarStatus(conversationId, userId);

      // Extract and validate leave details
      const { leave_type, start_date, end_date, reason } = leaveDetails;

      // Transition to COLLECTING_DETAILS if missing information
      if (!leave_type || !start_date || !end_date) {
        await conversationStateService.setWorkflowStep(conversationId, WORKFLOW_STEPS.COLLECTING_DETAILS);
        
        // Store partial information in context
        const partialInfo = {};
        if (leave_type) partialInfo.leave_type = leave_type;
        if (start_date) partialInfo.start_date = start_date;
        if (end_date) partialInfo.end_date = end_date;
        if (reason) partialInfo.reason = reason;

        await conversationStateService.updateState(conversationId, {
          context: { ...state.context, partialLeaveInfo: partialInfo }
        });
        
        loggingService.logWorkflowTransition(conversationId, userId, 'leave_request', 'IDLE', 'COLLECTING_DETAILS', {
          missingFields: this.getMissingFields(leaveDetails)
        });
        
        return {
          success: false,
          workflowStep: WORKFLOW_STEPS.COLLECTING_DETAILS,
          missingFields: this.getMissingFields(leaveDetails),
          partialInfo,
          message: this.getMissingFieldsMessage(leaveDetails, partialInfo)
        };
      }

      // Calculate days
      const number_of_days = await LeaveRequest.calculateDays(start_date, end_date);

      // Set pending action
      const actionId = `leave_request_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      const pendingAction = {
        type: 'leave_request',
        actionId,
        leave_type,
        start_date,
        end_date,
        number_of_days,
        reason: reason || null
      };

      await conversationStateService.setPendingAction(conversationId, pendingAction, actionId);

      // Transition to VALIDATING
      await conversationStateService.setWorkflowStep(conversationId, WORKFLOW_STEPS.VALIDATING);

      loggingService.logWorkflowTransition(conversationId, userId, 'leave_request', 'COLLECTING_DETAILS', 'VALIDATING', {
        actionId,
        leaveType: leave_type,
        numberOfDays: number_of_days
      });

      // Perform validation
      return await this.validateLeaveRequest(conversationId, userId, pendingAction);
    } catch (error) {
      loggingService.logWorkflowError(conversationId, userId, 'leave_request', error);
      console.error('[LeaveWorkflowService] Error initializing leave workflow:', error);
      throw error;
    }
  }

  // ============================================================
  // VALIDATE LEAVE REQUEST
  // ============================================================

  async validateLeaveRequest(conversationId, userId, pendingAction) {
    try {
      const { leave_type, start_date, end_date, number_of_days } = pendingAction;

      // 1. Validate dates
      if (!this.areValidDates(start_date, end_date)) {
        await conversationStateService.clearPendingAction(conversationId);
        loggingService.logLeaveWorkflowValidation(conversationId, userId, {
          valid: false,
          errors: ['INVALID_DATES']
        });
        return {
          success: false,
          workflowStep: WORKFLOW_STEPS.IDLE,
          error: 'INVALID_DATES',
          message: 'The provided dates are invalid. Start date must be before or equal to end date.'
        };
      }

      // 2. Check leave balance
      const hasBalance = await LeaveBalance.checkAvailability(userId, leave_type, number_of_days);
      if (!hasBalance) {
        await conversationStateService.clearPendingAction(conversationId);
        loggingService.logLeaveWorkflowValidation(conversationId, userId, {
          valid: false,
          errors: ['INSUFFICIENT_BALANCE']
        });
        return {
          success: false,
          workflowStep: WORKFLOW_STEPS.IDLE,
          error: 'INSUFFICIENT_BALANCE',
          message: `You don't have enough ${leave_type} leave balance for ${number_of_days} day(s).`
        };
      }

      // 3. Check for overlapping leave
      const overlapping = await LeaveRequest.checkOverlappingLeave(userId, start_date, end_date);
      if (overlapping?.length > 0) {
        await conversationStateService.clearPendingAction(conversationId);
        loggingService.logLeaveWorkflowValidation(conversationId, userId, {
          valid: false,
          errors: ['OVERLAPPING_LEAVE'],
          overlappingCount: overlapping.length
        });
        return {
          success: false,
          workflowStep: WORKFLOW_STEPS.IDLE,
          error: 'OVERLAPPING_LEAVE',
          message: 'You already have a leave request overlapping these dates.',
          overlapping
        };
      }

      // 4. Calendar check (optional, best-effort)
      await conversationStateService.setWorkflowStep(conversationId, WORKFLOW_STEPS.CALENDAR_CHECK);
      
      const calendarResult = await this.checkCalendarConflicts(conversationId, userId, start_date, end_date);

      // 5. Transition to READY_FOR_CONFIRMATION
      await conversationStateService.setWorkflowStep(conversationId, WORKFLOW_STEPS.READY_FOR_CONFIRMATION);

      loggingService.logLeaveWorkflowValidation(conversationId, userId, {
        valid: true,
        calendarStatus: calendarResult.status,
        hasConflicts: calendarResult.conflicts ? true : false
      });

      return {
        success: true,
        workflowStep: WORKFLOW_STEPS.READY_FOR_CONFIRMATION,
        pendingAction,
        calendarStatus: calendarResult.status,
        calendarConflicts: calendarResult.conflicts,
        message: this.getConfirmationMessage(pendingAction, calendarResult)
      };
    } catch (error) {
      loggingService.logWorkflowError(conversationId, userId, 'leave_request', error);
      console.error('[LeaveWorkflowService] Error validating leave request:', error);
      await conversationStateService.clearPendingAction(conversationId);
      return {
        success: false,
        workflowStep: WORKFLOW_STEPS.IDLE,
        error: 'VALIDATION_ERROR',
        message: 'I could not validate the leave request right now.'
      };
    }
  }

  // ============================================================
  // CHECK CALENDAR CONFLICTS
  // ============================================================

  async checkCalendarConflicts(conversationId, userId, startDate, endDate) {
    try {
      const state = await conversationStateService.getOrCreateState(conversationId, userId);
      
      // If calendar is not connected, don't fail the workflow
      if (state.calendar_status === CALENDAR_STATUS.NOT_CONNECTED) {
        loggingService.logCalendarCheck(conversationId, userId, startDate, endDate, {
          status: CALENDAR_STATUS.NOT_CONNECTED,
          hasConflicts: false
        });
        return {
          status: CALENDAR_STATUS.NOT_CONNECTED,
          conflicts: null,
          message: 'Google Calendar is not connected, so schedule conflicts could not be checked.'
        };
      }

      // If calendar is temporarily unavailable, don't fail the workflow
      if (state.calendar_status === CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE) {
        loggingService.logCalendarCheck(conversationId, userId, startDate, endDate, {
          status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE,
          hasConflicts: false
        });
        return {
          status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE,
          conflicts: null,
          message: 'Google Calendar is temporarily unavailable, so schedule conflicts could not be checked.'
        };
      }

      // Try to check conflicts with error handling
      const conflictCheck = await errorHandlingService.withErrorHandling(
        () => googleCalendarService.checkConflicts(userId, startDate, endDate),
        'calendar'
      );

      if (!conflictCheck.success) {
        // Update calendar status to temporarily unavailable
        await conversationStateService.updateState(conversationId, {
          calendar_status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE
        });

        loggingService.logCalendarCheck(conversationId, userId, startDate, endDate, {
          status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE,
          hasConflicts: false,
          error: conflictCheck.error
        });

        return {
          status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE,
          conflicts: null,
          message: conflictCheck.userMessage || 'Google Calendar is temporarily unavailable, so schedule conflicts could not be checked.'
        };
      }

      if (conflictCheck.data?.hasConflicts) {
        loggingService.logCalendarCheck(conversationId, userId, startDate, endDate, {
          status: CALENDAR_STATUS.CONNECTED,
          hasConflicts: true,
          conflictCount: conflictCheck.data.conflicts?.length || 0
        });
        return {
          status: CALENDAR_STATUS.CONNECTED,
          conflicts: conflictCheck.data.conflicts,
          message: 'Calendar conflicts found during the requested leave period.'
        };
      }

      loggingService.logCalendarCheck(conversationId, userId, startDate, endDate, {
        status: CALENDAR_STATUS.CONNECTED,
        hasConflicts: false
      });

      return {
        status: CALENDAR_STATUS.CONNECTED,
        conflicts: null,
        message: 'No calendar conflicts found.'
      };
    } catch (error) {
      loggingService.logCalendarError(conversationId, userId, error);
      console.warn('[LeaveWorkflowService] Calendar conflict check failed:', error.message);
      
      // Update calendar status to temporarily unavailable
      await conversationStateService.updateState(conversationId, {
        calendar_status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE
      });

      return {
        status: CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE,
        conflicts: null,
        message: 'Google Calendar is temporarily unavailable, so schedule conflicts could not be checked.'
      };
    }
  }

  // ============================================================
  // CONFIRM AND SUBMIT LEAVE REQUEST
  // ============================================================

  async confirmAndSubmitLeaveRequest(conversationId, userId, actionId) {
    try {
      loggingService.logLeaveWorkflowConfirmation(conversationId, userId, actionId, {});

      // Verify action matches
      const state = await conversationStateService.getStateByActionId(actionId);
      
      if (!state) {
        loggingService.logWorkflowError(conversationId, userId, 'leave_request', new Error('ACTION_NOT_FOUND'));
        return {
          success: false,
          error: 'ACTION_NOT_FOUND',
          message: 'The pending action has expired or does not exist.'
        };
      }

      if (String(state.user_id) !== String(userId)) {
        loggingService.logSecurityEvent(userId, 'ACTION_MISMATCH', { actionId });
        return {
          success: false,
          error: 'ACTION_MISMATCH',
          message: 'This action does not belong to you.'
        };
      }

      if (state.workflow_step !== WORKFLOW_STEPS.READY_FOR_CONFIRMATION) {
        return {
          success: false,
          error: 'INVALID_STATE',
          message: 'This action is not ready for confirmation.'
        };
      }

      const pendingAction = state.pending_action;

      // Revalidate before submission (idempotency and safety)
      const revalidation = await this.revalidateBeforeSubmission(userId, pendingAction);
      
      if (!revalidation.valid) {
        await conversationStateService.clearPendingAction(conversationId);
        loggingService.logLeaveWorkflowValidation(conversationId, userId, {
          valid: false,
          errors: [revalidation.error]
        });
        return {
          success: false,
          error: revalidation.error,
          message: revalidation.message
        };
      }

      // Check for duplicate submission using actionId as idempotency key
      const duplicateCheck = await this.checkDuplicateSubmission(userId, actionId, pendingAction);
      if (duplicateCheck) {
        await conversationStateService.clearPendingAction(conversationId);
        loggingService.logSecurityEvent(userId, 'DUPLICATE_SUBMISSION_ATTEMPT', { actionId, reason: duplicateCheck.reason });
        
        if (duplicateCheck.reason === 'action_completed') {
          return {
            success: false,
            error: 'DUPLICATE_SUBMISSION',
            message: 'This action has already been completed.'
          };
        } else if (duplicateCheck.reason === 'duplicate_request') {
          return {
            success: false,
            error: 'DUPLICATE_SUBMISSION',
            message: 'This leave request has already been submitted.',
            existingRequest: duplicateCheck.existingRequest
          };
        }
        
        return {
          success: false,
          error: 'DUPLICATE_SUBMISSION',
          message: 'This leave request has already been submitted.'
        };
      }

      // Submit the leave request
      const leaveRequest = await LeaveRequest.create({
        user_id: userId,
        leave_type: pendingAction.leave_type,
        start_date: pendingAction.start_date,
        end_date: pendingAction.end_date,
        number_of_days: pendingAction.number_of_days,
        reason: pendingAction.reason
      });

      // Complete workflow
      await conversationStateService.completeWorkflow(conversationId);

      loggingService.logLeaveWorkflowSubmission(conversationId, userId, actionId, {
        success: true,
        leaveRequestId: leaveRequest.id
      });

      return {
        success: true,
        workflowStep: WORKFLOW_STEPS.SUBMITTED,
        leaveRequest,
        message: this.getSuccessMessage(pendingAction, leaveRequest)
      };
    } catch (error) {
      loggingService.logWorkflowError(conversationId, userId, 'leave_request', error);
      console.error('[LeaveWorkflowService] Error confirming and submitting leave request:', error);
      await conversationStateService.clearPendingAction(conversationId);
      return {
        success: false,
        error: 'SUBMISSION_ERROR',
        message: 'I could not submit your leave request. Please try again.'
      };
    }
  }

  // ============================================================
  // CANCEL LEAVE REQUEST
  // ============================================================

  async cancelLeaveRequest(conversationId, userId, actionId) {
    try {
      const state = await conversationStateService.getStateByActionId(actionId);
      
      if (!state) {
        return {
          success: false,
          error: 'ACTION_NOT_FOUND',
          message: 'The pending action has expired or does not exist.'
        };
      }

      if (String(state.user_id) !== String(userId)) {
        return {
          success: false,
          error: 'ACTION_MISMATCH',
          message: 'This action does not belong to you.'
        };
      }

      await conversationStateService.cancelWorkflow(conversationId);

      return {
        success: true,
        workflowStep: WORKFLOW_STEPS.CANCELLED,
        message: 'The leave request has been cancelled.'
      };
    } catch (error) {
      console.error('[LeaveWorkflowService] Error cancelling leave request:', error);
      return {
        success: false,
        error: 'CANCELLATION_ERROR',
        message: 'I could not cancel the leave request. Please try again.'
      };
    }
  }

  // ============================================================
  // UPDATE LEAVE DETAILS
  // ============================================================

  async updateLeaveDetails(conversationId, userId, actionId, updates) {
    try {
      const state = await conversationStateService.getStateByActionId(actionId);
      
      if (!state) {
        return {
          success: false,
          error: 'ACTION_NOT_FOUND',
          message: 'The pending action has expired or does not exist.'
        };
      }

      if (String(state.user_id) !== String(userId)) {
        return {
          success: false,
          error: 'ACTION_MISMATCH',
          message: 'This action does not belong to you.'
        };
      }

      // Update pending action with new details
      const updatedAction = {
        ...state.pending_action,
        ...updates
      };

      // Recalculate days if dates changed
      if (updates.start_date || updates.end_date) {
        const start_date = updates.start_date || state.pending_action.start_date;
        const end_date = updates.end_date || state.pending_action.end_date;
        updatedAction.number_of_days = await LeaveRequest.calculateDays(start_date, end_date);
      }

      await conversationStateService.setPendingAction(conversationId, updatedAction, actionId);

      // Re-validate
      return await this.validateLeaveRequest(conversationId, userId, updatedAction);
    } catch (error) {
      console.error('[LeaveWorkflowService] Error updating leave details:', error);
      return {
        success: false,
        error: 'UPDATE_ERROR',
        message: 'I could not update the leave request. Please try again.'
      };
    }
  }

  // ============================================================
  // CONTINUE INCOMPLETE REQUEST
  // ============================================================

  async continueIncompleteRequest(conversationId, userId, additionalDetails) {
    try {
      const state = await conversationStateService.findByConversationId(conversationId);
      
      if (!state) {
        return {
          success: false,
          error: 'STATE_NOT_FOUND',
          message: 'No previous leave request found to continue.'
        };
      }

      if (String(state.user_id) !== String(userId)) {
        return {
          success: false,
          error: 'STATE_MISMATCH',
          message: 'This request does not belong to you.'
        };
      }

      if (state.workflow_step !== WORKFLOW_STEPS.COLLECTING_DETAILS) {
        return {
          success: false,
          error: 'INVALID_STATE',
          message: 'No incomplete leave request to continue.'
        };
      }

      // Merge existing partial info with new details
      const partialInfo = state.context?.partialLeaveInfo || {};
      const mergedDetails = { ...partialInfo, ...additionalDetails };

      // Check if we now have all required fields
      if (!mergedDetails.leave_type || !mergedDetails.start_date || !mergedDetails.end_date) {
        // Still missing information, update context
        await conversationStateService.updateState(conversationId, {
          context: { ...state.context, partialLeaveInfo: mergedDetails }
        });
        
        return {
          success: false,
          workflowStep: WORKFLOW_STEPS.COLLECTING_DETAILS,
          missingFields: this.getMissingFields(mergedDetails),
          partialInfo: mergedDetails,
          message: this.getMissingFieldsMessage(mergedDetails, mergedDetails)
        };
      }

      // We have all required fields, proceed with full workflow
      return await this.initializeLeaveWorkflow(conversationId, userId, mergedDetails);
    } catch (error) {
      console.error('[LeaveWorkflowService] Error continuing incomplete request:', error);
      return {
        success: false,
        error: 'CONTINUE_ERROR',
        message: 'I could not continue the leave request. Please try again.'
      };
    }
  }

  // ============================================================
  // REVALIDATE BEFORE SUBMISSION
  // ============================================================

  async revalidateBeforeSubmission(userId, pendingAction) {
    try {
      const { leave_type, start_date, end_date, number_of_days } = pendingAction;

      // Recheck balance
      const hasBalance = await LeaveBalance.checkAvailability(userId, leave_type, number_of_days);
      if (!hasBalance) {
        return {
          valid: false,
          error: 'INSUFFICIENT_BALANCE',
          message: `Your ${leave_type} leave balance is no longer sufficient.`
        };
      }

      // Recheck overlap
      const overlapping = await LeaveRequest.checkOverlappingLeave(userId, start_date, end_date);
      if (overlapping?.length > 0) {
        return {
          valid: false,
          error: 'OVERLAPPING_LEAVE',
          message: 'The request now overlaps with another leave request.'
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('[LeaveWorkflowService] Error revalidating before submission:', error);
      return {
        valid: false,
        error: 'REVALIDATION_ERROR',
        message: 'Validation failed before submission.'
      };
    }
  }

  // ============================================================
  // CHECK DUPLICATE SUBMISSION
  // ============================================================

  async checkDuplicateSubmission(userId, actionId, pendingAction) {
    try {
      // First check if this exact actionId was already used
      const existingState = await conversationStateService.getStateByActionId(actionId);
      
      if (existingState && existingState.workflow_step === WORKFLOW_STEPS.SUBMITTED) {
        // This action was already submitted
        console.log('[LeaveWorkflowService] Action already submitted:', actionId);
        return { alreadySubmitted: true, reason: 'action_completed' };
      }
      
      // Check if a leave request with the same details already exists recently
      const recentRequests = await LeaveRequest.findByUserId(userId);
      
      const duplicate = recentRequests.find(request => 
        request.leave_type === pendingAction.leave_type &&
        request.start_date === pendingAction.start_date &&
        request.end_date === pendingAction.end_date &&
        request.created_at > new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
      );

      if (duplicate) {
        console.log('[LeaveWorkflowService] Duplicate request found:', duplicate.id);
        return { alreadySubmitted: true, reason: 'duplicate_request', existingRequest: duplicate };
      }

      return null;
    } catch (error) {
      console.error('[LeaveWorkflowService] Error checking duplicate submission:', error);
      return null;
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  getMissingFields(leaveDetails) {
    const missing = [];
    if (!leaveDetails.leave_type) missing.push('leave_type');
    if (!leaveDetails.start_date) missing.push('start_date');
    if (!leaveDetails.end_date) missing.push('end_date');
    return missing;
  }

  getMissingFieldsMessage(leaveDetails, partialInfo = {}) {
    const missing = this.getMissingFields(leaveDetails);
    
    let message = 'Sure. I can help with that.\n\n';
    
    if (partialInfo.leave_type) {
      message += `I have: Leave type: ${partialInfo.leave_type}\n`;
    }
    if (partialInfo.start_date) {
      message += `I have: Start date: ${partialInfo.start_date}\n`;
    }
    if (partialInfo.end_date) {
      message += `I have: End date: ${partialInfo.end_date}\n`;
    }
    
    message += '\nI still need:\n';
    message += missing.map(field => {
      const fieldNames = {
        leave_type: 'Leave type (annual, sick, or personal)',
        start_date: 'Start date',
        end_date: 'End date'
      };
      return `• ${fieldNames[field]}`;
    }).join('\n');
    
    return message;
  }

  areValidDates(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
    } catch {
      return false;
    }
  }

  getConfirmationMessage(pendingAction, calendarResult) {
    let message = `Please review your leave request:\n\n`;
    message += `**Leave type:** ${pendingAction.leave_type}\n`;
    message += `**Dates:** ${pendingAction.start_date} → ${pendingAction.end_date}\n`;
    message += `**Days:** ${pendingAction.number_of_days}\n`;
    message += `**Reason:** ${pendingAction.reason || 'Not specified'}\n\n`;

    if (calendarResult.status === CALENDAR_STATUS.NOT_CONNECTED) {
      message += `⚠️ Google Calendar isn't connected, so I couldn't check for schedule conflicts. Your leave request can still continue.\n\n`;
    } else if (calendarResult.status === CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE) {
      message += `⚠️ Google Calendar is temporarily unavailable, so I couldn't check for schedule conflicts. Your leave request can still continue.\n\n`;
    } else if (calendarResult.conflicts) {
      message += `⚠️ Calendar conflicts found during this period. Your leave request is still possible.\n\n`;
    } else {
      message += `✅ No calendar conflicts detected.\n\n`;
    }

    message += `Would you like me to submit this leave request?`;
    return message;
  }

  getSuccessMessage(pendingAction, leaveRequest) {
    return `Leave request submitted successfully.\n\n` +
           `Request ID: ${leaveRequest.id}\n` +
           `Type: ${pendingAction.leave_type}\n` +
           `Dates: ${pendingAction.start_date} to ${pendingAction.end_date}\n` +
           `Days: ${pendingAction.number_of_days}\n` +
           `Reason: ${pendingAction.reason || 'Not specified'}\n` +
           `Status: Pending HR approval`;
  }
}

export default new LeaveWorkflowService();