import express from 'express';
import {
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
  deleteConversation,
  updateConversationTitle
} from '../controllers/conversationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create new conversation
router.post('/', createConversation);

// Get all conversations for current user
router.get('/', getConversations);

// Get single conversation with messages
router.get('/:id', getConversationById);

// Send message to conversation
router.post('/:id/message', sendMessage);

// Update conversation title
router.patch('/:id/title', updateConversationTitle);

// Delete conversation
router.delete('/:id', deleteConversation);

export default router;
