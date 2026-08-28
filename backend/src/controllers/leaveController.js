import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { LeaveHistory } from '../models/LeaveHistory.js';
import { User } from '../models/User.js';
import googleCalendarService from '../services/googleCalendarService.js';
import gmailService from '../services/gmailService.js';

export const getMyLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const leaveRequests = await LeaveRequest.findByUserId(userId);
    
    res.json({
      success: true,
      leaveRequests
    });
  } catch (error) {
    console.error('Error getting leave requests:', error);
    res.status(500).json({ error: 'Failed to get leave requests' });
  }
};

export const getLeaveBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await LeaveBalance.findByUserId(userId);
    
    if (!balance) {
      return res.status(404).json({ error: 'Leave balance not found' });
    }
    
    res.json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Error getting leave balance:', error);
    res.status(500).json({ error: 'Failed to get leave balance' });
  }
};

export const createLeaveRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { leave_type, start_date, end_date, reason } = req.body;

    // Validate required fields
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }

    // Validate leave type
    if (!['annual', 'sick', 'personal'].includes(leave_type)) {
      return res.status(400).json({ error: 'Invalid leave type' });
    }

    // Calculate number of days
    const number_of_days = await LeaveRequest.calculateDays(start_date, end_date);

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.checkOverlappingLeave(userId, start_date, end_date);
    if (overlapping.length > 0) {
      return res.status(400).json({ 
        error: 'You have overlapping leave requests during this period',
        overlapping
      });
    }

    // Check leave balance availability
    const hasBalance = await LeaveBalance.checkAvailability(userId, leave_type, number_of_days);
    if (!hasBalance) {
      return res.status(400).json({ error: `Insufficient ${leave_type} leave balance` });
    }

    // Check calendar conflicts (if Google Calendar is connected)
    let calendarConflicts = null;
    try {
      const conflictCheck = await googleCalendarService.checkConflicts(userId, start_date, end_date);
      if (conflictCheck.hasConflicts) {
        calendarConflicts = conflictCheck.conflicts;
      }
    } catch (calendarError) {
      // Don't fail leave request if calendar check fails
      console.warn('Calendar conflict check failed:', calendarError.message);
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      user_id: userId,
      leave_type,
      start_date,
      end_date,
      number_of_days,
      reason
    });

    // Create history entry
    await LeaveHistory.create({
      user_id: userId,
      leave_request_id: leaveRequest.id,
      action: 'created',
      previous_status: null,
      new_status: 'pending',
      performed_by: userId,
      notes: 'Leave request created'
    });

    res.status(201).json({
      success: true,
      leaveRequest,
      calendarConflicts
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
};

export const getPendingLeaveRequests = async (req, res) => {
  try {
    // Only HR can access pending requests
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'HR access required' });
    }

    const pendingRequests = await LeaveRequest.getPendingRequests();
    
    res.json({
      success: true,
      leaveRequests: pendingRequests
    });
  } catch (error) {
    console.error('Error getting pending leave requests:', error);
    res.status(500).json({ error: 'Failed to get pending leave requests' });
  }
};

