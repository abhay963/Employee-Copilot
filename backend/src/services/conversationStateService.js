import { ConversationState } from '../models/ConversationState.js';
import googleCalendarService from './googleCalendarService.js';
import { query } from '../db/connection.js';
import errorHandlingService from './errorHandlingService.js';

// Workflow state machine constants
const WORKFLOW_STEPS = {
  IDLE: 'IDLE',
  COLLECTING_DETAILS: 'COLLECTING_DETAILS',
  VALIDATING: 'VALIDATING',
  CALENDAR_CHECK: 'CALENDAR_CHECK',
  READY_FOR_CONFIRMATION: 'READY_FOR_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  SUBMITTED: 'SUBMITTED',
  CANCELLED: 'CANCELLED'
};

// Calendar status constants
const CALENDAR_STATUS = {
  UNKNOWN: 'UNKNOWN',
  CONNECTED: 'CONNECTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE'
};

class ConversationStateService {
  // ============================================================
  // FIND BY CONVERSATION ID
  // ============================================================

  async findByConversationId(conversationId) {
    try {
      return await ConversationState.findByConversationId(conversationId);
    } catch (error) {
      console.error('[ConversationStateService] Error finding by conversation ID:', error);
      throw error;
    }
  }

  // ============================================================
  // GET OR CREATE STATE
  // ============================================================

  async getOrCreateState(conversationId, userId) {
    try {
      let state = await ConversationState.findByConversationId(conversationId);

      if (!state) {
        state = await ConversationState.create({
          conversation_id: conversationId,
          user_id: userId,
          workflow_step: WORKFLOW_STEPS.IDLE,
          calendar_status: CALENDAR_STATUS.UNKNOWN
        });
      }

      return state;
    } catch (error) {
      console.error('[ConversationStateService] Error getting or creating state:', error);
      throw error;
    }
  }

  // ============================================================
  // UPDATE STATE
  // ============================================================

  async updateState(conversationId, updates) {
    try {
      return await ConversationState.update(conversationId, updates);
    } catch (error) {
      console.error('[ConversationStateService] Error updating state:', error);
      throw error;
    }
  }

  // ============================================================
  // SET PENDING ACTION
  // ============================================================

  async setPendingAction(conversationId, actionData, actionId) {
    try {
      return await ConversationState.update(conversationId, {
        pending_action: actionData,
        action_id: actionId,
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION
      });
    } catch (error) {
      console.error('[ConversationStateService] Error setting pending action:', error);
      throw error;
    }
  }

  // ============================================================
  // CLEAR PENDING ACTION
  // ============================================================

  async clearPendingAction(conversationId) {
    try {
      return await ConversationState.clearPendingAction(conversationId);
    } catch (error) {
      console.error('[ConversationStateService] Error clearing pending action:', error);
      throw error;
    }
  }

  // ============================================================
  // SET WORKFLOW STEP
  // ============================================================

  async setWorkflowStep(conversationId, step) {
    try {
      return await ConversationState.setWorkflowStep(conversationId, step);
    } catch (error) {
      console.error('[ConversationStateService] Error setting workflow step:', error);
      throw error;
    }
  }

  // ============================================================
  // CHECK CALENDAR STATUS
  // ============================================================

  async determineCalendarStatus(userId) {
    try {
      const result = await errorHandlingService.withErrorHandling(
        () => googleCalendarService.isConnected(userId),
        'calendar'
      );

      if (result.success && result.data) {
        return CALENDAR_STATUS.CONNECTED;
      } else {
        return CALENDAR_STATUS.NOT_CONNECTED;
      }
    } catch (error) {
      console.warn('[ConversationStateService] Calendar check failed, marking as temporarily unavailable:', error.message);
      return CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE;
    }
  }

  // ============================================================
  // UPDATE CALENDAR STATUS
  // ============================================================

  async updateCalendarStatus(conversationId, userId) {
    try {
      const status = await this.determineCalendarStatus(userId);
      return await ConversationState.update(conversationId, {
        calendar_status: status
      });
    } catch (error) {
      console.error('[ConversationStateService] Error updating calendar status:', error);
      throw error;
    }
  }

  // ============================================================
  // GET PENDING ACTION
  // ============================================================

  async getPendingAction(conversationId) {
    try {
      const state = await ConversationState.findByConversationId(conversationId);
      
      if (!state || !state.action_id) {
        return null;
      }

      return {
        actionId: state.action_id,
        actionData: state.pending_action,
        workflowStep: state.workflow_step,
        context: state.context
      };
    } catch (error) {
      console.error('[ConversationStateService] Error getting pending action:', error);
      throw error;
    }
  }

  // ============================================================
  // HAS PENDING ACTION
  // ============================================================

