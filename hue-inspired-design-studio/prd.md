# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# Brain Nest – AI Powered Intelligence Platform For Learners

**Document Version:** 2.0  
**Date:** November 10, 2026  
**Product Type:** AI-Powered Educational Platform  
**Document Status:** Updated Requirements  
**Target Users:** School, College, and University Students

---

# 1. Project Overview

## 1.1 Product Description

Brain Nest is an AI-powered educational intelligence platform designed to help students learn, understand, organize, and prepare for examinations more effectively.

The platform uses Artificial Intelligence, Natural Language Processing (NLP), and document analysis to transform textbooks, PDFs, course outlines, and question banks into personalized learning materials.

Students can generate notes, summaries, revision sheets, quizzes, mock tests, question predictions, and syllabus-based study recommendations.

The platform aims to make learning more accessible, organized, personalized, and efficient.

## 1.2 Main Objectives

- Generate concise, syllabus-focused study notes.
- Analyze textbooks, PDFs, and academic documents.
- Provide topic-wise explanations and summaries.
- Identify important and frequently repeated examination questions.
- Generate personalized revision materials.
- Help students understand topic prerequisites.
- Match course outlines with textbook chapters.
- Support different academic levels.
- Provide downloadable learning resources.
- Maintain individual student activity and progress.

---

# 2. Target Academic Levels

Brain Nest must support three academic levels throughout all relevant features:

1. Class 9–10
2. HSC (Class 11–12)
3. BSc (Undergraduate)

### Resource Management Rules

- Each academic level must have its own subjects, books, chapters, and learning resources.
- Students must only see resources belonging to their selected academic level.
- Class 9–10 resources must never appear under HSC or BSc.
- Only actual uploaded and available resources should be displayed.
- If resources are unavailable, display: "Books have not been uploaded yet."
- Never display fake subjects, demo books, or fabricated academic content.

---

# 3. Core Features and Functional Requirements

## 3.1 AI Notes Generator

**Purpose:** Generate structured, exam-oriented notes from textbooks and uploaded study materials.

### Requirements

- Generate notes from database books or uploaded PDFs/documents.
- Allow students to select academic level, subject, chapter, and topic where applicable.
- Analyze the selected source before generating notes.
- Produce organized notes with headings, definitions, key points, and explanations.
- Support simple and exam-focused language.
- Allow editing and saving generated notes.
- Support PDF and DOC downloads.
- Ensure that notes are generated only from the selected source.

## 3.2 Topic-wise Summary

**Purpose:** Analyze complete academic documents and generate summaries for selected chapters or topics.

### Requirements

1. Students upload a PDF or document.
2. The system analyzes the entire document.
3. Automatically extracts available chapters, headings, and topics.
4. Displays extracted chapters in a dedicated selection area.
5. Provides another input or selection area for choosing a specific topic.
6. Generates a summary based on the selected topic.
7. Supports three difficulty levels:
   - Easy
   - Medium
   - Hard
8. Supports downloadable summaries.

The system must not generate chapter names without evidence from the uploaded document.

## 3.3 Revision Sheet Generator

**Purpose:** Generate personalized revision sheets based on student learning activities.

### Requirements

- Use the student's own learning history.
- Include activities such as note generation, topic summaries, and other supported learning activities.
- Allow students to select relevant activities.
- Allow unwanted activity items to be removed.
- Generate a structured revision sheet.
- Display the generated sheet on the website.
- Support PDF download.
- Ensure that each student's revision sheet contains only their own selected activities.

## 3.4 Quiz Generator

**Purpose:** Generate interactive quizzes using database resources or uploaded PDFs.

### Two Quiz Modes

**Mode A: Database Curriculum**

- Select academic level.
- Select available subject.
- Select book and chapter.
- Generate questions from the selected chapter or selected complete book.

**Mode B: Upload PDF**

- Upload a PDF.
- Analyze the uploaded document.
- Extract subject headings, chapters, and topics.
- Generate quiz questions from the uploaded document.
- Allow chapter-specific or full-document quizzes.

### Important Rules

- Questions must come only from the selected source.
- A selected chapter must not include questions from other chapters.
- Previous uploads must never influence a new quiz.
- Do not mix database content with uploaded PDF content unless explicitly requested.
- If sufficient source content is unavailable, show a clear message instead of generating unrelated questions.

