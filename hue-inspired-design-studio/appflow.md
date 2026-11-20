React + Vite Frontend
        |
        v
Express + TypeScript API
        |
        v
Authentication & Authorization
        |
        v
Feature-specific Service
        |
        +------ Database / Supabase
        |
        +------ PDF Processing Service
        |          |
        |          v
        |      Text Extraction
        |      Chapter Detection
        |      Document Versioning
        |
        +------ Gemini AI Service
                   |
                   v
             Source Validation
                   |
                   v
             AI Processing
                   |
                   v
             Structured Result
                   |
                   v
          Save / Display / Download