/**
 * Brain Nest Unified API Client
 * Seamlessly connects React/TanStack frontend to Express + Supabase backend.
 * Features:
 * - Centralized API Base URL configuration supporting VITE_API_BASE_URL and VITE_API_URL
 * - Automatic URL normalization (strips trailing slashes and prevents duplicate /api/v1)
 * - Automatic Bearer token attachment from Supabase Auth session
 * - Graceful fallback to client-side store when backend is offline or unconfigured
 */

// Centralized API Base URL resolution:
// 1. Checks VITE_API_BASE_URL (standardized across Vite and Vercel)
// 2. Checks VITE_API_URL (backward compatibility)
// 3. Defaults to live Render production backend in production builds
// 4. Defaults to local Express server (port 4000) during local development
const getEnvBase = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL as string;
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
    if (import.meta.env.PROD) return "https://ai-note-generator-06jh.onrender.com";
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL;
    if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
    if (process.env.NODE_ENV === "production") return "https://ai-note-generator-06jh.onrender.com";
  }
  return "http://localhost:4000";
};

// Normalize to ensure trailing slash is stripped and /api/v1 version prefix is present without duplicates
const rawApiBase = getEnvBase().trim();
const cleanApiBase = rawApiBase.replace(/\/+$/, "");
export const API_BASE = cleanApiBase.endsWith("/api/v1")
  ? cleanApiBase
  : cleanApiBase.endsWith("/api")
  ? `${cleanApiBase}/v1`
  : `${cleanApiBase}/api/v1`;

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

export interface GeneratedNoteData {
  id: string;
  title: string;
  content: string;
  coinsRemaining?: number;
  subject?: string;
  chapter?: string;
  difficulty?: string;
  output_type?: string;
  language?: string;
  coin_cost?: number;
  [key: string]: any;
}

export interface GeneratedQuizData {
  id: string;
  title: string;
  questions: Array<{
    id?: string;
    question: string;
    options: string[];
    correctIndex?: number;
    correct_index?: number;
    explanation?: string;
    [key: string]: any;
  }>;
  total_questions?: number;
  coinsRemaining?: number;
  [key: string]: any;
}

export interface GeneratedRevisionData {
  id: string;
  title: string;
  key_points?: string[];
  keyPoints?: string[];
  formulas?: string[];
  memory_aids?: string[];
  memoryAids?: string[];
  quick_questions?: string[];
  quickQuestions?: string[];
  coinsRemaining?: number;
  [key: string]: any;
}