## 3.5 Mock Test

**Purpose:** Provide a complete examination simulation.

### Requirements

Students must be able to choose between:

**Option 1: Database-Based Mock Test**

- Select academic level.
- Select an available subject.
- Select a book, chapter, or complete syllabus where supported.
- Generate a mock examination using the selected database source.

**Option 2: PDF-Based Mock Test**

- Upload an academic PDF.
- Analyze the complete PDF.
- Extract subject headings and chapters.
- Automatically populate relevant subject and chapter selections.
- Allow students to take a test from a selected chapter or the entire document.

### Test Features

- Configurable question count.
- Examination timer.
- Multiple-choice questions where appropriate.
- Automatic evaluation.
- Correct answers and explanations.
- Final score and performance summary.
- Save test attempts to the student's account.

The mock test must use only the selected source and must never reuse content from an unrelated previous upload.

## 3.6 Question Analysis

**Purpose:** Analyze stored or uploaded examination questions to identify important and frequently repeated questions.

### Database Question Analysis

- Initially support available BSc CSE question banks organized by semester.
- Keep the architecture extensible for BBA, Tourism, and other departments.
- Support academic-level and subject-based filtering.
- Display only question banks that actually exist.

### PDF Question Analysis

- Upload question-bank PDFs.
- Analyze questions across available examination years.
- Identify repeated questions and frequency.
- Determine the latest examination year from the actual document.
- Provide output count options: 5, 10, 15, and 20.
- Display total detected questions and requested output count.
- Explain why selected questions are considered important.

If the latest detected year is 2023, the system may present a 2024 preparation context. This must be calculated dynamically rather than hardcoded.

### Empty Data Rule

If a question bank does not exist for a selected subject or academic level, display:

"Question data has not been updated yet."

Never generate fake or demo questions.

## 3.7 Question Prediction

**Purpose:** Estimate which questions may be important for upcoming examinations based on historical question-bank data.

### Requirements

- Accept examination-year information and question-bank PDFs.
- Analyze historical question frequency.
- Identify repeated topics and patterns.
- Rank potentially important questions.
- Explain the historical evidence behind predictions.
- Use only the selected question bank.

Predictions must be presented as estimates, not guaranteed examination questions. Do not invent probability percentages without a valid calculation and supporting data.

## 3.8 Content Dependency Graph

**Purpose:** Help students understand what they should learn before studying a particular topic.

### Three Input Methods

**Method 1: Database Selection**
- Select academic level.
- Select subject and chapter.

**Method 2: PDF Upload**
- Upload a PDF.
- Analyze the document.
- Enter or select a topic.

**Method 3: Free Text**
- Enter any topic manually.

### Expected Output

The system must identify:

- Required prerequisite topics.
- Earlier concepts students should understand.
- Logical learning order.
- Approximate study coverage required.
- Connections between related topics.

### Visualization Requirements

- Display a proper interactive node-and-edge graph.
- Show prerequisite relationships clearly.
- Make nodes readable and logically arranged.
- Provide a text-based fallback if graph rendering fails.
- Never show an empty graph when valid results are available.

## 3.9 AI Syllabus & Book Analyzer

**Purpose:** Automatically identify which textbook chapters and topics are relevant to a course syllabus.

### Required User Input

Students upload only two PDF files:

1. Book PDF
2. Course Outline / Syllabus PDF

### Workflow

1. Upload the Book PDF.
2. Upload the Course Outline/Syllabus PDF.
3. Automatically analyze both complete documents.
4. Extract syllabus units, topics, and learning requirements.
5. Extract book chapters, headings, and relevant sections.
6. Match syllabus topics with corresponding book chapters and sections.
7. Generate a structured syllabus-to-book mapping report.

### Expected Results

- Syllabus unit and topic.
- Matching book chapter.
- Relevant book section or page number, where identifiable.
- Match status:
  - Fully Covered
  - Partially Covered
  - Not Found
- Additional study recommendations.
- Unmatched syllabus topics.
- Clear explanation of uncertain matches.

### Critical UI Requirement

There must be no additional "Course Details & Match" selection section.

Students should not need to manually select course details, subjects, chapters, or matching options.

