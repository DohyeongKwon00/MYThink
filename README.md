# MYT — AI Tutor

A personalized AI tutoring prototype for subjects like math and physics.
Chat with an AI tutor, get auto-generated study notes, and visualize math functions in 3D.

## Features

- **Subject selection** — Math, Physics, Chemistry, Biology
- **AI chat** — GPT-4o with subject-specific system prompts
- **Conversation memory** — pgvector embeddings for semantic context retrieval
- **Auto-generated notes** — Markdown study notes summarized from the conversation
- **3D visualization** — Function graphs rendered with Three.js when the tutor references a math function

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python, OpenAI SDK |
| Database | Supabase (PostgreSQL + pgvector) |
| 3D | @react-three/fiber, @react-three/drei |

## Project Structure

```
MYT/
├── backend/
│   └── app/
│       ├── api/routes/tutor.py   # All API endpoints
│       ├── core/                 # Config, OpenAI client, Supabase client
│       └── schemas/chat.py       # Pydantic schemas
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                    # Subject selection
│       │   └── chat/[sessionId]/page.tsx   # Chat page
│       ├── components/
│       │   ├── Chat.tsx          # Message list + input
│       │   ├── NotePanel.tsx     # Study notes panel
│       │   └── ThreeCanvas.tsx   # 3D graph renderer
│       ├── lib/api.ts            # apiFetch helper
│       └── types/index.ts        # Shared TypeScript types
└── supabase_setup.sql            # Database schema
```

## Getting Started

### 1. Database

Run `supabase_setup.sql` in the [Supabase SQL Editor](https://supabase.com/dashboard).

```sql
-- Creates: sessions, messages (with pgvector), notes tables
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # Fill in your keys
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
```

**`.env` keys:**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # Fill in your keys
npm install
npm run dev
# → http://localhost:3000
```

**`.env.local` keys:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create a new tutoring session |
| GET | `/api/chat/{session_id}` | Get all messages in a session |
| POST | `/api/chat` | Send a message, get AI response |
| POST | `/api/notes/{session_id}` | Generate study notes from conversation |
| GET | `/api/notes/{session_id}` | Get saved notes |
| GET | `/health` | Health check |
