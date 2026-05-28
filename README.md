# AI Knowledge Assistant

Full-stack AI Knowledge Assistant with persistent chat memory, document RAG, and local AI inference. Deployed to production using Vercel (frontend) and Render (backend).

## Tech Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Axios, React Query
- Backend: FastAPI, PostgreSQL, SQLAlchemy, fastapi-jwt-auth
- AI: Ollama (local LLM), Sentence Transformers, ChromaDB
- Deployment: Vercel (frontend), Render (backend & database)

## Project Structure

```text
AI-Knowledge Assistant/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── routes/
│   │   │       │   ├── auth.py
│   │   │       │   ├── assistant.py
│   │   │       │   └── health.py
│   │   │       └── router.py
│   │   ├── api/
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── middleware.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── main.py
│   │   ├── models/
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   ├── assistant.py
│   │   │   └── auth.py
│   │   └── services/
│   │       └── auth.py
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   └── register/
    │   │       └── page.tsx
    │   ├── (app)/
    │   │   ├── dashboard/
    │   │   │   └── page.tsx
    │   │   └── layout.tsx
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── loading.tsx
    │   └── page.tsx
    ├── components/
    │   ├── auth/
    │   ├── layout/
    │   ├── providers/
    │   └── ui/
    ├── hooks/
    ├── lib/
    │   └── validations/
    ├── public/
    ├── types/
    ├── components.json
    ├── middleware.ts
    ├── next.config.ts
    ├── next-env.d.ts
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.ts
    └── tsconfig.json
```

## Setup

### 1. Create environment files

Copy the root example values into:

- `frontend/.env.local`
- `backend/.env`

Frontend needs:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Backend needs:

```env
PROJECT_NAME=AI Knowledge Assistant
APP_ENV=development
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_knowledge_assistant
JWT_SECRET_KEY=change-me-in-production
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRES_DAYS=7
UPLOAD_ROOT_DIR=storage/uploads
MAX_UPLOAD_SIZE_BYTES=10485760
CHROMA_PERSIST_DIRECTORY=storage/chroma
CHROMA_COLLECTION_NAME=knowledge_chunks
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
RAG_TOP_K=4
LLM_PROVIDER=openai
LLM_MODEL_NAME=gpt-4.1-mini
LLM_API_KEY=
LLM_BASE_URL=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=deepseek-r1:7b
OLLAMA_KEEP_ALIVE=5m
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

### 2. Start PostgreSQL

Create a PostgreSQL database named `ai_knowledge_assistant` and update `DATABASE_URL` if your credentials or port differ.

### 3. Start Ollama and pull local models

Run: ollama pull deepseek-r1:7b before starting the backend

```bash
ollama serve
ollama pull deepseek-r1:7b
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Install backend dependencies

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 6. Run the development servers

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```

Optional root shortcuts:

```bash
npm run frontend:dev
npm run frontend:lint
```

## Included Features

- Responsive landing page
- Dashboard layout with sidebar
- Dark mode using `next-themes`
- Login and register pages with validated forms
- Protected frontend routes plus logout flow
- Toast notifications for auth feedback
- ChatGPT-style chat interface with sidebar and conversation history
- Markdown rendering, code blocks, copy actions, and streaming UI
- Responsive mobile chat layout with profile dropdown and settings modal
- Tailwind CSS with design tokens
- Reusable UI primitives inspired by shadcn/ui
- Axios API client
- React Query provider and dashboard hook
- FastAPI application factory
- JWT auth with access and refresh cookies
- Bcrypt password hashing
- SQLAlchemy models with Alembic-managed migrations
- Secure document uploads with local per-user storage
- Drag-and-drop document manager with progress, preview, and delete
- LangChain + Sentence Transformers + ChromaDB RAG pipeline
- Semantic retrieval, top-k context assembly, and prompt templating
- Per-user ChromaDB collections with vector metadata and hybrid retrieval
- Ollama local LLM chat generation with `deepseek-r1:7b`, `llama3`, and `mistral`
- Streaming grounded answers in the chat UI with markdown rendering
- Environment variable management for frontend and backend
- PostgreSQL-ready SQLAlchemy session setup

## Architecture Notes

- Authentication and API scaffolding: [backend/app](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/app)
- Phase 3 database design and ER explanation: [backend/PHASE3_DATABASE_ARCHITECTURE.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE3_DATABASE_ARCHITECTURE.md)
- Phase 6 RAG architecture: [backend/PHASE6_RAG_ARCHITECTURE.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE6_RAG_ARCHITECTURE.md)
- Phase 7 vector store architecture: [backend/PHASE7_VECTORSTORE_ARCHITECTURE.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE7_VECTORSTORE_ARCHITECTURE.md)
- Phase 9 chat memory architecture: [backend/PHASE9_CHAT_MEMORY_ARCHITECTURE.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE9_CHAT_MEMORY_ARCHITECTURE.md)
- Phase 10-11 security and analytics: [backend/PHASE10_11_SECURITY_ANALYTICS.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE10_11_SECURITY_ANALYTICS.md)
- Phase 12-13 advanced features and optimization: [backend/PHASE12_13_ADVANCED_FEATURES_OPTIMIZATION.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE12_13_ADVANCED_FEATURES_OPTIMIZATION.md)

## Additional Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete production deployment instructions
- [Production Checklist](PRODUCTION_CHECKLIST.md) - Pre-deployment verification checklist
- [Scalability Recommendations](SCALABILITY.md) - Scaling strategies for production

## Deployment

### Quick Start (Development)

See the [Setup](#setup) section below for local development.

### Production Deployment

For production deployment, follow the complete [Deployment Guide](DEPLOYMENT.md).

**Quick Overview:**

1. **Backend (Render)**
   - Push code to GitHub
   - Connect repository to Render
   - Render auto-detects `render.yaml`
   - Configure environment variables
   - Run database migrations via Render Shell

2. **Frontend (Vercel)**
   - Connect repository to Vercel
   - Select `frontend` directory
   - Configure `NEXT_PUBLIC_API_BASE_URL` environment variable
   - Deploy

3. **Post-Deployment**
   - Update backend CORS with frontend URL
   - Configure Ollama (local or cloud)
   - Run production checklist: [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

**Production URLs:**
- Frontend: Vercel provides URL (e.g., `https://your-app.vercel.app`)
- Backend: Render provides URL (e.g., `https://your-backend.onrender.com`)
- Database: Render PostgreSQL (managed)

**Cost Estimates:**
- Free tier: $0/month (first 90 days), then ~$7/month
- Production: ~$52/month (Vercel Pro + Render Standard + PostgreSQL)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.
