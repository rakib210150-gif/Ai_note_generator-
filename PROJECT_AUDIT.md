# PROJECT AUDIT: Brain Nest Fullstack Intelligence Platform

**Date:** 2026-10-30  
**Project Workspace:** `final project antrigavity`  
**Frontend Directory:** `hue-inspired-design-studio`  
**Target Backend Directory:** `backend` (to be created at workspace root)

---

## 1. Executive Summary
Brain Nest is an AI-powered intelligence platform for learners designed for exam preparation, automated study notes, quizzes, syllabus progress, past-paper analysis, adaptive tutoring, and rapid revision sheets.

The current frontend is a modern TanStack Start + React 19 + TypeScript + Tailwind CSS application with 15 dashboard routes and an extensive user interface. However, its core operations (authentication, storage, notes generation, quizzes, tutor chat, question prediction, and coin transactions) currently rely on client-side state (`localStorage` in `src/lib/store.ts`) and mock/template-based string manipulation (`src/lib/ai-engine.ts`).

The user's goal is to keep the existing frontend completely intact (no redesign, no component removal, no UI disruption) while establishing a production-ready Node.js + Express + TypeScript + Supabase + Google Gemini backend, and seamlessly wiring the frontend to communicate with it.

---

## 2. Frontend Structure & Tech Stack
- **Framework:** TanStack Start (`@tanstack/react-start` + `@tanstack/react-router`) on Vite 8 & React 19.
- **Styling:** Tailwind CSS v4 + Radix UI primitives + Lucide React + Sonner (toasts).
- **Current State Management:** `src/lib/store.ts` using `localStorage` keys with prefix `bn_`.
- **Current AI Engine:** `src/lib/ai-engine.ts` using client-side heuristic string splitting and template formatting.
- **Current Pages & Routes:**
  - Public routes: `/` (Landing), `/login`, `/signup`, `/features`, `/pricing`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms`.
  - Dashboard routes (`/dashboard/*`):
    - `/dashboard/index` (Overview & quick launch)
    - `/dashboard/upload` (File upload & text extraction demo)
    - `/dashboard/notes` (Note generator)
    - `/dashboard/summaries` (Short high-retention summaries)
    - `/dashboard/quiz` (MCQ generation & self-assessment)
    - `/dashboard/tutor` (Interactive AI study tutor chat)
    - `/dashboard/questions` (Important question paper analysis)
    - `/dashboard/prediction` (Multi-year syllabus & past paper prediction)
    - `/dashboard/revision` (Rapid revision one-pager generator)
    - `/dashboard/graph` (Prerequisite knowledge graph)
    - `/dashboard/syllabus` (Syllabus topic-by-topic tracker)
    - `/dashboard/progress` (Subject mastery & achievements)
    - `/dashboard/wallet` (Coin balance, daily claims, top-up packages)
    - `/dashboard/editor` (Document editor)
    - `/dashboard/library` (Saved documents & notes)

---

## 3. Data Dependencies & Mock Implementation Audit

| Feature | Current Frontend Implementation | Required Backend API |
| :--- | :--- | :--- |
| **Authentication** | `login()` & `signup()` in `store.ts` sets `bn_user` in `localStorage`. | Supabase Auth (`/api/v1/auth/signup`, `/api/v1/auth/login`, `/api/v1/auth/me`, JWT verification) |
| **Documents & Upload** | Reads client text files, provides simulated OCR for binary files in `upload.tsx`. Stores text in `store.ts`. | Multer + `pdf-parse` + `mammoth` + Supabase Storage bucket + PostgreSQL `documents` table (`/api/v1/documents`) |
| **AI Notes Generation** | Template string generation in `ai-engine.ts` (`generateDetailedNotes`, etc.). | Google Gemini API (`@google/genai`) with structured JSON / Markdown schemas (`/api/v1/notes/generate`) |
| **AI Quizzes** | Heuristic question builder in `ai-engine.ts` (`generateQuiz`). | Gemini API with Zod validation (`/api/v1/quizzes/generate`, attempts & score records) |
| **Past Paper Analysis & Prediction** | Static presets and local calculations in `prediction.tsx` and `questions.tsx`. | Gemini multi-document question extractor and frequency analyzer (`/api/v1/question-papers`) |
| **AI Tutor** | Hardcoded starter responses in `tutor.tsx`. | Conversational Gemini API sessions with message persistence in PostgreSQL (`/api/v1/tutor`) |
| **Revision Sheets** | Template generator in `ai-engine.ts`. | Gemini high-yield formula & memory aid generation (`/api/v1/revision/generate`) |
| **Dependency Graph** | Hardcoded `GRAPH_DATA` in `graph.tsx`. | Dynamic graph generation based on syllabus & progress (`/api/v1/graph`) |
| **Study Progress & Syllabus** | Local objects in `store.ts`. | PostgreSQL progress & syllabus tables (`/api/v1/progress`, `/api/v1/syllabus`) |
| **Wallet & Coins** | In-memory balance updated directly via `updateCoins()` in `store.ts`. | PostgreSQL atomic RPC functions preventing race conditions and double-spending (`/api/v1/wallet`) |
| **Audio Explanations** | Not implemented yet in frontend. | Gemini/Google TTS abstraction with Supabase Storage integration (`/api/v1/audio`) |
| **Subscriptions** | Pricing tiers present in `pricing.tsx`, no backend tracking. | PostgreSQL `subscriptions` table with tier entitlements (`/api/v1/subscriptions`) |

---

## 4. Architectural Decisions & Safety Strategy
1. **Preserve Demo/Offline Fallback:** Ensure that if backend environment variables are absent during local frontend testing, the frontend displays clear server status while allowing seamless operation once the backend is running.
2. **Backend Separation:** Build a standalone, robust `backend/` directory with its own `package.json`, TypeScript configuration, test suite, and environment definitions.
3. **API Client:** Create a clean, singleton API client in `src/lib/api.ts` in the frontend that intercepts auth tokens from Supabase and transparently switches from mock state to real backend endpoints.
4. **Security Enforcements:**
   - Supabase service-role client used *only* on the server.
   - All protected routes verify Bearer JWT and retrieve `req.user.id`.
   - Ownership checks (`WHERE user_id = ...`) in every query.
   - Zod validation on all incoming request payloads.
   - Centralized error handler and Helmet + CORS + rate-limiting.
