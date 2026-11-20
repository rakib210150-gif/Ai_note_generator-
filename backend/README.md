# Brain Nest Backend — Complete Setup & Architecture Guide

Welcome to the backend architecture for **Brain Nest**, an AI-Powered Educational Intelligence Platform built for high-stakes exam preparation, adaptive tutoring, automated study notes, quizzes, multi-year past-paper analysis, and knowledge tracking.

---

## 1. Technologies & Architecture
- **Runtime & Server**: Node.js (v20+ / v26) + Express.js + TypeScript
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth (JWT Bearer Token verification)
- **File Storage**: Supabase Storage (`study_materials` private bucket)
- **AI Engine**: Google Gemini API (`@google/genai`) with structured JSON validation & configurable models
- **Document Processing**: `pdf-parse` (PDF extraction) + `mammoth` (DOCX extraction) + Multer
- **Security**: Helmet, CORS origin validation, Rate Limiting (`express-rate-limit`), Zod input schemas

---

## 2. Directory Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Zod-validated environment config
│   │   └── cors.ts         # CORS security policy
│   ├── lib/
│   │   ├── supabase.ts     # Supabase public & service-role clients
│   │   └── gemini.ts       # Google GenAI service wrapper
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Supabase JWT token validator
│   │   ├── error.middleware.ts       # Centralized error handler
│   │   ├── rate-limit.middleware.ts  # Standard & AI rate limiters
│   │   └── upload.middleware.ts      # Multer file validator & memory buffer
│   ├── modules/
│   │   ├── auth/           # Login, registration, profile (/me)
│   │   ├── documents/      # Upload, extraction, storage
│   │   ├── notes/          # AI structured exam notes with coin safety
│   │   ├── quizzes/        # Adaptive MCQs, attempts, automatic scoring
│   │   ├── questions/      # Past paper frequency analysis & trends
│   │   ├── tutor/          # Conversational AI tutor with English & Bangla
│   │   ├── revision/       # One-page rapid revision generator
│   │   ├── graph/          # Knowledge dependency prerequisites
│   │   ├── progress/       # User study stats, streaks, quiz metrics
│   │   ├── wallet/         # Atomic PostgreSQL coin deductions & top-ups
│   │   ├── subscriptions/  # Entitlements and tier tracking
│   │   └── audio/          # Spoken explanations abstraction
│   ├── routes/
│   │   └── index.ts        # Versioned router (/api/v1)
│   ├── utils/
│   │   └── response.ts     # Standardized JSON response formatting
│   ├── app.ts              # Express application setup
│   └── server.ts           # Server bootstrap
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Complete PostgreSQL schema, RLS, & RPC
│   └── seed.sql
├── tests/
│   └── api.test.ts         # Automated Supertest & Vitest integration suite
├── brain-nest.postman_collection.json # Ready-to-import Postman collection
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 3. Step-by-Step Setup Guide

### Step 1: Install Dependencies
Open a terminal in the `backend/` directory:
```bash
cd backend
npm install
```

### Step 2: Supabase Project Setup
1. Create a free account and project at [Supabase](https://supabase.com).
2. Go to **Project Settings -> API**:
   - Copy **Project URL** (`https://your-project.supabase.co`)
   - Copy **anon / public key**
   - Copy **service_role key** (secret)
3. Go to **Storage**:
   - Create a new bucket named: `study_materials` (mark as private).
4. Go to **SQL Editor**:
   - Open `backend/supabase/migrations/001_initial_schema.sql`.
   - Paste the SQL script and run it. This will create all 20 tables, foreign keys, row level security (RLS) policies, and atomic RPC functions (`deduct_coins_atomic`, `add_coins_atomic`).

### Step 3: Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com).
2. Create an API Key.

### Step 4: Configure Backend Environment
Copy `.env.example` to `.env` inside `backend/`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
NODE_ENV=development
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=study_materials
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
MAX_UPLOAD_MB=15
```

### Step 5: Run the Backend
- Development mode (with live watch):
  ```bash
  npm run dev
  ```
- Run tests:
  ```bash
  npm test
  ```
- Build production bundle:
  ```bash
  npm run build
  ```

---

## 4. Testing with Postman
Import `backend/brain-nest.postman_collection.json` into Postman:
1. Call `System Health` (`GET http://localhost:4000/api/v1/health`).
2. Call `Auth - Signup` or `Auth - Login`. Copy the returned `access_token`.
3. Set the `authToken` collection variable in Postman.
4. Test protected endpoints: Notes, Quizzes, Tutor, Wallet, and Question Papers.
