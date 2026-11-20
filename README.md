# Ai_note_generator- (Brain Nest)

Brain Nest is an AI-Powered Educational Intelligence Platform built for high-stakes exam preparation, adaptive tutoring, automated study notes generation, quizzes, syllabus analysis, and knowledge tracking.

---

## 🏗️ Repository Architecture

This repository contains both the frontend design studio and backend services:

```text
Ai_note_generator-/
├── backend/                        # Node.js + Express + TypeScript Backend
│   ├── src/                        # API routes, modules, middleware & services
│   ├── .env.example                # Backend environment template
│   ├── package.json
│   └── tsconfig.json
├── hue-inspired-design-studio/     # React + Vite + TanStack Router Frontend
│   ├── src/                        # Pages, UI components, dashboard routes
│   ├── .env.example                # Frontend environment template
│   ├── package.json
│   └── vite.config.ts
├── run_local.bat                   # Local development launcher
├── stop_local.bat                  # Local process terminator
└── .gitignore                      # Safe ignore rules (protects credentials & builds)
```

---

## 🚀 Deployment Architecture

### 1. Frontend Deployment (Vercel)
- **Framework Preset**: Vite
- **Root Directory**: `hue-inspired-design-studio`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: URL of your deployed backend (e.g. `https://your-backend.onrender.com/api/v1` or Railway/Render/AWS URL)
  - `VITE_SUPABASE_URL`: Your Supabase Project URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Publishable Key

### 2. Backend Deployment (Render / Railway / VPS / Cloud Run)
- **Root Directory**: `backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm start` (or `npx tsx src/server.ts`)
- **Port**: `4000` (or `PORT` provided by environment)
- **Environment Variables** (see `backend/.env.example`):
  - `NODE_ENV=production`
  - `PORT=4000`
  - `FRONTEND_ORIGIN`: Your deployed frontend Vercel URL
  - `SUPABASE_URL`: Your Supabase Project URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Secret
  - `GEMINI_API_KEY`: Google Gemini API Key
  - `GEMINI_MODEL`: `gemini-3.5-flash-lite` (with automatic fallback to `gemini-3.1-flash-lite` & `gemini-3.8-flash`)

---

## 💻 Local Development

1. **Start both Backend & Frontend**:
   Double click `run_local.bat` or run:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd hue-inspired-design-studio && npm run dev
   ```
2. **Access the application**:
   - Frontend: `http://localhost:8081` (or `http://localhost:5173`)
   - Backend API: `http://localhost:4000/api/v1`
   - API Health: `http://localhost:4000/api/v1/health`
