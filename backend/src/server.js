import express from 'express';
import helmet from 'helmet';
import { config, validateConfig } from './config/index.js';
import { corsMiddleware } from './middleware/cors.js';
import initDatabase from './db/init.js';
import userRoutes from './routes/userRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import googleRoutes from './routes/googleRoutes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/google', googleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Validate configuration
    try {
      validateConfig();
    } catch (configError) {
      console.warn('Configuration warning:', configError.message);
      console.warn('Server will start but some features may not work');
    }

    // Initialize database
    console.log('Initializing database...');
    try {
      await initDatabase();
      console.log('Database initialized successfully');
    } catch (dbError) {
      console.warn('Database initialization failed:', dbError.message);
      console.warn('Server will continue but database features may not work');
    }

    // Start server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for testing
export { app };

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
