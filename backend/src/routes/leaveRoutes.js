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
import { authenticate, requireHR, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/my-requests', getMyLeaveRequests);
router.get('/balance', getLeaveBalance);
router.post('/request', createLeaveRequest);
router.get('/history', getLeaveHistory);

// HR and Admin routes
router.get('/pending', (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'HR or Admin access required' });
  }
  next();
}, getPendingLeaveRequests);

router.get('/all', (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'HR or Admin access required' });
  }
  next();
}, getAllLeaveRequests);

router.put('/:id/approve', (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'HR or Admin access required' });
  }
  next();
}, approveLeaveRequest);

router.put('/:id/reject', (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'HR or Admin access required' });
  }
  next();
}, rejectLeaveRequest);

export default router;