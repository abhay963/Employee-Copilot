# Employee Copilot

A production-quality Employee Copilot application with RAG (Retrieval-Augmented Generation) capabilities, role-based access control, and document management.

## Tech Stack

### Backend
- **Node.js + Express** - Server framework
- **Neon PostgreSQL + pgvector** - Database and vector storage
- **Gemini** - LLM for text generation
- **LangChain** - Document processing, embeddings, and RAG pipeline
- **LangGraph** - AI workflow orchestration
- **Multer** - File upload handling

### Frontend
- **React + Vite** - Frontend framework
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Markdown** - Markdown rendering
- **Axios** - HTTP client

## Features

### For Employees
- Upload and manage personal documents
- Ask questions to the AI Copilot
- View conversation history
- Access company-wide knowledge documents

### For HR
- Organization-wide document access
- Upload and manage HR/company documents
- View all employees
- Ask questions using organization-wide knowledge
- Document type management (general, HR, policy, training)

### Security & Access Control
- **Role-Based Access Control (RBAC)** - Employees can only access their own private documents plus company-wide documents
- **Data Isolation** - HR can access organization-wide information; employees are restricted to their scope
- **Permission-Aware RAG** - Vector search respects user roles and ownership
- **Mock Authentication** - Development-friendly user switching (no real auth for demo)

## Project Structure

```
emp/
├── backend/
│   ├── src/
│   │   ├── ai/              # AI services (embedding, RAG workflow)
│   │   ├── config/          # Configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── db/              # Database schema and connection
│   │   ├── middleware/      # Express middleware (CORS, mock auth)
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (document processing, conversations)
│   │   └── server.js        # Main server file
│   ├── uploads/             # File upload directory
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React context (user management)
│   │   ├── pages/           # Page components (Employee/HR dashboards)
│   │   ├── services/        # API service
│   │   ├── App.jsx          # Main App component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Neon PostgreSQL account
- Gemini API key

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@hostname/database_name
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-004
TOP_K=5
```

4. **Initialize database**
```bash
node src/db/init.js
```

5. **Start backend server**
```bash
npm run dev
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` if needed (default should work):
```env
VITE_API_BASE_URL=http://localhost:3001
```

4. **Start frontend server**
```bash
npm run dev
```

## Usage

### Employee Dashboard
1. Access the application at `http://localhost:5173`
2. By default, you'll be logged in as "John Employee" (mock user)
3. Use the **Copilot** tab to:
   - Create conversations
   - Ask questions about uploaded documents
   - View conversation history
4. Use the **Documents** tab to:
   - Upload personal documents (PDF, Word, TXT, MD)
   - Manage document visibility (private/company)
   - View and delete documents

### HR Dashboard
1. Click the **HR** button in the User Switcher (top right)
2. Access additional features:
   - **Copilot** - Ask questions using organization-wide knowledge
   - **Documents** - Manage all documents, set document types
   - **Employees** - View all employees in the organization

### Document Processing
- Documents are automatically processed when uploaded:
  1. Text extraction (PDF, Word, TXT, MD)
  2. Chunking with configurable size/overlap
  3. Embedding generation using Gemini
  4. Storage in PostgreSQL with pgvector
- Document deletions automatically remove associated chunks/embeddings

### RAG Pipeline
1. User asks a question
2. Question is embedded using Gemini
3. Permission-aware similarity search retrieves relevant chunks
4. Retrieved context is passed to Gemini with the question
5. Gemini generates a grounded answer with source citations
6. Answer and sources are displayed to the user

## Database Schema

### Tables
- **users** - User accounts with roles (employee/hr)
- **documents** - Document metadata and ownership
- **document_chunks** - Text chunks with embeddings for RAG
- **conversations** - Chat conversations
- **messages** - Individual messages in conversations

### Key Features
- pgvector extension for similarity search
- Foreign key relationships with cascade delete
- Indexes for common queries and vector search
- Ownership and visibility fields for RBAC

## API Endpoints

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/all` - Get all users (HR only)
- `GET /api/users/role/:role` - Get users by role (HR only)

### Documents
- `GET /api/documents` - Get accessible documents
- `GET /api/documents/:id` - Get single document
- `POST /api/documents/upload` - Upload document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/type/:type` - Get documents by type (HR only)

### Conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations` - Get user conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations/:id/message` - Send message
- `DELETE /api/conversations/:id` - Delete conversation
- `PATCH /api/conversations/:id/title` - Update conversation title

## Development Notes

### Mock Authentication
- The application uses mock authentication for development
- User switching is done via the User Switcher component
- Headers `X-User-Id` and `X-User-Role` are sent with API requests
- Replace with real authentication (JWT, OAuth) for production

### File Uploads
- Supported formats: PDF, Word (.docx, .doc), TXT, Markdown
- Max file size: 10MB (configurable)
- Files are stored in the `uploads` directory
- Document processing happens asynchronously

### RAG Configuration
- Chunk size: 1000 characters (configurable)
- Chunk overlap: 200 characters (configurable)
- Top K results: 5 (configurable)
- Embedding model: text-embedding-004
- LLM model: gemini-pro

## Production Considerations

1. **Authentication** - Replace mock auth with real authentication system
2. **Environment Variables** - Ensure all secrets are properly configured
3. **Database** - Use connection pooling and proper indexing
4. **File Storage** - Consider cloud storage for uploaded files
5. **Error Handling** - Implement comprehensive error logging
6. **Rate Limiting** - Add rate limiting for API endpoints
7. **Input Validation** - Strengthen input validation and sanitization
8. **HTTPS** - Use HTTPS in production
9. **Monitoring** - Add application monitoring and logging

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Ensure Neon PostgreSQL is accessible
- Check pgvector extension is enabled

### Gemini API Issues
- Verify GEMINI_API_KEY is valid
- Check API quota and limits
- Ensure model name is correct

### Document Processing Failures
- Check file format is supported
- Verify file size is within limits
- Check upload directory permissions

### Frontend Build Issues
- Clear node_modules and reinstall
- Verify Node.js version compatibility
- Check environment variables are set

## License

This project is for demonstration purposes.
