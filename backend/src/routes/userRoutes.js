import express from 'express';
import { getCurrentUser, getAllUsers, getUsersByRole } from '../controllers/userController.js';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get current user
router.get('/me', getCurrentUser);

// Get all users (HR only)
router.get('/all', requireHR, getAllUsers);

// Get users by role (HR only)
router.get('/role/:role', requireHR, getUsersByRole);

export default router;