The complete workflow must operate automatically after the two PDFs are uploaded.

### Download

Allow the complete analysis report to be downloaded.

This feature must not break other PDF analysis features, existing APIs, or document-processing workflows.

## 3.10 AI-powered Content Generation from Syllabus

**Purpose:** Generate academic learning content and answers using syllabus requirements and reference materials.

### Requirements

- Upload a syllabus.
- Upload a reference book.
- Upload relevant examination questions.
- Analyze all uploaded documents.
- Identify relevant reference-book content.
- Generate answers and learning materials based on the reference book.
- Maintain syllabus relevance.
- Provide clear, organized, exam-oriented outputs.
- Support downloadable results.

Generated answers must remain grounded in the supplied reference material.

---

# 4. User Authentication and Account Management

## 4.1 Registration

Students must register before accessing protected learning features.

Registration information may include:

- Full name.
- Email address.
- Mobile number.
- Country.
- Password.

## 4.2 Login

- Secure login and logout.
- User-specific sessions.
- Protected feature access.
- Proper authentication and authorization.

A public demo area may be available if explicitly enabled, but demo access must not expose private user data or protected learning resources.

## 4.3 Starter Points

- Every eligible new account receives 500 starter points.
- Starter points must be credited only once.
- Point balance must be stored and validated on the backend.
- AI feature usage may deduct points according to configurable pricing rules.

## 4.4 User Data Isolation

- Each user must access only their own private uploads, activities, notes, tests, and history.
- Shared database resources may be accessible to authorized registered users.
- Never expose one user's private documents or learning history to another user.

---

# 5. User Dashboard

**Purpose:** Provide a personalized overview of each student's learning activity.

### Dashboard Information

- Total PDFs uploaded.
- Total notes generated.
- Total summaries generated.
- Total question analyses.
- Total quizzes completed.
- Total mock tests completed.
- Revision sheets generated.
- Recent learning activities.
- Current point balance.
- Other relevant learning statistics.

### Critical Requirements

- All statistics must be calculated from the authenticated user's actual records.
- New accounts must start with zero activity counts.
- Never display hardcoded or shared demo statistics.
- Deleting an activity must update relevant statistics when applicable.
- Dashboard data must refresh correctly after activities.

---

# 6. Payment and Premium Subscription

### Requirements

- Provide a premium subscription interface.
- Highlight the featured plan.
- Display plan features and pricing clearly.
- Support configurable AI usage limits and point costs.
- Track subscription status and payment history.
- Verify payments on the backend.
- Use secure payment webhooks.
- Never trust frontend payment-success messages without server-side verification.

The payment provider, currency, pricing, subscription duration, and point deduction rules must be configurable before production deployment.

---

# 7. Technical Architecture

## 7.1 Frontend

**Current known frontend direction:**
- React
- Vite
- Responsive UI architecture

### Frontend Requirements

- Modular components.
- Reusable UI elements.
- Protected routes.
- API-based communication.
- Loading, error, empty, and success states.
- Responsive layouts for desktop, tablet, and mobile.
- Accessible forms and navigation.

## 7.2 Backend

**Current known backend direction:**
- Node.js
- Express.js
- TypeScript

### Backend Responsibilities

- Authentication and authorization.
- User and activity management.
- PDF upload and processing.
- AI API communication.
- Document extraction and analysis.
- Question generation and analysis.
- Source-specific retrieval.
- Point management.
- Payment verification.
- Database operations.

## 7.3 Database

Supabase has been considered for database and authentication integration. Its current connection and implementation status must be verified.

The database should support:

- Users and profiles.
- Academic levels and subjects.
- Books and chapters.
- Shared academic resources.
- Private uploaded documents.
- Extracted document content.
- Notes and summaries.
- Question banks.
- Quiz and mock-test attempts.
- Revision sheets.
- Learning activity history.
- Point transactions.
- Subscriptions and payment records.

## 7.4 AI Integration

Google Gemini API has been selected/discussed for AI-powered functionality.

### Requirements

- Centralized AI service layer.
- Secure server-side API key management.
- Structured prompts and outputs.
- Input validation.
- Error handling and retry policies.
- Source-grounded generation.
- Token and usage monitoring.
- Feature-specific AI configurations.

AI integration must be reusable across features without duplicating API logic.

