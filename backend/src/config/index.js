import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: Number(process.env.PORT) || 3001,
  nodeEnv:
    process.env.NODE_ENV || 'development',

  // Database
  databaseUrl:
    process.env.DATABASE_URL,

  // Gemini API
  geminiApiKey:
    process.env.GEMINI_API_KEY,

  geminiModel:
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash',

  // CORS
  corsOrigin:
    process.env.CORS_ORIGIN ||
    'http://localhost:5173',

  // File Upload
  maxFileSize:
    Number(process.env.MAX_FILE_SIZE) ||
    10485760,

  uploadDir:
    process.env.UPLOAD_DIR ||
    './uploads',

  // RAG Configuration
  chunkSize:
    Number(process.env.CHUNK_SIZE) ||
    1000,

  chunkOverlap:
    Number(process.env.CHUNK_OVERLAP) ||
    200,

  embeddingModel:
    process.env.EMBEDDING_MODEL ||
    'gemini-embedding-001',

  embeddingDimension:
    Number(
      process.env.EMBEDDING_DIMENSION
    ) || 1536,

  topK:
    Number(process.env.TOP_K) || 5,

  // JWT
  jwtSecret:
    process.env.JWT_SECRET ||
    'your-secret-key-change-in-production',

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ||
    '24h',

  // Google OAuth
  googleClientId:
    process.env.GOOGLE_CLIENT_ID,

  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET,

  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:5173/auth/google/callback',
};

export const validateConfig = () => {
  const required = [
    'DATABASE_URL',
    'GEMINI_API_KEY',
  ];

  const missing =
    required.filter(
      (key) => !config[key]
    );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ', '
      )}`
    );
  }

  return true;
};