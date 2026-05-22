# AI Knowledge Assistant

Full-stack starter project for an AI Knowledge Assistant using a modern Next.js frontend and a FastAPI backend. This scaffold is designed for local development without Docker.

## Tech Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Axios, React Query
- Backend: FastAPI, PostgreSQL, SQLAlchemy

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
│   │   │       │   ├── assistant.py
│   │   │       │   └── health.py
│   │   │       └── router.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   │   └── assistant.py
│   │   └── services/
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (app)/
    │   │   ├── dashboard/
    │   │   │   └── page.tsx
    │   │   └── layout.tsx
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── loading.tsx
    │   └── page.tsx
    ├── components/
    │   ├── layout/
    │   ├── providers/
    │   └── ui/
    ├── hooks/
    ├── lib/
    ├── public/
    ├── types/
    ├── components.json
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
- Tailwind CSS with design tokens
- Reusable UI primitives inspired by shadcn/ui
- Axios API client
- React Query provider and dashboard hook
- FastAPI application factory
- Environment variable management for frontend and backend
- PostgreSQL-ready SQLAlchemy session setup

## Suggested Next Steps

- Add Alembic migrations
- Add authentication
- Add document ingestion and embeddings pipeline
- Add chat endpoints and persistent conversation history
