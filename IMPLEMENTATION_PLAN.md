# IMPLEMENTATION PLAN: Brain Nest Backend & Full-Stack Integration

## Phase 1: Environment & Project Setup
- [x] Audit existing workspace and frontend dependencies (`PROJECT_AUDIT.md`).
- [ ] Initialize `backend/` directory with `package.json`, `tsconfig.json`, and dependencies:
  - Express, cors, helmet, dotenv, zod, express-rate-limit, multer
  - `@supabase/supabase-js`, `@google/genai`
  - `pdf-parse`, `mammoth`
  - TypeScript, ts-node-dev, vitest / jest, supertest
- [ ] Set up environment configuration with Zod schema validation (`backend/src/config/env.ts`).

## Phase 2: Database Design & Migrations (Supabase PostgreSQL)
- [ ] Create SQL migration files in `backend/supabase/migrations/`:
  - `001_initial_schema.sql`: profiles, documents, notes, note_sections, quizzes, quiz_questions, quiz_attempts, question_papers, question_analyses, important_questions, tutor_conversations, tutor_messages, revision_sheets, study_topics, study_graph_nodes, study_progress, wallet_transactions, ai_usage, subscriptions, audio_files.
  - Foreign key constraints, cascade rules, timestamp triggers.
  - Indexes on `user_id`, `created_at`, `subject`, `chapter`.
  - Row Level Security (RLS) policies for every table.
  - PostgreSQL RPC functions: `deduct_coins_atomic(user_id, amount, reason, ref_id)`, `add_coins_atomic(...)`.
  - `seed.sql` with default starter topics, syllabus presets, and sample graph nodes.

## Phase 3: Core Backend Architecture & Middleware
- [ ] Security middleware: Helmet, CORS configuration, Rate-limiter.
- [ ] Auth middleware: Supabase JWT verification (`backend/src/middleware/auth.middleware.ts`).
- [ ] Upload middleware: Multer memory storage with file type and size limits.
- [ ] Centralized error handler and standard response helpers (`backend/src/utils/response.ts`).
- [ ] Supabase client singleton (anon + admin service-role).
- [ ] Gemini AI client singleton (`backend/src/lib/gemini.ts`) using `@google/genai`.

## Phase 4: Module Implementation
- [ ] **Auth & User Module:** Register, Login, Current User (`/api/v1/auth/me`), Profile update.
- [ ] **Document Module:** Upload PDF/DOCX/TXT, extract text using `pdf-parse`/`mammoth`, save to Supabase Storage & DB.
- [ ] **AI Notes Module:** Generate structured notes via Gemini with prompt engineering, Zod output schema, coin deduction.
- [ ] **Quiz Module:** Generate MCQs, store quizzes, submit attempts, calculate scores, review answers.
- [ ] **Question Papers & Prediction Module:** Multi-year past paper text aggregation, frequency analysis, trend calculation.
- [ ] **AI Tutor Module:** Multi-turn conversational tutor with context memory and bilingual (English/Bangla) support.
- [ ] **Study Plan & Syllabus Module:** Topic priority, daily study tasks, syllabus tree.
- [ ] **Revision Module:** Rapid revision one-pager generation with key formulas and memory aids.
- [ ] **Graph Module:** Prerequisite dependency graph nodes and edges.
- [ ] **Wallet Module:** Balance check, transaction history, atomic coin deduction & bonus claims.
- [ ] **Subscription & Audio Modules:** Tier limits, Google TTS provider abstraction.

## Phase 5: Automated Testing & Verification
- [ ] Unit tests for services (AI note parser, coin deduction logic, file validator).
- [ ] API integration tests with Supertest (Health, Auth, Documents, Wallet, Notes).
- [ ] Type-check backend with `tsc --noEmit`.
- [ ] Verify test suite passes.

## Phase 6: Frontend Integration
- [ ] Create `src/lib/api.ts` in `hue-inspired-design-studio` with auto-bearer auth headers and typed API methods.
- [ ] Provide `.env.example` in frontend for `VITE_API_URL` and `VITE_SUPABASE_URL`.
- [ ] Connect Auth forms (login, signup, logout) to backend/Supabase while preserving existing UI.
- [ ] Wire upload, notes, quiz, tutor, prediction, revision, graph, and wallet pages to backend endpoints with fallback resilience.

## Phase 7: Documentation & Deliverables
- [ ] Detailed `README.md` in English with step-by-step setup, Supabase configuration, and Gemini setup.
- [ ] Detailed `README-BN.md` in Bangla (বাংলা গাইড).
- [ ] Postman Collection JSON (`brain-nest.postman_collection.json`).
- [ ] Final verification summary.
