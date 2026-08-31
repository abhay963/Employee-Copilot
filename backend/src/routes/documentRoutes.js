import express from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config/index.js';
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByType
} from '../controllers/documentController.js';
import { authenticate, requireHR, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get all accessible documents
router.get('/', getDocuments);

// Get documents by type (HR and Admin only)
router.get('/type/:type', (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'HR or Admin access required' });
  }
  next();
}, getDocumentsByType);

// Get single document by ID
router.get('/:id', getDocumentById);

// Upload document
router.post('/upload', upload.single('file'), uploadDocument);

// Update document
router.put('/:id', updateDocument);

// Delete document
router.delete('/:id', deleteDocument);

export default router;