export interface TutorReplyData {
  conversationId: string;
  userMessage: string;
  tutorReply: string;
  messageId: string;
  coinsRemaining?: number;
  [key: string]: any;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("bn_auth_token");
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("bn_auth_token", token);
      } else {
        localStorage.removeItem("bn_auth_token");
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    let token = this.token || (typeof window !== "undefined" ? localStorage.getItem("bn_auth_token") : null);
    let userId: string | null = null;

    if (typeof window !== "undefined") {
      try {
        const rawUser = localStorage.getItem("bn_user");
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u?.id && u.id !== "guest") {
            userId = u.id;
            if (!token) {
              token = u.id;
            }
          }
        }
      } catch {}
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-auth-token"] = token;
    }
    if (userId) {
      headers["x-user-id"] = userId;
    }

    try {
      const response = await fetch(url, {
        credentials: "include",
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        return json as ApiResponse<T>;
      }

      // Handle non-JSON or HTML response (e.g. proxy/gateway 502/503 during cold boots)
      const text = await response.text();
      if (!response.ok) {
        return {
          success: false,
          message: text || `Backend returned status ${response.status} (${response.statusText})`,
          error: { code: `HTTP_${response.status}`, details: text },
        };
      }

      return {
        success: true,
        message: "Success",
        data: text as unknown as T,
      };
    } catch (networkError: any) {
      return {
        success: false,
        message: networkError?.message || "Failed to connect to Brain Nest backend",
        error: { code: "NETWORK_ERROR", details: networkError },
      };
    }
  }

  // Health check
  public async getHealth() {
    return this.request<any>("/health");
  }

  // Auth endpoints
  public async login(email: string, password: string) {
    const res = await this.request<{ session: { access_token: string }; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data?.session?.access_token) {
      this.setToken(res.data.session.access_token);
    }
    return res;
  }

  public async signup(
    email: string,
    password: string,
    fullName: string,
    mobileNumber: string,
    country: string,
    classLevel?: string
  ) {
    const res = await this.request<{ session: { access_token: string }; user: any }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName, mobileNumber, country, classLevel }),
    });
    if (res.success && res.data?.session?.access_token) {
      this.setToken(res.data.session.access_token);
    }
    return res;
  }

  public async getMe() {
    return this.request<any>("/auth/me");
  }

  public async updateClassLevel(classLevel: string) {
    return this.request<any>("/auth/class-level", {
      method: "PUT",
      body: JSON.stringify({ classLevel }),
    });
  }

  public logout() {
    this.setToken(null);
  }

  // Document endpoints
  public async analyzeDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<any>("/documents/analyze", {
      method: "POST",
      body: formData,
    });
  }

  public async uploadDocument(file: File, subject?: string | undefined, chapter?: string | undefined) {
    const formData = new FormData();
    formData.append("file", file);
    if (subject) formData.append("subject", subject);
    if (chapter) formData.append("chapter", chapter);

    return this.request<any>("/documents", {
      method: "POST",
      body: formData,
    });
  }

  public async getAcademicResources(classLevel?: string) {
    const qs = classLevel ? `?classLevel=${encodeURIComponent(classLevel)}` : "";
    return this.request<Array<{ target_class: string; className: string; subjects: Array<{ name: string; docId: string; docName: string; totalChapters: number }> }>>(`/documents/academic-resources${qs}`);
  }

  public async getDocuments() {
    return this.request<any[]>("/documents");
  }

  public async getDocument(id: string) {
    return this.request<any>(`/documents/${id}`);
  }

  public async deleteDocument(id: string) {
    return this.request<any>(`/documents/${id}`, { method: "DELETE" });
  }

  // Notes endpoints
  public async generateNotes(payload: {
    subject: string;
    chapter: string;
    fileId?: string | undefined;
    difficulty?: string | undefined;
    outputType?: string | undefined;
    language?: string | undefined;
    customPrompt?: string | undefined;
    sourceText?: string | undefined;
  }) {
    return this.request<GeneratedNoteData>("/notes/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Topic Summary endpoint
  public async generateTopicSummary(payload: {
    subject?: string | undefined;
    chapter?: string | undefined;
    topic?: string | undefined;
    customTopic?: string | undefined;
    difficulty?: "easy" | "medium" | "hard" | undefined;
    depth?: "quick" | "high-yield" | "comprehensive" | undefined;
    language?: "english" | "bangla" | "both" | undefined;
    sourceText?: string | undefined;
    pageRange?: string | undefined;
    fileId?: string | undefined;
    documentName?: string | undefined;
  }) {
    return this.request<any>("/notes/summary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getNotes() {
    return this.request<any[]>("/notes");
  }

  public async deleteNote(id: string) {
    return this.request<any>(`/notes/${id}`, { method: "DELETE" });
  }

  // Quiz endpoints
  public async generateQuiz(payload: {
    subject: string;
    chapter: string;
    fileId?: string | undefined;
    questionCount?: number | undefined;
    difficulty?: string | undefined;
    noteId?: string | undefined;
    contextText?: string | undefined;
    selectedChapters?: string[] | undefined;
    classLevel?: string | undefined;
  }) {
    return this.request<GeneratedQuizData>("/quizzes/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async submitQuizAttempt(quizId: string, answers: Record<string, number>) {
    return this.request<any>(`/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  }

  // Tutor endpoints
  public async sendTutorMessage(payload: {
    message: string;
    conversationId?: string | undefined;
    subject?: string | undefined;
    fileId?: string | undefined;
  }) {
    return this.request<TutorReplyData>("/tutor/message", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Question Papers & Prediction endpoints
  public async analyzePapers(payload: {
    subject: string;
    chapter: string;
    boardOrExam?: string | undefined;
    yearsCovered?: string | undefined;
    sampleQuestionsText: string;
  }) {
    return this.request<any>("/question-papers/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Revision endpoints
  public async generateRevisionSheet(payload: {
    subject: string;
    chapter: string;
    fileId?: string | undefined;
    contextText?: string | undefined;
  }) {
    return this.request<GeneratedRevisionData>("/revision/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Question Paper Analysis & Prediction endpoints (25 coins)
  public async analyzeQuestionPapers(payload: {
    subject: string;
    chapter: string;
    boardOrExam?: string | undefined;
    yearsCovered?: string | undefined;
    sampleQuestionsText: string;
  }) {
    return this.request<any>("/question-papers/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async predictExamQuestions(payload: {
    institution?: string | undefined;
    academicLevel?: string | undefined;
    department?: string | undefined;
    faculty?: string | undefined;
    subject: string;
    academicYear?: string | undefined;
    semester?: string | undefined;
    course?: string | undefined;
    chapter: string;
    topic?: string | undefined;
    pastYears?: string[] | undefined;
    targetPredictionYear?: string | undefined;
    contentType?: string | undefined;
    difficulty?: string | undefined;
    marks?: number | undefined;
    language?: string | undefined;
    sourcePreference?: string | undefined;
    pastQuestionsText?: string | undefined;
    syllabusText?: string | undefined;
    referenceBookText?: string | undefined;
  }) {
    return this.request<any>("/question-papers/predict", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Wallet endpoints
  public async getWalletBalance() {
    return this.request<{ coins: number }>("/wallet");
  }

  public async claimDailyBonus() {
    return this.request<{ claimed: boolean; message: string; newBalance?: number }>("/wallet/daily-bonus", {
      method: "POST",
    });
  }

  public async topUpWallet(amount: number, packageName: string) {
    return this.request<any>("/wallet/topup", {
      method: "POST",
      body: JSON.stringify({ amount, packageName }),
    });
  }

  public async deductCoins(amount: number, action: string = "download") {
    return this.request<{ success: boolean; newBalance: number }>("/wallet/deduct", {
      method: "POST",
      body: JSON.stringify({ amount, action }),
    });
  }

  // Graph endpoints
  public async getGraphData(subject: string) {
    return this.request<any>(`/graph?subject=${encodeURIComponent(subject)}`);
  }

  public async getGraphPresets() {
    return this.request<any[]>("/graph/presets");
  }

  public async generateDependencyGraph(payload: {
    targetTopic: string;
    learningGoal?: string | undefined;
    academicLevel?: "beginner" | "intermediate" | "advanced" | "expert" | undefined;
    subject?: string | undefined;
    fileId?: string | undefined;
    sourceText?: string | undefined;
  }) {
    return this.request<any>("/graph/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async updateGraphNodeStatus(graphId: string, nodeId: string, status: "mastered" | "learning" | "ready" | "locked") {
    return this.request<any>(`/graph/${graphId}/node-status`, {
      method: "PATCH",
      body: JSON.stringify({ nodeId, status }),
    });
  }

  public async getGraphById(graphId: string) {
    return this.request<any>(`/graph/${graphId}`);
  }

  // Progress endpoints
  public async getProgress() {
    return this.request<any>("/progress");
  }

  // AI Question Analysis endpoints
  public async analyzeQuestionsWithAI(payload: {
    educationLevel: string;
    department?: string | undefined;
    semester?: string | undefined;
    subject: string;
    questions?: string[] | undefined;
    documentText?: string | undefined;
    documents?: Array<{ name: string; text: string; year?: string | undefined }> | undefined;
    requestedCount: number;
  }) {
    return this.request<any>("/question-analysis/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // AI Syllabus & Book Analyzer endpoint
  public async analyzeSyllabusAndBook(payload: {
    courseTitle?: string | undefined;
    educationLevel?: string | undefined;
    referenceBookName: string;
    syllabusName: string;
    referenceBookText: string;
    syllabusText: string;
  }) {
    return this.request<any>("/question-papers/analyze-syllabus-book", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getDashboardAnalytics() {
    return this.request<{
      overview: {
        totalPdfsUploaded: number;
        totalNotesGenerated: number;
        totalQuizzes: number;
        totalMockTests: number;
        totalQuestionAnalyses: number;
        totalTopicSummaries: number;
        totalRevisionSheets: number;
        totalBookAnalyses: number;
        totalTutorInteractions: number;
        totalActivities: number;
        coinsBalance: number;
        studyStreakDays: number;
      };
      featureUsage: Array<{
        featureId: string;
        title: string;
        category: "Creation" | "Practice" | "Documents" | "Analytics";
        count: number;
        associatedPdfs: string[];
        lastUsedAt: string | null;
        route: string;
        iconName: string;
      }>;
      learningResources: Array<{
        id: string;
        name: string;
        sizeBytes: number;
        fileType: string;
        createdAt: string;
        subject?: string;
        chapter?: string;
        usageCount: number;
        usedIn: string[];
      }>;
      recentActivities: Array<{
        id: string;
        featureId: string;
        featureTitle: string;
        actionType: string;
        title: string;
        documentName: string | null;
        documentId: string | null;
        details: string;
        timestamp: string;
        route: string;
      }>;
      analytics: {
        weeklyActivity: Array<{
          day: string;
          date: string;
          count: number;
          notes: number;
          quizzes: number;
          summaries: number;
          analyses: number;
        }>;
        subjectMastery: Array<{
          subject: string;
          notesCount: number;
          quizzesCount: number;
          analysesCount: number;
          totalActivities: number;
          masteryPercentage: number;
          chapters: string[];
        }>;
        quizPerformance: {
          totalQuizzes: number;
          totalMockTests: number;
          averageScore: number;
          passRate: number;
          totalQuestionsAnswered: number;
        };
      };
    }>("/progress/dashboard-analytics");
  }

  public async getQuestionBank(params?: {
    level?: string;
    department?: string;
    semester?: string;
    subject?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.level) query.set("level", params.level);
    if (params?.department) query.set("department", params.department);
    if (params?.semester) query.set("semester", params.semester);
    if (params?.subject) query.set("subject", params.subject);
    const qs = query.toString();
    return this.request<any>(`/question-analysis/bank${qs ? `?${qs}` : ""}`);
  }
}

export const api = new ApiClient();