---

# 8. PDF and Document Processing

Document processing is a critical shared platform service.

### Requirements

- Support PDF and other explicitly supported document formats.
- Enforce configured upload-size limits. The existing UI has shown a 15 MB limit; confirm and enforce the intended limit consistently.
- Extract document text and structure.
- Detect headings, chapters, sections, and page numbers where possible.
- Support scanned PDFs through OCR where implemented.
- Handle empty, corrupted, password-protected, and unsupported documents.
- Show processing progress and meaningful error messages.
- Store extracted content against the correct document.

### Document Identity

Every uploaded document must have:

- Unique document ID.
- Owner ID for private uploads.
- Document type.
- Upload timestamp.
- Version information.
- Processing status.
- Extracted content linked to that document.

When a document is replaced or reprocessed, stale extracted content, embeddings, and cached results must not be reused.

---

# 9. Critical Platform-Wide Requirement: Source Isolation

This is one of the highest-priority requirements for Brain Nest.

Every AI-powered feature must use the exact source selected by the user.

### Required Rules

1. Never mix content from previous PDF uploads.
2. Never mix different users' private documents.
3. Never mix academic levels.
4. Never mix unrelated database books.
5. Never mix different subjects or chapters.
6. Never reuse stale AI responses or cached document chunks.
7. Never silently switch to another source when the selected source has insufficient content.

### Backend Enforcement

Every AI request should include:

- User ID.
- Source ID.
- Source type.
- Document or book version.
- Academic level, where applicable.
- Subject, where applicable.
- Chapter or topic scope.

Retrieval and database queries must enforce these filters on the backend, not only through frontend selections.

Cache keys must include the relevant user, source, version, feature, and topic/chapter scope.

### Expected Behavior

If a student selects Biology Chapter 3, generated questions must come only from Biology Chapter 3.

If a student uploads a new PDF, the AI must not retrieve information from an older upload.

If the selected source contains insufficient information, show a clear message rather than using unrelated material.

---

# 10. UI/UX Requirements

### Design Direction

- Premium, modern educational platform.
- Dark blue primary theme.
- Clean layouts and readable typography.
- Consistent colors and spacing.
- Professional dashboard.
- Responsive design.
- Clear feature navigation.
- Minimal unnecessary steps.

### User Experience

- Simple document upload workflows.
- Visible selected-source information.
- Processing progress indicators.
- Clear success and failure messages.
- Helpful empty states.
- Download and export controls.
- Consistent behavior across features.

Do not add unnecessary selection steps to workflows that should operate automatically, especially AI Syllabus & Book Analyzer.

---

# 11. Security and Privacy Requirements

- Secure password handling.
- Authentication and authorization on protected endpoints.
- Server-side validation.
- Secure API key storage.
- Private document access controls.
- User-level database access policies.
- Secure file storage.
- Payment verification.
- Protection against unauthorized document access.
- Input sanitization and request validation.
- Rate limiting where appropriate.
- Safe error responses without exposing secrets.

---

# 12. API and Integration Requirements

- Use consistent API response structures.
- Validate all incoming requests.
- Keep feature APIs modular.
- Separate document-processing services from feature-specific business logic.
- Maintain backward compatibility when updating existing APIs.
- Avoid breaking unrelated features when fixing one feature.
- Add appropriate logging and error handling.
- Use Postman or equivalent API testing workflows.

External integrations such as Google Sheets, Cloudinary, n8n, and payment services must be treated as planned or optional until their actual implementation is verified.

---

# 13. Performance and Scalability

- Handle large documents efficiently within configured limits.
- Use asynchronous processing for time-consuming document analysis.
- Avoid duplicate AI requests.
- Optimize database queries.
- Use caching only with correct source and user isolation.
- Keep AI processing modular.
- Support future academic levels, subjects, and departments.
- Allow new AI features to be added without redesigning the entire backend.

---

# 14. Testing and Quality Assurance

Every feature must be tested independently and as part of the complete platform.

### Functional Testing

- Registration and login.
- User-specific dashboard statistics.
- PDF upload and extraction.
- Notes and summary generation.
- Revision sheet generation.
- Quiz generation.
- Mock test evaluation.
- Question analysis.
- Question prediction.
- Dependency graph rendering.
- Syllabus and book matching.
- Point transactions.
- Payment verification.

