import express from 'express';
import {
  getValidEmployeeIds,
  addValidEmployeeId,
  deleteValidEmployeeId
} from '../controllers/validEmployeeIdController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get all valid employee IDs
router.get('/', getValidEmployeeIds);

// Add a valid employee ID
router.post('/', addValidEmployeeId);

// Delete a valid employee ID
router.delete('/:id', deleteValidEmployeeId);

export default router;