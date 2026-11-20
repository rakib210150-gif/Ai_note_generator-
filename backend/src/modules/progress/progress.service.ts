import { supabaseAdmin } from "../../lib/supabase.js";

export interface DashboardOverview {
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
  distinctLoginDays?: number;
  totalLoginCount?: number;
  lastLogin?: string | null;
}

export interface FeatureActivityTracking {
  featureId: string;
  title: string;
  category: "Creation" | "Practice" | "Documents" | "Analytics";
  count: number;
  associatedPdfs: string[];
  lastUsedAt: string | null;
  route: string;
  iconName: string;
}

export interface LearningResourceItem {
  id: string;
  name: string;
  sizeBytes: number;
  fileType: string;
  createdAt: string;
  subject?: string;
  chapter?: string;
  usageCount: number;
  usedIn: string[];
}

export interface RecentActivityItem {
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
}

export interface DayActivity {
  day: string;
  date: string;
  count: number;
  notes: number;
  quizzes: number;
  summaries: number;
  analyses: number;
}

export interface SubjectMasteryItem {
  subject: string;
  notesCount: number;
  quizzesCount: number;
  analysesCount: number;
  totalActivities: number;
  masteryPercentage: number;
  chapters: string[];
}

export class ProgressService {
  /**
   * Aggregate complete personalized learning analytics directly from Supabase database
   */
  public async getDashboardAnalytics(userId: string) {
    // Parallel fetch from all Supabase user tables
    const [
      docsRes,
      notesRes,
      quizzesRes,
      attemptsRes,
      qAnalysesRes,
      revRes,
      txRes,
      profileRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("documents")
        .select("id, name, size_bytes, file_type, created_at, subject, chapter")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("notes")
        .select("id, title, subject, chapter, output_type, difficulty, document_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("quizzes")
        .select("id, title, subject, chapter, total_questions, difficulty, document_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("quiz_attempts")
        .select("id, quiz_id, score, total_questions, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
      supabaseAdmin
        .from("question_analyses")
        .select("id, subject, chapter, board_or_exam, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("revision_sheets")
        .select("id, title, subject, chapter, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("wallet_transactions")
        .select("id, action, type, amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, coins, created_at")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const docs = docsRes.data || [];
    const notes = notesRes.data || [];
    const quizzes = quizzesRes.data || [];
    const attempts = attemptsRes.data || [];
    const qAnalyses = qAnalysesRes.data || [];
    const revisions = revRes.data || [];
    const transactions = txRes.data || [];
    const profile = profileRes.data;

    // Document lookup map by ID
    const docMap = new Map<string, { id: string; name: string }>();
    docs.forEach((d) => {
      docMap.set(d.id, { id: d.id, name: d.name });
    });

    // Helper to find document name from action string or document_id
    const resolveDocName = (docId?: string | null, actionText?: string): string | null => {
      if (docId && docMap.has(docId)) {
        return docMap.get(docId)!.name;
      }
      if (actionText) {
        // Look for document names in parentheses like "(Physics pdf class 9-10 .pdf)"
        const match = actionText.match(/\(([^)]+\.(?:pdf|docx|txt|pptx))\)/i);
        if (match && match[1]) return match[1];
        // Match against known doc names
        for (const d of docs) {
          if (actionText.toLowerCase().includes(d.name.toLowerCase())) {
            return d.name;
          }
        }
      }
      return null;
    };

    // 1. Transaction-based activity counting
    let topicSummariesCount = 0;
    let bookAnalysesCount = 0;
    let tutorChatCount = 0;
    let graphCount = 0;

    const summaryPdfSet = new Set<string>();
    const bookAnalysesPdfSet = new Set<string>();
    const notesPdfSet = new Set<string>();
    const quizPdfSet = new Set<string>();
    const questionAnalysisPdfSet = new Set<string>();

    // Analyze notes and associate PDFs
    notes.forEach((n) => {
      if (n.document_id && docMap.has(n.document_id)) {
        notesPdfSet.add(docMap.get(n.document_id)!.name);
      }
    });

    // Analyze quizzes and associate PDFs
    quizzes.forEach((q) => {
      if (q.document_id && docMap.has(q.document_id)) {
        quizPdfSet.add(docMap.get(q.document_id)!.name);
      }
    });

    // Scan transactions for feature activities and associated PDFs
    transactions.forEach((tx) => {
      const act = (tx.action || "").trim();
      const lowerAct = act.toLowerCase();

      if (lowerAct.includes("summary")) {
        topicSummariesCount++;
        const docName = resolveDocName(undefined, act);
        if (docName) summaryPdfSet.add(docName);
      } else if (lowerAct.includes("syllabus & book") || lowerAct.includes("syllabus and book") || lowerAct.includes("exam prediction")) {
        bookAnalysesCount++;
        const docName = resolveDocName(undefined, act);
        if (docName) bookAnalysesPdfSet.add(docName);
      } else if (lowerAct.includes("tutor")) {
        tutorChatCount++;
      } else if (lowerAct.includes("graph") || lowerAct.includes("dependency")) {
        graphCount++;
      } else if (lowerAct.includes("note") || lowerAct.includes("notes")) {
        const docName = resolveDocName(undefined, act);
        if (docName) notesPdfSet.add(docName);
      } else if (lowerAct.includes("quiz") || lowerAct.includes("exam") || lowerAct.includes("mock test")) {
        const docName = resolveDocName(undefined, act);
        if (docName) quizPdfSet.add(docName);
      }
    });

    const summaryNotesCount = notes.filter((n) => n.output_type === "summary").length;
    const regularNotesCount = notes.filter((n) => n.output_type !== "summary").length;

    // Overview statistics
    const totalPdfsUploaded = docs.length;
    const totalNotesGenerated = Math.max(regularNotesCount, transactions.filter((t) => (t.action || "").toLowerCase().includes("note")).length);
    const totalQuizzes = Math.max(quizzes.length, transactions.filter((t) => (t.action || "").toLowerCase().includes("quiz")).length);
    const totalMockTests = attempts.length;
    const totalQuestionAnalyses = Math.max(qAnalyses.length, transactions.filter((t) => {
      const a = (t.action || "").toLowerCase();
      return a.includes("question analysis") || a.includes("exam prediction");
    }).length);
    const totalTopicSummaries = Math.max(summaryNotesCount, topicSummariesCount);
    const totalRevisionSheets = Math.max(revisions.length, transactions.filter((t) => (t.action || "").toLowerCase().includes("revision")).length);
    const totalBookAnalyses = bookAnalysesCount;
    const totalTutorInteractions = tutorChatCount;

    const totalActivities =
      totalPdfsUploaded +
      totalNotesGenerated +
      totalQuizzes +
      totalMockTests +
      totalQuestionAnalyses +
      totalTopicSummaries +
      totalRevisionSheets +
      totalBookAnalyses +
      totalTutorInteractions +
      graphCount;

    // Retrieve metadata for user login history and streak
    const { data: authUserObj } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userMeta = authUserObj?.user?.user_metadata || {};
    const totalLoginCount = Number(userMeta.login_count || 1);
    const distinctLoginDays = Number(userMeta.distinct_login_days || (userMeta.login_dates?.length || 1));
    const lastLogin = userMeta.last_login || userMeta.registration_date || profile?.created_at || null;

    // Study streak calculation strictly from real user activity dates
    const activityDates = new Set<string>();
    [...docs, ...notes, ...quizzes, ...qAnalyses, ...revisions, ...transactions].forEach((item: any) => {
      const d = item.created_at || item.completed_at;
      if (d) {
        activityDates.add(new Date(d).toISOString().split("T")[0]!);
      }
    });

    let streakDays = 0;
    if (activityDates.size > 0) {
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const check = new Date(today);
        check.setDate(today.getDate() - i);
        const isoDate = check.toISOString().split("T")[0]!;
        if (activityDates.has(isoDate)) {
          streakDays++;
        } else if (i > 0) {
          break;
        }
      }
    }

    const overview: DashboardOverview = {
      totalPdfsUploaded,
      totalNotesGenerated,
      totalQuizzes,
      totalMockTests,
      totalQuestionAnalyses,
      totalTopicSummaries,
      totalRevisionSheets,
      totalBookAnalyses,
      totalTutorInteractions,
      totalActivities,
      coinsBalance: profile?.coins ?? 500,
      studyStreakDays: streakDays,
      distinctLoginDays,
      totalLoginCount,
      lastLogin,
    };

    // 2. Feature-wise Activity Tracking Breakdown
    const featureUsage: FeatureActivityTracking[] = [
      {
        featureId: "notes",
        title: "AI Note Generator",
        category: "Creation",
        count: totalNotesGenerated,
        associatedPdfs: Array.from(notesPdfSet),
        lastUsedAt: notes[0]?.created_at || null,
        route: "/dashboard/notes",
        iconName: "NotebookPen",
      },
      {
        featureId: "summaries",
        title: "Topic-Wise Summaries",
        category: "Creation",
        count: totalTopicSummaries,
        associatedPdfs: Array.from(summaryPdfSet),
        lastUsedAt: transactions.find((t) => t.action?.includes("AI Topic Summary"))?.created_at || null,
        route: "/dashboard/summaries",
        iconName: "ScrollText",
      },
      {
        featureId: "question-analysis",
        title: "AI Question Analysis",
        category: "Creation",
        count: totalQuestionAnalyses,
        associatedPdfs: Array.from(questionAnalysisPdfSet),
        lastUsedAt: qAnalyses[0]?.created_at || null,
        route: "/dashboard/question-analysis",
        iconName: "Brain",
      },
      {
        featureId: "prediction",
        title: "AI Syllabus & Book Analyzer",
        category: "Creation",
        count: totalBookAnalyses,
        associatedPdfs: Array.from(bookAnalysesPdfSet),
        lastUsedAt: transactions.find((t) => t.action?.includes("AI Syllabus & Book Analysis"))?.created_at || null,
        route: "/dashboard/prediction",
        iconName: "BookOpenCheck",
      },
      {
        featureId: "quizzes",
        title: "Quiz & Mock Test Generator",
        category: "Practice",
        count: totalQuizzes,
        associatedPdfs: Array.from(quizPdfSet),
        lastUsedAt: quizzes[0]?.created_at || null,
        route: "/dashboard/quiz",
        iconName: "Target",
      },
      {
        featureId: "revision",
        title: "Quick Revision Sheets",
        category: "Practice",
        count: totalRevisionSheets,
        associatedPdfs: [],
        lastUsedAt: revisions[0]?.created_at || null,
        route: "/dashboard/revision",
        iconName: "Zap",
      },
      {
        featureId: "tutor",
        title: "AI Study Tutor",
        category: "Practice",
        count: totalTutorInteractions,
        associatedPdfs: [],
        lastUsedAt: transactions.find((t) => t.action?.includes("AI Tutor Chat"))?.created_at || null,
        route: "/dashboard/tutor",
        iconName: "Bot",
      },
      {
        featureId: "upload",
        title: "PDF & Document Upload",
        category: "Documents",
        count: totalPdfsUploaded,
        associatedPdfs: docs.slice(0, 5).map((d) => d.name),
        lastUsedAt: docs[0]?.created_at || null,
        route: "/dashboard/upload",
        iconName: "FileUp",
      },
      {
        featureId: "editor",
        title: "Real-Time Document Editor",
        category: "Documents",
        count: totalActivities > 0 ? (totalNotesGenerated + totalPdfsUploaded) : 0,
        associatedPdfs: docs.slice(0, 3).map((d) => d.name),
        lastUsedAt: docs[0]?.created_at || null,
        route: "/dashboard/editor",
        iconName: "FileEdit",
      },
      {
        featureId: "syllabus",
        title: "Syllabus-Based Learning",
        category: "Documents",
        count: 0,
        associatedPdfs: [],
        lastUsedAt: null,
        route: "/dashboard/syllabus",
        iconName: "ListChecks",
      },
      {
        featureId: "graph",
        title: "Content Dependency Graph",
        category: "Analytics",
        count: graphCount,
        associatedPdfs: [],
        lastUsedAt: transactions.find((t) => t.action?.includes("Dependency Graph"))?.created_at || null,
        route: "/dashboard/graph",
        iconName: "GitBranch",
      },
      {
        featureId: "progress",
        title: "Learning Progress Tracking",
        category: "Analytics",
        count: totalActivities,
        associatedPdfs: [],
        lastUsedAt: new Date().toISOString(),
        route: "/dashboard/progress",
        iconName: "BarChart3",
      },
    ];

    // 3. My Learning Resources (with per-file usage count and features used)
    const learningResources: LearningResourceItem[] = docs.map((d) => {
      let usageCount = 0;
      const usedIn: string[] = [];

      // Notes usage
      const matchedNotes = notes.filter((n) => n.document_id === d.id || n.title?.toLowerCase().includes(d.name.toLowerCase()));
      if (matchedNotes.length > 0) {
        usageCount += matchedNotes.length;
        usedIn.push(`AI Notes (${matchedNotes.length})`);
      }

      // Quizzes usage
      const matchedQuizzes = quizzes.filter((q) => q.document_id === d.id || q.title?.toLowerCase().includes(d.name.toLowerCase()));
      if (matchedQuizzes.length > 0) {
        usageCount += matchedQuizzes.length;
        usedIn.push(`Quizzes (${matchedQuizzes.length})`);
      }

      // Check transactions mentioning this doc
      const matchedTx = transactions.filter((t) => t.action?.toLowerCase().includes(d.name.toLowerCase()));
      if (matchedTx.length > 0) {
        const hasSummary = matchedTx.some((t) => t.action?.includes("Summary"));
        const hasPrediction = matchedTx.some((t) => t.action?.includes("Analysis") || t.action?.includes("Prediction"));
        if (hasSummary && !usedIn.some((u) => u.startsWith("Summaries"))) {
          usedIn.push("Summaries");
          usageCount++;
        }
        if (hasPrediction && !usedIn.some((u) => u.startsWith("Analysis"))) {
          usedIn.push("Analysis");
          usageCount++;
        }
      }

      if (usedIn.length === 0) {
        usedIn.push("Ready for AI generation");
      }

      return {
        id: d.id,
        name: d.name,
        sizeBytes: d.size_bytes || 0,
        fileType: d.file_type || "application/pdf",
        createdAt: d.created_at,
        subject: d.subject || "General",
        chapter: d.chapter || "Full Document",
        usageCount,
        usedIn,
      };
    });

    // 4. Unified Recent Activity Timeline
    const timelineItems: RecentActivityItem[] = [];

    // Add notes and summaries to timeline
    notes.forEach((n) => {
      const docName = resolveDocName(n.document_id);
      const isSummary = n.output_type === "summary";
      timelineItems.push({
        id: `note-${n.id}`,
        featureId: isSummary ? "summaries" : "notes",
        featureTitle: isSummary ? "Topic-Wise Summary" : "AI Note Generator",
        actionType: isSummary ? "Generated Summary" : "Generated Notes",
        title: n.title,
        documentName: docName,
        documentId: n.document_id,
        details: `${n.subject || "Academic"} · ${n.chapter || "Study Notes"} (${(n.output_type || "Detailed").toUpperCase()})`,
        timestamp: n.created_at,
        route: isSummary ? "/dashboard/summaries" : "/dashboard/notes",
      });
    });

    // Add quizzes to timeline
    quizzes.forEach((q) => {
      const docName = resolveDocName(q.document_id);
      timelineItems.push({
        id: `quiz-${q.id}`,
        featureId: "quizzes",
        featureTitle: "Quiz & Mock Test",
        actionType: "Generated Quiz",
        title: q.title,
        documentName: docName,
        documentId: q.document_id,
        details: `${q.subject || "Subject"} · ${q.total_questions || 10} Questions · ${q.difficulty || "Mixed"}`,
        timestamp: q.created_at,
        route: "/dashboard/quiz",
      });
    });

    // Add question analyses to timeline
    qAnalyses.forEach((qa) => {
      timelineItems.push({
        id: `qa-${qa.id}`,
        featureId: "question-analysis",
        featureTitle: "AI Question Analysis",
        actionType: "Exam Question Analysis",
        title: `${qa.subject} Exam Analysis`,
        documentName: null,
        documentId: null,
        details: `${qa.subject} · ${qa.chapter || "All Chapters"} · ${qa.board_or_exam || "Board Exam"}`,
        timestamp: qa.created_at,
        route: "/dashboard/question-analysis",
      });
    });

    // Add transaction actions to timeline (Summaries, Book Analyzer, etc.)
    transactions.forEach((tx) => {
      const act = tx.action || "";
      const lowerAct = act.toLowerCase();
      if (lowerAct.includes("summary")) {
        const topicPart = act.replace(/^AI Topic Summary:\s*|^Topic Summary:\s*/i, "").trim();
        const docName = resolveDocName(undefined, act);
        // Avoid duplicate if already covered by notes row
        const alreadyInTimeline = timelineItems.some((it) => it.featureId === "summaries" && it.title?.toLowerCase() === topicPart.toLowerCase());
        if (!alreadyInTimeline) {
          timelineItems.push({
            id: `tx-${tx.id}`,
            featureId: "summaries",
            featureTitle: "Topic-Wise Summary",
            actionType: "Generated Summary",
            title: topicPart || "Topic Summary",
            documentName: docName,
            documentId: null,
            details: `Short High-Retention Summary · 5 Coins`,
            timestamp: tx.created_at,
            route: "/dashboard/summaries",
          });
        }
      } else if (lowerAct.includes("syllabus & book") || lowerAct.includes("syllabus and book") || lowerAct.includes("exam prediction")) {
        const cleanTitle = act.split(":")[1]?.trim() || "Course Syllabus & Book Analysis";
        const docName = resolveDocName(undefined, act);
        timelineItems.push({
          id: `tx-${tx.id}`,
          featureId: "prediction",
          featureTitle: "Syllabus & Book Analyzer",
          actionType: "Matched Syllabus & Book",
          title: cleanTitle,
          documentName: docName,
          documentId: null,
          details: `Cross-Document Chapter Matching & Study Guide`,
          timestamp: tx.created_at,
          route: "/dashboard/prediction",
        });
      }
    });

    // Add uploaded documents to timeline
    docs.slice(0, 10).forEach((d) => {
      timelineItems.push({
        id: `doc-${d.id}`,
        featureId: "upload",
        featureTitle: "Document Upload",
        actionType: "Uploaded Document",
        title: d.name,
        documentName: d.name,
        documentId: d.id,
        details: `${(d.size_bytes / (1024 * 1024)).toFixed(1)} MB · Ready for AI study analysis`,
        timestamp: d.created_at,
        route: "/dashboard/upload",
      });
    });

    // Sort timeline strictly descending by timestamp
    timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Deduplicate any duplicate entries
    const seenTimelineIds = new Set<string>();
    const recentActivities = timelineItems.filter((item) => {
      if (seenTimelineIds.has(item.id)) return false;
      seenTimelineIds.add(item.id);
      return true;
    }).slice(0, 20);

    // 5. Interactive Analytics & Trends: Weekly activity breakdown
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyMap = new Map<string, DayActivity>();
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoKey = d.toISOString().split("T")[0]!;
      const dayName = dayNames[d.getDay()]!;
      const monthName = d.toLocaleString("en-US", { month: "short" });
      const displayDate = `${monthName} ${d.getDate()}`;

      weeklyMap.set(isoKey, {
        day: dayName,
        date: displayDate,
        count: 0,
        notes: 0,
        quizzes: 0,
        summaries: 0,
        analyses: 0,
      });
    }

    // Populate daily counts from timeline items
    timelineItems.forEach((item) => {
      const dateKey = new Date(item.timestamp).toISOString().split("T")[0];
      if (dateKey && weeklyMap.has(dateKey)) {
        const entry = weeklyMap.get(dateKey)!;
        entry.count++;
        if (item.featureId === "notes") entry.notes++;
        else if (item.featureId === "quizzes") entry.quizzes++;
        else if (item.featureId === "summaries") entry.summaries++;
        else if (item.featureId === "question-analysis" || item.featureId === "prediction") entry.analyses++;
      }
    });

    const weeklyActivity = Array.from(weeklyMap.values());

    // 6. Subject Mastery & Chapters Coverage
    const subjectMap = new Map<string, { notesCount: number; quizzesCount: number; analysesCount: number; chapters: Set<string> }>();

    notes.forEach((n) => {
      const sub = n.subject || "General Studies";
      if (!subjectMap.has(sub)) {
        subjectMap.set(sub, { notesCount: 0, quizzesCount: 0, analysesCount: 0, chapters: new Set() });
      }
      const entry = subjectMap.get(sub)!;
      entry.notesCount++;
      if (n.chapter) entry.chapters.add(n.chapter);
    });

    quizzes.forEach((q) => {
      const sub = q.subject || "General Studies";
      if (!subjectMap.has(sub)) {
        subjectMap.set(sub, { notesCount: 0, quizzesCount: 0, analysesCount: 0, chapters: new Set() });
      }
      const entry = subjectMap.get(sub)!;
      entry.quizzesCount++;
      if (q.chapter) entry.chapters.add(q.chapter);
    });

    qAnalyses.forEach((qa) => {
      const sub = qa.subject || "General Studies";
      if (!subjectMap.has(sub)) {
        subjectMap.set(sub, { notesCount: 0, quizzesCount: 0, analysesCount: 0, chapters: new Set() });
      }
      const entry = subjectMap.get(sub)!;
      entry.analysesCount++;
      if (qa.chapter) entry.chapters.add(qa.chapter);
    });

    const subjectMastery: SubjectMasteryItem[] = Array.from(subjectMap.entries()).map(([subject, data]) => {
      const totalActivitiesForSubject = data.notesCount + data.quizzesCount + data.analysesCount;
      const basePercentage = Math.min(100, Math.max(10, totalActivitiesForSubject * 15 + data.chapters.size * 10));
      return {
        subject,
        notesCount: data.notesCount,
        quizzesCount: data.quizzesCount,
        analysesCount: data.analysesCount,
        totalActivities: totalActivitiesForSubject,
        masteryPercentage: basePercentage,
        chapters: Array.from(data.chapters).slice(0, 5),
      };
    });

    // Sort subjects by total activity
    subjectMastery.sort((a, b) => b.totalActivities - a.totalActivities);

    // Quiz Accuracy Performance - strictly calculated from user's actual attempts
    const totalAttemptedScore = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const totalAttemptedQuestions = attempts.reduce((acc, a) => acc + (a.total_questions || 0), 0);
    const averageScore = totalAttemptedQuestions > 0 ? Math.round((totalAttemptedScore / totalAttemptedQuestions) * 100) : 0;
    const passRate = attempts.length > 0
      ? Math.round((attempts.filter(a => ((a.score || 0) / (a.total_questions || 1)) >= 0.7).length / attempts.length) * 100)
      : 0;

    return {
      overview,
      featureUsage,
      learningResources,
      recentActivities,
      analytics: {
        weeklyActivity,
        subjectMastery,
        quizPerformance: {
          totalQuizzes: overview.totalQuizzes,
          totalMockTests: overview.totalMockTests,
          averageScore,
          passRate,
          totalQuestionsAnswered: totalAttemptedQuestions,
        },
      },
    };
  }
}

export const progressService = new ProgressService();
