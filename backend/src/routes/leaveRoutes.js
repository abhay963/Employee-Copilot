import express from 'express';
import {
  getMyLeaveRequests,
  getLeaveBalance,
  createLeaveRequest,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveHistory,
  getAllLeaveRequests
} from '../controllers/leaveController.js';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/my-requests', getMyLeaveRequests);
router.get('/balance', getLeaveBalance);
router.post('/request', createLeaveRequest);
router.get('/history', getLeaveHistory);

// HR only routes
router.get('/pending', requireHR, getPendingLeaveRequests);
router.get('/all', requireHR, getAllLeaveRequests);
router.put('/:id/approve', requireHR, approveLeaveRequest);
router.put('/:id/reject', requireHR, rejectLeaveRequest);

export default router;