  async hasPendingAction(conversationId) {
    try {
      const state = await ConversationState.findByConversationId(conversationId);
      
      if (!state) {
        return false;
      }
      
      // Check if action exists and is in valid state
      if (!state.action_id) {
        return false;
      }
      
      const validStates = [WORKFLOW_STEPS.READY_FOR_CONFIRMATION, WORKFLOW_STEPS.COLLECTING_DETAILS];
      if (!validStates.includes(state.workflow_step)) {
        return false;
      }
      
      // Check if the action is stale (older than 1 hour)
      const lastUpdated = new Date(state.last_updated);
      const now = new Date();
      const staleThreshold = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (now - lastUpdated > staleThreshold) {
        console.log('[ConversationStateService] Pending action is stale, clearing it');
        await this.clearPendingAction(conversationId);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[ConversationStateService] Error checking pending action:', error);
      return false;
    }
  }

  // ============================================================
  // RESUME WORKFLOW
  // ============================================================

  async resumeWorkflow(conversationId, userId) {
    try {
      const state = await ConversationState.findByConversationId(conversationId);

      if (!state) {
        return null;
      }

      // Only resume if there's a pending action that hasn't been completed
      if (state.action_id && state.workflow_step === WORKFLOW_STEPS.READY_FOR_CONFIRMATION) {
        return {
          canResume: true,
          actionId: state.action_id,
          actionData: state.pending_action,
          workflowStep: state.workflow_step,
          context: state.context,
          calendarStatus: state.calendar_status
        };
      }

      return {
        canResume: false,
        reason: 'No pending action to resume'
      };
    } catch (error) {
      console.error('[ConversationStateService] Error resuming workflow:', error);
      throw error;
    }
  }

  // ============================================================
  // CANCEL WORKFLOW
  // ============================================================

  async cancelWorkflow(conversationId) {
    try {
      return await ConversationState.update(conversationId, {
        workflow_step: WORKFLOW_STEPS.CANCELLED,
        pending_action: null,
        action_id: null
      });
    } catch (error) {
      console.error('[ConversationStateService] Error cancelling workflow:', error);
      throw error;
    }
  }

  // ============================================================
  // COMPLETE WORKFLOW
  // ============================================================

  async completeWorkflow(conversationId) {
    try {
      return await ConversationState.update(conversationId, {
        workflow_step: WORKFLOW_STEPS.SUBMITTED,
        pending_action: null,
        action_id: null
      });
    } catch (error) {
      console.error('[ConversationStateService] Error completing workflow:', error);
      throw error;
    }
  }

  // ============================================================
  // TRANSITION STATE
  // ============================================================

  async transitionState(conversationId, fromStep, toStep, context = {}) {
    try {
      const state = await ConversationState.findByConversationId(conversationId);

      if (!state) {
        throw new Error('Conversation state not found');
      }

      if (state.workflow_step !== fromStep) {
        console.warn(`[ConversationStateService] State transition mismatch: expected ${fromStep}, found ${state.workflow_step}`);
      }

      return await ConversationState.update(conversationId, {
        workflow_step: toStep,
        context: { ...state.context, ...context }
      });
    } catch (error) {
      console.error('[ConversationStateService] Error transitioning state:', error);
      throw error;
    }
  }

  // ============================================================
  // GET STATE BY ACTION ID
  // ============================================================

  async getStateByActionId(actionId) {
    try {
      const state = await ConversationState.findByActionId(actionId);
      
      // Additional validation: ensure the action is still in a valid state
      if (state) {
        const validStates = [WORKFLOW_STEPS.READY_FOR_CONFIRMATION, WORKFLOW_STEPS.COLLECTING_DETAILS];
        if (!validStates.includes(state.workflow_step)) {
          console.warn('[ConversationStateService] Action found but in invalid state:', state.workflow_step);
          return null;
        }
      }
      
      return state;
    } catch (error) {
      console.error('[ConversationStateService] Error getting state by action ID:', error);
      throw error;
    }
  }

  // ============================================================
  // CLEANUP OLD STATES
  // ============================================================

  async cleanupOldStates(daysOld = 7) {
    try {
      const result = await query(
        `DELETE FROM conversation_state 
         WHERE last_updated < NOW() - INTERVAL '$1 days'
         RETURNING conversation_id`,
        [daysOld]
      );
      
      console.log(`[ConversationStateService] Cleaned up ${result.rows.length} old conversation states`);
      return result.rows.length;
    } catch (error) {
      console.error('[ConversationStateService] Error cleaning up old states:', error);
      throw error;
    }
  }
}

export default new ConversationStateService();
export { WORKFLOW_STEPS, CALENDAR_STATUS };