### Critical Source-Isolation Tests

Test at least two different PDFs with clearly different content.

Verify that:

- PDF A produces results only from PDF A.
- PDF B produces results only from PDF B.
- Selecting one chapter never returns another chapter's content.
- A new upload never receives stale content from an older upload.
- One user's private content is never accessible to another user.

### Regression Testing

After changing any feature, verify that unrelated features and shared APIs continue to work.

### Error Testing

Test:

- Empty uploads.
- Invalid PDFs.
- Corrupted files.
- Unsupported formats.
- Oversized files.
- Missing database resources.
- AI API failures.
- Network interruptions.
- Unauthorized access.
- Empty extraction results.

---

# 15. Current Known Implementation Context

The following is the latest known technical context from project discussions, not a verified inspection of the current repository or production database.

| Component | Known Status |
|---|---|
| Frontend | React + Vite direction |
| Backend | Node.js + Express + TypeScript |
| AI Provider | Gemini API connected/discussed |
| Database | Supabase considered; current connection needs verification |
| API Testing | Postman discussed |
| PDF Processing | Implemented/discussed, but several workflows need fixes |
| Payments | Requested; implementation unverified |
| Cloudinary | Discussed; implementation unverified |
| n8n | Discussed; implementation unverified |
| Google Sheets | Requested for login/user records; implementation unverified |

A previous backend startup attempt reported `EADDRINUSE` on port 4000. This indicates a port conflict and should be resolved by checking the existing process before starting another backend instance.

---

# 16. Development Priorities

## Priority 1 — Critical

- Fix Gemini API and AI feature failures.
- Fix complete PDF extraction and analysis.
- Implement strict source isolation.
- Fix quiz and mock-test question mixing.
- Fix Question Analysis data filtering.
- Fix AI Syllabus & Book Analyzer two-PDF workflow.
- Fix user-specific dashboard statistics.
- Verify authentication and database access rules.

## Priority 2 — High

- Improve AI Notes Generator.
- Improve Topic-wise Summary.
- Improve Revision Sheet Generator.
- Fix Content Dependency Graph visualization.
- Improve Question Prediction.
- Improve document processing reliability.
- Improve downloadable outputs.

## Priority 3 — Medium

- Premium subscription and payment implementation.
- Point-based AI usage management.
- Google Sheets integration, if required.
- Performance optimization.
- SEO improvements.
- Additional academic departments and resources.

---

# 17. Acceptance Criteria

Brain Nest will meet its core product requirements when:

1. Students can securely register and log in.
2. Every eligible new account receives exactly 500 starter points.
3. Academic resources are separated by academic level.
4. AI features work with the selected database source or uploaded document.
5. Uploaded PDFs are analyzed correctly.
6. Topic-wise summaries use extracted document topics.
7. Quizzes and mock tests never mix unrelated sources.
8. Question Analysis uses only available, selected question-bank data.
9. Question Prediction explains its historical evidence.
10. Content Dependency Graph displays valid prerequisite relationships.
11. AI Syllabus & Book Analyzer works using only two uploaded PDFs, without additional course selections.
12. Students can download supported learning outputs.
13. Dashboard statistics reflect only the authenticated user's real activity.
14. Private user data remains isolated.
15. Updating one feature does not break unrelated features or APIs.
16. The platform remains modular, maintainable, and extensible.

---

# 18. Future Scope

Potential future improvements include:

- More academic boards and universities.
- Additional departments such as BBA and Tourism.
- Multilingual learning support.
- AI-powered personalized study plans.
- Advanced student performance analytics.
- Voice-based learning assistance.
- More document formats.
- Collaborative learning resources.
- Advanced subscription plans.
- Mobile application support.

---

# 19. Final Product Vision

Brain Nest aims to become a comprehensive AI-powered learning and examination preparation platform.

Its core value is not simply generating AI text. It is understanding the student's selected academic materials, identifying relevant information, organizing knowledge, and generating reliable learning resources.

The platform must prioritize accuracy, source isolation, personalization, usability, security, and scalability.

**Core Principle: Every AI-generated result must be relevant to the student's selected academic source and learning objective.**

**End of Document — Brain Nest PRD Version 2.0**