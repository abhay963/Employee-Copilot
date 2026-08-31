import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import leaveWorkflowService from '../services/leaveWorkflowService.js';
import conversationStateService from '../services/conversationStateService.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveBalance } from '../models/LeaveBalance.js';

// Mock dependencies
jest.mock('../services/conversationStateService.js');
jest.mock('../models/LeaveRequest.js');
jest.mock('../models/LeaveBalance.js');

describe('Leave Workflow Service Tests', () => {
  const mockConversationId = 'test-conversation-id';
  const mockUserId = 'test-user-id';
  const mockActionId = 'leave_request_test123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initializeLeaveWorkflow', () => {
    it('should initialize workflow with complete leave details', async () => {
      const leaveDetails = {
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        reason: 'Vacation'
      };

      conversationStateService.getOrCreateState.mockResolvedValue({
        user_id: mockUserId,
        calendar_status: 'CONNECTED'
      });
      conversationStateService.updateCalendarStatus.mockResolvedValue({});
      conversationStateService.setPendingAction.mockResolvedValue({});
      conversationStateService.setWorkflowStep.mockResolvedValue({});
      LeaveRequest.calculateDays.mockResolvedValue(3);
      LeaveBalance.checkAvailability.mockResolvedValue(true);
      LeaveRequest.checkOverlappingLeave.mockResolvedValue([]);

      const result = await leaveWorkflowService.initializeLeaveWorkflow(
        mockConversationId,
        mockUserId,
        leaveDetails
      );

      expect(result.success).toBe(true);
      expect(result.workflowStep).toBe('READY_FOR_CONFIRMATION');
      expect(conversationStateService.setPendingAction).toHaveBeenCalled();
    });

    it('should handle incomplete leave details', async () => {
      const leaveDetails = {
        leave_type: 'annual',
        start_date: '2026-09-01'
        // Missing end_date
      };

      conversationStateService.getOrCreateState.mockResolvedValue({
        user_id: mockUserId,
        calendar_status: 'CONNECTED'
      });
      conversationStateService.updateCalendarStatus.mockResolvedValue({});
      conversationStateService.setWorkflowStep.mockResolvedValue({});

      const result = await leaveWorkflowService.initializeLeaveWorkflow(
        mockConversationId,
        mockUserId,
        leaveDetails
      );

      expect(result.success).toBe(false);
      expect(result.workflowStep).toBe('COLLECTING_DETAILS');
      expect(result.missingFields).toContain('end_date');
    });

    it('should handle insufficient leave balance', async () => {
      const leaveDetails = {
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        reason: 'Vacation'
      };

      conversationStateService.getOrCreateState.mockResolvedValue({
        user_id: mockUserId,
        calendar_status: 'CONNECTED'
      });
      conversationStateService.updateCalendarStatus.mockResolvedValue({});
      conversationStateService.setPendingAction.mockResolvedValue({});
      conversationStateService.setWorkflowStep.mockResolvedValue({});
      conversationStateService.clearPendingAction.mockResolvedValue({});
      LeaveRequest.calculateDays.mockResolvedValue(3);
      LeaveBalance.checkAvailability.mockResolvedValue(false);

      const result = await leaveWorkflowService.initializeLeaveWorkflow(
        mockConversationId,
        mockUserId,
        leaveDetails
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_BALANCE');
      expect(conversationStateService.clearPendingAction).toHaveBeenCalled();
    });

    it('should handle overlapping leave requests', async () => {
      const leaveDetails = {
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        reason: 'Vacation'
      };

      conversationStateService.getOrCreateState.mockResolvedValue({
        user_id: mockUserId,
        calendar_status: 'CONNECTED'
      });
      conversationStateService.updateCalendarStatus.mockResolvedValue({});
      conversationStateService.setPendingAction.mockResolvedValue({});
      conversationStateService.setWorkflowStep.mockResolvedValue({});
      conversationStateService.clearPendingAction.mockResolvedValue({});
      LeaveRequest.calculateDays.mockResolvedValue(3);
      LeaveBalance.checkAvailability.mockResolvedValue(true);
      LeaveRequest.checkOverlappingLeave.mockResolvedValue([{ id: 'existing-request' }]);

      const result = await leaveWorkflowService.initializeLeaveWorkflow(
        mockConversationId,
        mockUserId,
        leaveDetails
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('OVERLAPPING_LEAVE');
      expect(conversationStateService.clearPendingAction).toHaveBeenCalled();
    });
  });

  describe('confirmAndSubmitLeaveRequest', () => {
    it('should submit leave request with valid confirmation', async () => {
      const pendingAction = {
        type: 'leave_request',
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        number_of_days: 3,
        reason: 'Vacation'
      };

      conversationStateService.getStateByActionId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'READY_FOR_CONFIRMATION',
        pending_action: pendingAction
      });
      LeaveBalance.checkAvailability.mockResolvedValue(true);
      LeaveRequest.checkOverlappingLeave.mockResolvedValue([]);
      LeaveRequest.create.mockResolvedValue({ id: 'new-request-id' });
      conversationStateService.completeWorkflow.mockResolvedValue({});

      const result = await leaveWorkflowService.confirmAndSubmitLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(true);
      expect(result.workflowStep).toBe('SUBMITTED');
      expect(LeaveRequest.create).toHaveBeenCalled();
    });

    it('should reject confirmation for invalid action ID', async () => {
      conversationStateService.getStateByActionId.mockResolvedValue(null);

      const result = await leaveWorkflowService.confirmAndSubmitLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACTION_NOT_FOUND');
    });

    it('should reject confirmation for wrong user', async () => {
      conversationStateService.getStateByActionId.mockResolvedValue({
        user_id: 'different-user-id',
        workflow_step: 'READY_FOR_CONFIRMATION',
        pending_action: {}
      });

      const result = await leaveWorkflowService.confirmAndSubmitLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACTION_MISMATCH');
    });

    it('should revalidate before submission', async () => {
      const pendingAction = {
        type: 'leave_request',
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        number_of_days: 3,
        reason: 'Vacation'
      };

      conversationStateService.getStateByActionId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'READY_FOR_CONFIRMATION',
        pending_action: pendingAction
      });
      LeaveBalance.checkAvailability.mockResolvedValue(false); // Balance changed
      conversationStateService.clearPendingAction.mockResolvedValue({});

      const result = await leaveWorkflowService.confirmAndSubmitLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_BALANCE');
      expect(LeaveRequest.create).not.toHaveBeenCalled();
    });

    it('should prevent duplicate submissions', async () => {
      const pendingAction = {
        type: 'leave_request',
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        number_of_days: 3,
        reason: 'Vacation'
      };

      conversationStateService.getStateByActionId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'READY_FOR_CONFIRMATION',
        pending_action: pendingAction
      });
      LeaveBalance.checkAvailability.mockResolvedValue(true);
      LeaveRequest.checkOverlappingLeave.mockResolvedValue([]);
      LeaveRequest.findByUserId.mockResolvedValue([
        {
          id: 'existing-request',
          leave_type: 'annual',
          start_date: '2026-09-01',
          end_date: '2026-09-03',
          created_at: new Date().toISOString()
        }
      ]);
      conversationStateService.clearPendingAction.mockResolvedValue({});

      const result = await leaveWorkflowService.confirmAndSubmitLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('DUPLICATE_SUBMISSION');
      expect(LeaveRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should cancel pending leave request', async () => {
      conversationStateService.getStateByActionId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'READY_FOR_CONFIRMATION',
        pending_action: {}
      });
      conversationStateService.cancelWorkflow.mockResolvedValue({});

      const result = await leaveWorkflowService.cancelLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(true);
      expect(result.workflowStep).toBe('CANCELLED');
      expect(conversationStateService.cancelWorkflow).toHaveBeenCalled();
    });

    it('should reject cancellation for invalid action ID', async () => {
      conversationStateService.getStateByActionId.mockResolvedValue(null);

      const result = await leaveWorkflowService.cancelLeaveRequest(
        mockConversationId,
        mockUserId,
        mockActionId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACTION_NOT_FOUND');
    });
  });

  describe('updateLeaveDetails', () => {
    it('should update leave details and revalidate', async () => {
      const pendingAction = {
        type: 'leave_request',
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        number_of_days: 3,
        reason: 'Vacation'
      };

      const updates = {
        end_date: '2026-09-05'
      };

      conversationStateService.getStateByActionId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'READY_FOR_CONFIRMATION',
        pending_action: pendingAction
      });
      LeaveRequest.calculateDays.mockResolvedValue(5);
      conversationStateService.setPendingAction.mockResolvedValue({});
      LeaveBalance.checkAvailability.mockResolvedValue(true);
      LeaveRequest.checkOverlappingLeave.mockResolvedValue([]);

      const result = await leaveWorkflowService.updateLeaveDetails(
        mockConversationId,
        mockUserId,
        mockActionId,
        updates
      );

      expect(result.success).toBe(true);
      expect(conversationStateService.setPendingAction).toHaveBeenCalled();
    });
  });

  describe('continueIncompleteRequest', () => {
    it('should continue incomplete request with additional details', async () => {
      const partialInfo = {
        leave_type: 'annual',
        start_date: '2026-09-01'
      };

      const additionalDetails = {
        end_date: '2026-09-03'
      };

      conversationStateService.findByConversationId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'COLLECTING_DETAILS',
        context: { partialLeaveInfo: partialInfo }
      });
      conversationStateService.updateState.mockResolvedValue({});
      LeaveRequest.calculateDays.mockResolvedValue(3);
      conversationStateService.setPendingAction.mockResolvedValue({});
      conversationStateService.setWorkflowStep.mockResolvedValue({});
      LeaveBalance.checkAvailability.mockResolvedValue(true);
      LeaveRequest.checkOverlappingLeave.mockResolvedValue([]);

      const result = await leaveWorkflowService.continueIncompleteRequest(
        mockConversationId,
        mockUserId,
        additionalDetails
      );

      expect(result.success).toBe(true);
      expect(result.workflowStep).toBe('READY_FOR_CONFIRMATION');
    });

    it('should still request missing information', async () => {
      const partialInfo = {
        leave_type: 'annual'
      };

      const additionalDetails = {
        start_date: '2026-09-01'
      };

      conversationStateService.findByConversationId.mockResolvedValue({
        user_id: mockUserId,
        workflow_step: 'COLLECTING_DETAILS',
        context: { partialLeaveInfo: partialInfo }
      });
      conversationStateService.updateState.mockResolvedValue({});

      const result = await leaveWorkflowService.continueIncompleteRequest(
        mockConversationId,
        mockUserId,
        additionalDetails
      );

      expect(result.success).toBe(false);
      expect(result.workflowStep).toBe('COLLECTING_DETAILS');
      expect(result.missingFields).toContain('end_date');
    });
  });

  describe('checkCalendarConflicts', () => {
    it('should return no conflicts when calendar not connected', async () => {
      conversationStateService.getOrCreateState.mockResolvedValue({
        calendar_status: 'NOT_CONNECTED'
      });

      const result = await leaveWorkflowService.checkCalendarConflicts(
        mockConversationId,
        mockUserId,
        '2026-09-01',
        '2026-09-03'
      );

      expect(result.status).toBe('NOT_CONNECTED');
      expect(result.conflicts).toBeNull();
    });

    it('should return no conflicts when calendar temporarily unavailable', async () => {
      conversationStateService.getOrCreateState.mockResolvedValue({
        calendar_status: 'TEMPORARILY_UNAVAILABLE'
      });

      const result = await leaveWorkflowService.checkCalendarConflicts(
        mockConversationId,
        mockUserId,
        '2026-09-01',
        '2026-09-03'
      );

      expect(result.status).toBe('TEMPORARILY_UNAVAILABLE');
      expect(result.conflicts).toBeNull();
    });

    it('should detect calendar conflicts when connected', async () => {
      conversationStateService.getOrCreateState.mockResolvedValue({
        calendar_status: 'CONNECTED'
      });
      conversationStateService.updateState.mockResolvedValue({});

      const mockConflicts = [
        { summary: 'Team Meeting', start: '2026-09-02T10:00:00Z', end: '2026-09-02T11:00:00Z' }
      ];

      // Mock the error handling service to return success with conflicts
      const { errorHandlingService } = await import('../services/errorHandlingService.js');
      errorHandlingService.withErrorHandling.mockResolvedValue({
        success: true,
        data: { hasConflicts: true, conflicts: mockConflicts }
      });

      const result = await leaveWorkflowService.checkCalendarConflicts(
        mockConversationId,
        mockUserId,
        '2026-09-01',
        '2026-09-03'
      );

      expect(result.status).toBe('CONNECTED');
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toEqual(mockConflicts);
    });
  });
});