import express from 'express';
import { authenticate } from '../middleware/auth.js';
import briefController from '../controllers/briefController.js';

const router = express.Router();

// Get latest daily AI brief
router.get('/daily', authenticate, briefController.getLatestBrief.bind(briefController));

// Generate daily AI brief
router.post('/daily', authenticate, briefController.generateDailyBrief.bind(briefController));

export default router;
