import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // ============================================================
  // SERVER
  // ============================================================

  port: Number(process.env.PORT) || 3001,

  nodeEnv:
    process.env.NODE_ENV || 'development',

  // ============================================================
  // DATABASE
  // ============================================================

  databaseUrl:
    process.env.DATABASE_URL,

  // ============================================================
  // GEMINI
  // ============================================================

  geminiApiKey:
    process.env.GEMINI_API_KEY,

  geminiModel:
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash',

  // ============================================================
  // CORS
  // ============================================================

  corsOrigin:
    process.env.CORS_ORIGIN ||
    'http://localhost:5173',

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  maxFileSize:
    Number(process.env.MAX_FILE_SIZE) ||
    10485760,

  uploadDir:
    process.env.UPLOAD_DIR ||
    './uploads',

  // ============================================================
  // RAG
  // ============================================================

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

  // ============================================================
  // JWT
  // ============================================================

  jwtSecret:
    process.env.JWT_SECRET ||
    'your-secret-key-change-in-production',

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ||
    '24h',

  // ============================================================
  // GOOGLE OAUTH
  //
  // Gmail and Calendar use the SAME Google OAuth client,
  // but DIFFERENT redirect URIs and DIFFERENT scopes.
  // ============================================================

  googleClientId:
    process.env.GOOGLE_CLIENT_ID,

  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET,

  googleGmailRedirectUri:
    process.env.GOOGLE_GMAIL_REDIRECT_URI ||
    'http://localhost:3001/api/google/callback',

  googleCalendarRedirectUri:
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    'http://localhost:3001/api/google/calendar/callback',

  // ============================================================
  // TAVILY
  // ============================================================

  tavilyApiKey:
    process.env.TAVILY_API_KEY,
};

// ============================================================
// VALIDATE CONFIG
// ============================================================

export const validateConfig = () => {
  const required = [
    {
      name: 'DATABASE_URL',
      value: config.databaseUrl,
    },
    {
      name: 'GEMINI_API_KEY',
      value: config.geminiApiKey,
    },
    {
      name: 'GOOGLE_CLIENT_ID',
      value: config.googleClientId,
    },
    {
      name: 'GOOGLE_CLIENT_SECRET',
      value: config.googleClientSecret,
    },
  ];

  const missing = required
    .filter((item) => !item.value)
    .map((item) => item.name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ', '
      )}`
    );
  }

  // Log redirect URIs for debugging (not required to be set, have defaults)
  console.log('==========================================');
  console.log('Google OAuth Configuration:');
  console.log('Gmail Redirect URI:', config.googleGmailRedirectUri);
  console.log('Calendar Redirect URI:', config.googleCalendarRedirectUri);
  console.log('==========================================');

  return true;
};