# BRAIN NEST
# TECHNICAL REQUIREMENTS DOCUMENT (TRD)

**Product:** Brain Nest – AI Powered Intelligence Platform For Learners  
**Version:** 1.0  
**Date:** November 10, 2026  
**Document Type:** Technical Requirements Document

---

# 1. Technical Overview

## 1.1 Purpose

This document defines the technical architecture, development standards, backend services, database structure, API requirements, AI integration, security, document processing, and testing requirements for Brain Nest.

The goal is to develop a modular, scalable, secure, and maintainable AI-powered educational platform.

## 1.2 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Language | TypeScript where practical |
| Backend | Node.js |
| Backend Framework | Express.js |
| AI Provider | Google Gemini API |
| Database | Supabase / PostgreSQL |
| Authentication | Supabase Auth or verified secure authentication implementation |
| File Storage | Supabase Storage or another configured storage provider |
| API Testing | Postman |
| Version Control | Git |
| Deployment | Configurable frontend and backend hosting |

The final implementation must be verified against the actual repository before changing existing dependencies or architecture.

---

# 2. System Architecture

## 2.1 High-Level Architecture

React + Vite Frontend  
↓  
Express.js Backend API  
↓  
Authentication and Authorization  
↓  
Feature Service Layer  
↓  
Shared Processing Services  
↓  
Database / File Storage / Gemini AI  
↓  
Structured Results  
↓  
Frontend Display and Downloads

## 2.2 Architecture Principles

- Modular architecture.
- Separation of frontend and backend responsibilities.
- Reusable AI service.
- Centralized document-processing service.
- Centralized authentication and authorization.
- Independent feature services.
- Consistent API response format.
- Strict user and source isolation.
- Backward-compatible API updates where possible.

One feature must not directly modify another feature's internal logic.

---

# 3. Frontend Technical Requirements

## 3.1 Frontend Structure

Organize the React application into reusable modules.

Suggested structure:

frontend/
- src/
  - components/
  - pages/
  - layouts/
  - features/
    - notes/
    - summary/
    - revision/
    - quiz/
    - mock-test/
    - question-analysis/
    - question-prediction/
    - dependency-graph/
    - syllabus-analyzer/
    - content-generation/
  - services/
  - hooks/
  - contexts/
  - types/
  - utils/
  - assets/

## 3.2 Frontend Responsibilities

- Render application pages and reusable components.
- Manage user interactions and form validation.
- Handle authentication states.
- Send requests to backend APIs.
- Display AI processing progress.
- Render structured AI outputs.
- Handle download and export actions.
- Display loading, empty, error, and success states.
- Maintain responsive layouts.

## 3.3 State Management

- Maintain authenticated user state.
- Maintain selected academic level and source where applicable.
- Reset incompatible selections when the source changes.
- Prevent stale results from appearing after a new upload.
- Avoid duplicate AI requests.
- Handle API loading and error states consistently.

## 3.4 Academic Level Filtering

The platform supports:

1. Class 9–10
2. HSC (11–12)
3. BSc

Subject and book options must be dynamically retrieved from actual database resources.

Do not hardcode unavailable subjects or show resources belonging to another academic level.

---

# 4. Backend Technical Requirements

## 4.1 Suggested Backend Structure

backend/
- src/
  - config/
  - controllers/
  - routes/
  - middleware/
  - services/
    - ai/
    - pdf/
    - notes/
    - summary/
    - revision/
    - quiz/
    - mock-test/
    - question-analysis/
    - prediction/
    - dependency-graph/
    - syllabus-analyzer/
    - content-generation/
    - points/
    - payments/
  - repositories/
  - validators/
  - types/
  - utils/
  - server.ts

## 4.2 Backend Responsibilities

- Authenticate and authorize requests.
- Validate uploaded documents.
- Process PDFs and extract content.
- Manage academic resources.
- Communicate securely with Gemini.
- Generate and validate structured AI responses.
- Enforce source isolation.
- Manage user activities and points.
- Save generated outputs.
- Handle payments securely.
- Provide consistent error handling.

## 4.3 API Standards

All APIs should:

- Use appropriate HTTP methods.
- Validate request bodies and parameters.
- Authenticate protected requests.
- Return predictable JSON responses.
- Use meaningful HTTP status codes.
- Avoid exposing secrets or internal stack traces.
- Log errors safely.

Recommended response structure:

{
  "success": true,
  "message": "Request completed successfully",
  "data": {},
  "error": null
}

Error response:

{
  "success": false,
  "message": "Unable to process the request",
  "data": null,
  "error": {
    "code": "PROCESSING_ERROR"
  }
}

---

# 5. Database Technical Requirements

## 5.1 Database Design

Use relational tables with appropriate primary keys, foreign keys, indexes, and access policies.

Suggested tables:

### User Management

- profiles
- user_settings
- user_points
- point_transactions

### Academic Resources

- academic_levels
- departments
- subjects
- books
- chapters
- shared_documents

### Document Processing

- uploaded_documents
- document_versions
- document_extractions
- document_chunks
- document_processing_jobs

### AI Learning Activities

- generated_notes
- generated_summaries
- revision_sheets
- revision_sheet_items
- quiz_sessions
- quiz_questions
- mock_test_sessions
- mock_test_answers
- question_banks
- analyzed_questions
- question_predictions
- dependency_graphs
- syllabus_analysis_reports
- generated_content

### Account and Business

- activity_logs
- subscriptions
- payment_transactions

## 5.2 Data Ownership

Every private user-generated record must include an owner identifier.

Example:

user_id → authenticated user's unique ID.

Database access policies must ensure users cannot read or modify another user's private data.

Shared academic resources must be separated from private uploads.

## 5.3 Dashboard Statistics

Dashboard statistics must be calculated using actual database records.

Examples:

- Total uploaded documents.
- Total generated notes.
- Total summaries.
- Total question analyses.
- Total quizzes.
- Total mock tests.

Never use hardcoded counts or shared activity totals.

New users must start with zero activity.

---

# 6. Authentication and Authorization

## 6.1 Registration