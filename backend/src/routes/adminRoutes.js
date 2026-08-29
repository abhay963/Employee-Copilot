import express from 'express';
import {
  getUsers,
  blockUser,
  unblockUser,
  deleteUser,
  getUserStats
} from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/users', getUsers);

// Block user
router.patch('/users/:id/block', blockUser);

// Unblock user
router.patch('/users/:id/unblock', unblockUser);

// Delete user
router.delete('/users/:id', deleteUser);

// Get user statistics
router.get('/stats', getUserStats);

export default router;