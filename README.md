# AI Knowledge Assistant

Full-stack starter project for an AI Knowledge Assistant using a modern Next.js frontend and a FastAPI backend. This scaffold is designed for local development without Docker.

## Tech Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Axios, React Query
- Backend: FastAPI, PostgreSQL, SQLAlchemy, fastapi-jwt-auth

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
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

### 2. Start PostgreSQL

Create a PostgreSQL database named `ai_knowledge_assistant` and update `DATABASE_URL` if your credentials or port differ.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Install backend dependencies

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Run the development servers

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
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
- Environment variable management for frontend and backend
- PostgreSQL-ready SQLAlchemy session setup

## Architecture Notes

- Authentication and API scaffolding: [backend/app](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/app)
- Phase 3 database design and ER explanation: [backend/PHASE3_DATABASE_ARCHITECTURE.md](/C:/Users/Kanishka/Desktop/AI-Knowledge%20Assistant/backend/PHASE3_DATABASE_ARCHITECTURE.md)

## Suggested Next Steps

- Add Alembic migrations
- Add document ingestion and embeddings pipeline
- Add chat endpoints and persistent conversation history
- Add role-based permissions and email verification