export const approveLeaveRequest = async (req, res) => {
  try {
    // Only HR can approve requests
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'HR access required' });
    }

    const { id } = req.params;
    const { review_comment } = req.body;

    // Get leave request
    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Leave request is not pending' });
    }

    // Get user details for email notification
    const user = await User.findById(leaveRequest.user_id);
    const hrUser = await User.findById(req.user.id);

    // Deduct from leave balance
    try {
      await LeaveBalance.deductLeave(leaveRequest.user_id, leaveRequest.leave_type, leaveRequest.number_of_days);
    } catch (balanceError) {
      return res.status(400).json({ error: balanceError.message });
    }

    // Update leave request status
    const updatedRequest = await LeaveRequest.update(id, {
      status: 'approved',
      reviewed_by: req.user.id,
      review_comment
    });

    // Create history entry
    await LeaveHistory.create({
      user_id: leaveRequest.user_id,
      leave_request_id: id,
      action: 'approved',
      previous_status: 'pending',
      new_status: 'approved',
      performed_by: req.user.id,
      notes: review_comment || 'Leave request approved'
    });

    // Send email notification to employee
    try {
      const emailBody = `
        <h2>Leave Request Approved</h2>
        <p>Dear ${user.name},</p>
        <p>Your leave request has been approved by ${hrUser.name}.</p>
        <p><strong>Leave Details:</strong></p>
        <ul>
          <li>Type: ${leaveRequest.leave_type}</li>
          <li>Start Date: ${leaveRequest.start_date}</li>
          <li>End Date: ${leaveRequest.end_date}</li>
          <li>Number of Days: ${leaveRequest.number_of_days}</li>
        </ul>
        ${review_comment ? `<p><strong>Review Comment:</strong> ${review_comment}</p>` : ''}
        <p>Please ensure your tasks are covered during your absence.</p>
        <p>Best regards,<br>HR Team</p>
      `;

      await gmailService.sendEmail(
        req.user.id, // Use HR's email account to send
        user.email,
        'Leave Request Approved',
        emailBody,
        true
      );
    } catch (emailError) {
      console.warn('Failed to send approval email:', emailError.message);
      // Don't fail the approval if email fails
    }

    res.json({
      success: true,
      leaveRequest: updatedRequest
    });
  } catch (error) {
    console.error('Error approving leave request:', error);
    res.status(500).json({ error: 'Failed to approve leave request' });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  try {
    // Only HR can reject requests
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'HR access required' });
    }

    const { id } = req.params;
    const { review_comment } = req.body;

    // Get leave request
    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Leave request is not pending' });
    }

    // Get user details for email notification
    const user = await User.findById(leaveRequest.user_id);
    const hrUser = await User.findById(req.user.id);

    // Update leave request status
    const updatedRequest = await LeaveRequest.update(id, {
      status: 'rejected',
      reviewed_by: req.user.id,
      review_comment
    });

    // Create history entry
    await LeaveHistory.create({
      user_id: leaveRequest.user_id,
      leave_request_id: id,
      action: 'rejected',
      previous_status: 'pending',
      new_status: 'rejected',
      performed_by: req.user.id,
      notes: review_comment || 'Leave request rejected'
    });

    // Send email notification to employee
    try {
      const emailBody = `
        <h2>Leave Request Rejected</h2>
        <p>Dear ${user.name},</p>
        <p>Your leave request has been reviewed and rejected by ${hrUser.name}.</p>
        <p><strong>Leave Details:</strong></p>
        <ul>
          <li>Type: ${leaveRequest.leave_type}</li>
          <li>Start Date: ${leaveRequest.start_date}</li>
          <li>End Date: ${leaveRequest.end_date}</li>
          <li>Number of Days: ${leaveRequest.number_of_days}</li>
        </ul>
        ${review_comment ? `<p><strong>Reason for Rejection:</strong> ${review_comment}</p>` : ''}
        <p>If you have any questions or would like to discuss this further, please contact HR.</p>
        <p>Best regards,<br>HR Team</p>
      `;

      await gmailService.sendEmail(
        req.user.id, // Use HR's email account to send
        user.email,
        'Leave Request Rejected',
        emailBody,
        true
      );
    } catch (emailError) {
      console.warn('Failed to send rejection email:', emailError.message);
      // Don't fail the rejection if email fails
    }

    res.json({
      success: true,
      leaveRequest: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
};

export const getLeaveHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await LeaveHistory.findByUserId(userId);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error getting leave history:', error);
    res.status(500).json({ error: 'Failed to get leave history' });
  }
};

export const getAllLeaveRequests = async (req, res) => {
  try {
    // Only HR can access all requests
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'HR access required' });
    }

    const leaveRequests = await LeaveRequest.findAll();
    
    res.json({
      success: true,
      leaveRequests
    });
  } catch (error) {
    console.error('Error getting all leave requests:', error);
    res.status(500).json({ error: 'Failed to get leave requests' });
  }
};