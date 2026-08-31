import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import conversationStateService, { WORKFLOW_STEPS, CALENDAR_STATUS } from '../services/conversationStateService.js';
import { ConversationState } from '../models/ConversationState.js';

// Mock dependencies
jest.mock('../models/ConversationState.js');
jest.mock('../services/googleCalendarService.js');

describe('Conversation State Service Tests', () => {
  const mockConversationId = 'test-conversation-id';
  const mockUserId = 'test-user-id';
  const mockActionId = 'leave_request_test123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getOrCreateState', () => {
    it('should return existing state', async () => {
      const existingState = {
        id: 'state-id',
        conversation_id: mockConversationId,
        user_id: mockUserId,
        workflow_step: WORKFLOW_STEPS.IDLE
      };

      ConversationState.findByConversationId.mockResolvedValue(existingState);

      const result = await conversationStateService.getOrCreateState(mockConversationId, mockUserId);

      expect(result).toEqual(existingState);
      expect(ConversationState.create).not.toHaveBeenCalled();
    });

    it('should create new state when none exists', async () => {
      ConversationState.findByConversationId.mockResolvedValue(null);
      ConversationState.create.mockResolvedValue({
        id: 'new-state-id',
        conversation_id: mockConversationId,
        user_id: mockUserId,
        workflow_step: WORKFLOW_STEPS.IDLE
      });

      const result = await conversationStateService.getOrCreateState(mockConversationId, mockUserId);

      expect(ConversationState.create).toHaveBeenCalledWith({
        conversation_id: mockConversationId,
        user_id: mockUserId,
        workflow_step: WORKFLOW_STEPS.IDLE,
        calendar_status: CALENDAR_STATUS.UNKNOWN
      });
      expect(result.workflow_step).toBe(WORKFLOW_STEPS.IDLE);
    });
  });

  describe('setPendingAction', () => {
    it('should set pending action and transition to READY_FOR_CONFIRMATION', async () => {
      const actionData = {
        type: 'leave_request',
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03'
      };

      ConversationState.update.mockResolvedValue({
        action_id: mockActionId,
        pending_action: actionData,
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION
      });

      const result = await conversationStateService.setPendingAction(mockConversationId, actionData, mockActionId);

      expect(ConversationState.update).toHaveBeenCalledWith(mockConversationId, {
        pending_action: actionData,
        action_id: mockActionId,
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION
      });
      expect(result.workflow_step).toBe(WORKFLOW_STEPS.READY_FOR_CONFIRMATION);
    });
  });

  describe('clearPendingAction', () => {
    it('should clear pending action and reset to IDLE', async () => {
      ConversationState.clearPendingAction.mockResolvedValue({
        action_id: null,
        pending_action: {},
        workflow_step: WORKFLOW_STEPS.IDLE
      });

      const result = await conversationStateService.clearPendingAction(mockConversationId);

      expect(ConversationState.clearPendingAction).toHaveBeenCalledWith(mockConversationId);
      expect(result.workflow_step).toBe(WORKFLOW_STEPS.IDLE);
    });
  });

  describe('setWorkflowStep', () => {
    it('should set workflow step', async () => {
      ConversationState.setWorkflowStep.mockResolvedValue({
        workflow_step: WORKFLOW_STEPS.VALIDATING
      });

      const result = await conversationStateService.setWorkflowStep(mockConversationId, WORKFLOW_STEPS.VALIDATING);

      expect(ConversationState.setWorkflowStep).toHaveBeenCalledWith(mockConversationId, WORKFLOW_STEPS.VALIDATING);
      expect(result.workflow_step).toBe(WORKFLOW_STEPS.VALIDATING);
    });
  });

  describe('hasPendingAction', () => {
    it('should return true when pending action exists', async () => {
      ConversationState.hasPendingAction.mockResolvedValue(true);

      const result = await conversationStateService.hasPendingAction(mockConversationId);

      expect(result).toBe(true);
    });

    it('should return false when no pending action', async () => {
      ConversationState.hasPendingAction.mockResolvedValue(false);

      const result = await conversationStateService.hasPendingAction(mockConversationId);

      expect(result).toBe(false);
    });
  });

  describe('getPendingAction', () => {
    it('should return pending action when exists', async () => {
      const state = {
        action_id: mockActionId,
        pending_action: { type: 'leave_request' },
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION,
        context: {}
      };

      ConversationState.findByConversationId.mockResolvedValue(state);

      const result = await conversationStateService.getPendingAction(mockConversationId);

      expect(result.actionId).toBe(mockActionId);
      expect(result.actionData).toEqual(state.pending_action);
      expect(result.workflowStep).toBe(WORKFLOW_STEPS.READY_FOR_CONFIRMATION);
    });

    it('should return null when no pending action', async () => {
      ConversationState.findByConversationId.mockResolvedValue({
        action_id: null,
        pending_action: {},
        workflow_step: WORKFLOW_STEPS.IDLE
      });

      const result = await conversationStateService.getPendingAction(mockConversationId);

      expect(result).toBeNull();
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel workflow', async () => {
      ConversationState.update.mockResolvedValue({
        workflow_step: WORKFLOW_STEPS.CANCELLED,
        pending_action: null,
        action_id: null
      });

      const result = await conversationStateService.cancelWorkflow(mockConversationId);

      expect(ConversationState.update).toHaveBeenCalledWith(mockConversationId, {
        workflow_step: WORKFLOW_STEPS.CANCELLED,
        pending_action: null,
        action_id: null
      });
      expect(result.workflow_step).toBe(WORKFLOW_STEPS.CANCELLED);
    });
  });

  describe('completeWorkflow', () => {
    it('should complete workflow', async () => {
      ConversationState.update.mockResolvedValue({
        workflow_step: WORKFLOW_STEPS.SUBMITTED,
        pending_action: null,
        action_id: null
      });

      const result = await conversationStateService.completeWorkflow(mockConversationId);

      expect(ConversationState.update).toHaveBeenCalledWith(mockConversationId, {
        workflow_step: WORKFLOW_STEPS.SUBMITTED,
        pending_action: null,
        action_id: null
      });
      expect(result.workflow_step).toBe(WORKFLOW_STEPS.SUBMITTED);
    });
  });

  describe('transitionState', () => {
    it('should transition between workflow steps', async () => {
      const state = {
        workflow_step: WORKFLOW_STEPS.VALIDATING,
        context: { previousData: 'test' }
      };

      ConversationState.findByConversationId.mockResolvedValue(state);
      ConversationState.update.mockResolvedValue({
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION,
        context: { ...state.context, newData: 'test' }
      });

      const result = await conversationStateService.transitionState(
        mockConversationId,
        WORKFLOW_STEPS.VALIDATING,
        WORKFLOW_STEPS.READY_FOR_CONFIRMATION,
        { newData: 'test' }
      );

      expect(ConversationState.update).toHaveBeenCalledWith(mockConversationId, {
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION,
        context: { previousData: 'test', newData: 'test' }
      });
    });
  });

  describe('determineCalendarStatus', () => {
    it('should return CONNECTED when calendar is connected', async () => {
      const { googleCalendarService } = await import('../services/googleCalendarService.js');
      googleCalendarService.isConnected.mockResolvedValue(true);

      const result = await conversationStateService.determineCalendarStatus(mockUserId);

      expect(result).toBe(CALENDAR_STATUS.CONNECTED);
    });

    it('should return NOT_CONNECTED when calendar is not connected', async () => {
      const { googleCalendarService } = await import('../services/googleCalendarService.js');
      googleCalendarService.isConnected.mockResolvedValue(false);

      const result = await conversationStateService.determineCalendarStatus(mockUserId);

      expect(result).toBe(CALENDAR_STATUS.NOT_CONNECTED);
    });

    it('should return TEMPORARILY_UNAVAILABLE on error', async () => {
      const { googleCalendarService } = await import('../services/googleCalendarService.js');
      googleCalendarService.isConnected.mockRejectedValue(new Error('Network error'));

      const result = await conversationStateService.determineCalendarStatus(mockUserId);

      expect(result).toBe(CALENDAR_STATUS.TEMPORARILY_UNAVAILABLE);
    });
  });

  describe('resumeWorkflow', () => {
    it('should return resume information for pending action', async () => {
      const state = {
        action_id: mockActionId,
        pending_action: { type: 'leave_request', leave_type: 'annual' },
        workflow_step: WORKFLOW_STEPS.READY_FOR_CONFIRMATION,
        context: {},
        calendar_status: CALENDAR_STATUS.CONNECTED
      };

      ConversationState.findByConversationId.mockResolvedValue(state);

      const result = await conversationStateService.resumeWorkflow(mockConversationId, mockUserId);

      expect(result.canResume).toBe(true);
      expect(result.actionId).toBe(mockActionId);
      expect(result.actionData).toEqual(state.pending_action);
    });

    it('should return cannot resume when no pending action', async () => {
      const state = {
        action_id: null,
        pending_action: {},
        workflow_step: WORKFLOW_STEPS.IDLE
      };

      ConversationState.findByConversationId.mockResolvedValue(state);

      const result = await conversationStateService.resumeWorkflow(mockConversationId, mockUserId);

      expect(result.canResume).toBe(false);
      expect(result.reason).toBe('No pending action to resume');
    });

    it('should return null when state not found', async () => {
      ConversationState.findByConversationId.mockResolvedValue(null);

      const result = await conversationStateService.resumeWorkflow(mockConversationId, mockUserId);

      expect(result).toBeNull();
    });
  });
});