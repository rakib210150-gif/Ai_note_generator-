import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getQuizzes, addQuiz, updateQuizScore, deleteQuiz, getUser, updateCoins,
  getSelectedClass, setSelectedClass, CLASS_9_10_CHAPTERS,
  type Quiz, type QuizQuestion
} from "@/lib/store";
import {
  DATABASE_CURRICULUM,
  hasClassDatabaseBooks,
  getDatabaseSubjectsForClass,
  getDatabaseChaptersForSubject
} from "@/lib/curriculum";
import { generateQuiz as generateOfflineQuiz } from "@/lib/ai-engine";
import { toast } from "sonner";
import {
  Target, Sparkles, CheckCircle2, XCircle, RotateCcw,
  Trophy, Award, HelpCircle, ArrowRight, Trash2, BookOpen,
  Upload, FileText, Check, AlertCircle, RefreshCw, GraduationCap,
  Bookmark, X, Search, Clock, BarChart2, ListChecks, CheckSquare,
  Square, Eye, Sliders, ChevronRight, Layers, AlertTriangle
} from "lucide-react";

export const Route = createFileRoute("/dashboard/quiz")({
  head: () => ({
    meta: [
      { title: "Adaptive AI Quizzes & Mock Test — Brain Nest" },
      { name: "description", content: "Upload PDF documents or choose from Class 9-10 & 11-12 to generate real 10, 50, or 100 mark exams with automatic scoring and detailed explanations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuizPage,
});

// ─── Interfaces ──────────────────────────────────────────────
export interface AnalyzedChapter {
  id: string;
  chapterNumber: string;
  title: string;
  startPage: number;
  endPage: number;
  pageRange: string;
  subtopics: string[];
  snippet: string;
  charCount: number;
}

export interface UploadedDocAnalysis {
  id?: string;
  name: string;
  size: string;
  fileType?: string;
  pageCount: number;
  isScanned: boolean;
  ocrApplied: boolean;
  language: "english" | "bangla" | "mixed";
  charCount: number;
  wordCount: number;
  hasReadableText: boolean;
  chapters: AnalyzedChapter[];
  allDetectedTopics: string[];
  extractedText: string;
  pages?: Array<{ pageNumber: number; text: string; charCount: number }>;
}

function QuizPage() {
  const user = getUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Two Independent Modes: "database" vs "pdf" ─────────────
  const [examMode, setExamMode] = useState<"database" | "pdf">("database");

  // ─── Database Mode State ─────────────────────────────────────
  const [selectedClass, setSelectedClassState] = useState<"9-10" | "11-12">(() => {
    const cls = getSelectedClass();
    return cls === "11-12" ? "11-12" : "9-10";
  });
  // Strictly Class 9-10 has Physics & Biology database textbooks preloaded
  const availableSubjects = selectedClass === "9-10" ? ["Physics", "Biology"] : [];
  const [dbSubject, setDbSubject] = useState<string>("Physics");
  const availableChapters = selectedClass === "9-10" && dbSubject ? (DATABASE_CURRICULUM["9-10"][dbSubject] || []) : [];
  // "all" means entire syllabus of this subject, or chapter name
  const [dbChapter, setDbChapter] = useState<string>("all");

  // Sync external class change events across navigation
  useEffect(() => {
    const onClassChange = (e: any) => {
      const cls = e.detail?.classLevel;
      if (cls && (cls === "9-10" || cls === "11-12") && cls !== selectedClass) {
        setSelectedClassState(cls);
      }
    };
    window.addEventListener("bn_class_changed", onClassChange);
    return () => window.removeEventListener("bn_class_changed", onClassChange);
  }, [selectedClass]);

  // ─── PDF Mode State ──────────────────────────────────────────
  const [uploadedPdf, setUploadedPdf] = useState<UploadedDocAnalysis | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadStatus, setPdfUploadStatus] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfSubject, setPdfSubject] = useState("");
  // Selection: "all" for Entire PDF, or set of chapter IDs
  const [selectEntirePdf, setSelectEntirePdf] = useState(true);
  const [selectedPdfChapterIds, setSelectedPdfChapterIds] = useState<Set<string>>(new Set());
  const [pdfChapterSearch, setPdfChapterSearch] = useState("");

  // ─── Shared Exam Settings ────────────────────────────────────
  const [questionCount, setQuestionCount] = useState<number>(10); // 10, 50, 100
  const [difficulty, setDifficulty] = useState<"mixed" | "easy" | "medium" | "hard">("mixed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ─── Quiz Player State ───────────────────────────────────────
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => getQuizzes());
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [practiceMode, setPracticeMode] = useState(false); // Practice (instant reveal) vs Real Exam
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<"all" | "incorrect" | "correct">("all");
  const [showPalette, setShowPalette] = useState(false);

  // Coin cost based on marks: 10 Marks = 15 coins, 50 Marks = 25 coins, 100 Marks = 35 coins
  const coinCost = questionCount === 10 ? 15 : questionCount === 50 ? 25 : 35;

  // ─── Mode Switch Handler (Guarantees Total State Independence) ─
  const handleSwitchMode = (newMode: "database" | "pdf") => {
    if (newMode === examMode) return;
    setExamMode(newMode);
    setValidationError(null);
    setActiveQuiz(null);
    setQuizCompleted(false);

    if (newMode === "database") {
      // Clean and reset any PDF state
      setUploadedPdf(null);
      setPdfSubject("");
      setSelectedPdfChapterIds(new Set());
      setSelectEntirePdf(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      // Clean and reset database state
      setDbSubject("Physics");
      setDbChapter("all");
    }
  };

  // When class changes in Database mode
  const handleClassChange = (cls: "9-10" | "11-12") => {
    setSelectedClassState(cls);
    setSelectedClass(cls);
    setActiveQuiz(null);
    setQuizCompleted(false);
    if (cls === "9-10") {
      setDbSubject("Physics");
    } else {
      setDbSubject("");
    }
    setDbChapter("all");
    setValidationError(null);
  };

  // When subject changes in Database mode
  const handleDbSubjectChange = (sub: string) => {
    setDbSubject(sub);
    setDbChapter("all");
    setValidationError(null);
    setActiveQuiz(null);
    setQuizCompleted(false);
  };

  // ─── PDF Upload & Analysis Handlers ──────────────────────────
  const handleProcessPdf = async (file: File) => {
    if (!file) return;

    // Reset old database/PDF selections
    setExamMode("pdf");
    setValidationError(null);
    setIsUploadingPdf(true);
    setPdfUploadStatus(`Analyzing full document "${file.name}"...`);

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeMB} MB`;

    try {
      setPdfUploadStatus("Extracting readable content and detecting chapters...");
      const res = await api.analyzeDocument(file);

      if (res.success && res.data) {
        const data = res.data;
        const analysis: UploadedDocAnalysis = {
          id: data.id,
          name: file.name,
          size: sizeStr,
          fileType: data.fileType || file.type,
          pageCount: data.pageCount || 1,
          isScanned: Boolean(data.isScanned),
          ocrApplied: Boolean(data.ocrApplied),
          language: data.language || "english",
          charCount: data.charCount || 0,
          wordCount: data.wordCount || 0,
          hasReadableText: data.hasReadableText !== false && data.charCount > 30,
          chapters: data.chapters || [],
          allDetectedTopics: data.allDetectedTopics || [],
          extractedText: data.extractedText || "",
          pages: data.pages || [],
        };

        setUploadedPdf(analysis);
        setActiveQuiz(null);
        setQuizCompleted(false);

        // Auto-infer Subject from document name or detected chapters
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
        const firstChTitle = analysis.chapters[0]?.title?.split(/[:(]/)[0]?.trim();
        setPdfSubject(firstChTitle || cleanName || "Uploaded Study Material");

        // Default to Entire PDF selected
        setSelectEntirePdf(true);
        setSelectedPdfChapterIds(new Set(analysis.chapters.map((c) => c.id)));
        setIsUploadingPdf(false);
        setPdfUploadStatus("");
        toast.success(`PDF parsed! ${analysis.pageCount} pages, ${analysis.chapters.length} chapters indexed.`);
        return;
      }
    } catch (err: any) {
      console.warn("Backend PDF analysis notice, activating local fallback:", err);
    }

    // Client fallback if backend is unreachable or large PDF
    try {
      const text = await file.text().catch(() => "");
      let estPages = Math.min(450, Math.max(1, Math.round(file.size / (65 * 1024))));
      const countMatch = text.match(/\/Count\s+(\d+)/);
      if (countMatch && countMatch[1]) {
        const cnt = parseInt(countMatch[1], 10);
        if (cnt >= 1 && cnt <= 650) {
          estPages = cnt;
        }
      }
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches && pageMatches.length >= 1 && pageMatches.length <= 650) {
        estPages = pageMatches.length;
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
      const lowerName = file.name.toLowerCase();
      const lowerText = text.slice(0, 8000).toLowerCase();

      let detectedChapters: AnalyzedChapter[] = [];
      let detectedTopics: string[] = [];

      // 1. Check known Class 9-10 Biology & Physics NCTB books
      if (lowerName.includes("bio") || lowerText.includes("biology") || lowerText.includes("জীববিজ্ঞান") || lowerText.includes("জীবন পাঠ")) {
        const bioChs = CLASS_9_10_CHAPTERS.Biology || [];
        const pagesPerCh = Math.max(1, Math.floor(estPages / bioChs.length));
        detectedChapters = bioChs.map((c, i) => {
          const sPage = i * pagesPerCh + 1;
          const ePage = i === bioChs.length - 1 ? estPages : (i + 1) * pagesPerCh;
          return {
            id: `bio-ch-${c.id}`,
            chapterNumber: String(c.id).padStart(2, "0"),
            title: `${c.name} (${c.bn})`,
            startPage: sPage,
            endPage: ePage,
            pageRange: `pp. ${sPage}–${ePage}`,
            subtopics: ["Core Concepts", "Definitions", "Board Exam Focus"],
            snippet: `Content for ${c.name} (${c.bn})`,
            charCount: 1500,
          };
        });
        detectedTopics = detectedChapters.map((c) => c.title);
      } else if (lowerName.includes("physic") || lowerText.includes("physics") || lowerText.includes("পদার্থ") || lowerText.includes("পদার্থবিজ্ঞান")) {
        const phyChs = CLASS_9_10_CHAPTERS.Physics || [];
        const pagesPerCh = Math.max(1, Math.floor(estPages / phyChs.length));
        detectedChapters = phyChs.map((c, i) => {
          const sPage = i * pagesPerCh + 1;
          const ePage = i === phyChs.length - 1 ? estPages : (i + 1) * pagesPerCh;
          return {
            id: `phy-ch-${c.id}`,
            chapterNumber: String(c.id).padStart(2, "0"),
            title: `${c.name} (${c.bn})`,
            startPage: sPage,
            endPage: ePage,
            pageRange: `pp. ${sPage}–${ePage}`,
            subtopics: ["Principles & Laws", "Formulas", "Numerical Applications"],
            snippet: `Content for ${c.name} (${c.bn})`,
            charCount: 1500,
          };
        });
        detectedTopics = detectedChapters.map((c) => c.title);
      } else {
        // 2. Regex scan for Chapter / অধ্যায় / Unit / Module / Lecture in document
        const chapterRegex = /(?:^|\n)\s*(?:chapter|অধ্যায়|ইউনিট|unit|module|section|part|লেকচার|lecture)\s*([0-9ivxlcdm০-৯]+)[\s:.\-–—]+([^\r\n]{3,80})/gi;
        let match: RegExpExecArray | null;
        const seen = new Set<string>();

        while ((match = chapterRegex.exec(text)) !== null) {
          const num = (match[1] || "").trim();
          const title = (match[2] || "").trim().replace(/[#*_]/g, "");
          const key = title.toLowerCase();
          if (!seen.has(key) && title.length >= 3 && !key.includes("page")) {
            seen.add(key);
            const estChPage = Math.min(estPages, Math.max(1, Math.round((match.index / (text.length || 1)) * estPages)));
            detectedChapters.push({
              id: `ch-${detectedChapters.length + 1}`,
              chapterNumber: num.padStart(2, "0"),
              title,
              startPage: estChPage,
              endPage: estChPage,
              pageRange: `p. ${estChPage}`,
              subtopics: ["Key Concepts", "Overview", "Summary"],
              snippet: text.slice(match.index, match.index + 2000),
              charCount: 2000,
            });
          }
          if (detectedChapters.length >= 20) break;
        }

        if (detectedChapters.length >= 2) {
          for (let i = 0; i < detectedChapters.length; i++) {
            const cur = detectedChapters[i]!;
            const next = detectedChapters[i + 1];
            cur.endPage = next ? Math.max(cur.startPage, next.startPage - 1) : estPages;
            cur.pageRange = cur.startPage === cur.endPage ? `p. ${cur.startPage}` : `pp. ${cur.startPage}–${cur.endPage}`;
          }
        } else {
          // 3. Fallback: divide pages into structured topical sections so student can choose
          const sectionCount = Math.min(8, Math.max(3, Math.ceil(estPages / 15)));
          const pagesPerSec = Math.max(1, Math.ceil(estPages / sectionCount));

          for (let i = 0; i < sectionCount; i++) {
            const sPage = i * pagesPerSec + 1;
            const ePage = Math.min(estPages, (i + 1) * pagesPerSec);
            detectedChapters.push({
              id: `sec-${i + 1}`,
              chapterNumber: String(i + 1).padStart(2, "0"),
              title: `${cleanName} — Chapter / Section ${i + 1}`,
              startPage: sPage,
              endPage: ePage,
              pageRange: `pp. ${sPage}–${ePage}`,
              subtopics: ["Core Concepts", "Key Definitions", "Exam Focus"],
              snippet: text.slice(i * 1500, (i + 1) * 1500),
              charCount: 1500,
            });
          }
        }
        detectedTopics = detectedChapters.map((c) => c.title);
      }

      const analysis: UploadedDocAnalysis = {
        name: file.name,
        size: sizeStr,
        pageCount: estPages,
        isScanned: text.length < 50,
        ocrApplied: false,
        language: /[\u0980-\u09FF]/.test(text) ? "bangla" : "english",
        charCount: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        hasReadableText: text.length > 30,
        chapters: detectedChapters,
        allDetectedTopics: detectedTopics,
        extractedText: text || `Content from ${file.name}`,
      };

      setUploadedPdf(analysis);
      setActiveQuiz(null);
      setQuizCompleted(false);
      setPdfSubject(cleanName);
      setSelectEntirePdf(true);
      setSelectedPdfChapterIds(new Set(analysis.chapters.map((c) => c.id)));
      setIsUploadingPdf(false);
      setPdfUploadStatus("");
      toast.success(`Document loaded: ${analysis.pageCount} pages, ${analysis.chapters.length} chapters indexed.`);
    } catch (fallbackErr: any) {
      setIsUploadingPdf(false);
      setPdfUploadStatus("");
      setValidationError("Failed to read document. Please ensure it is a valid PDF or Word document.");
    }
  };

  const handleRemovePdf = () => {
    setUploadedPdf(null);
    setPdfSubject("");
    setSelectedPdfChapterIds(new Set());
    setSelectEntirePdf(true);
    setValidationError(null);
    setActiveQuiz(null);
    setQuizCompleted(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessPdf(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessPdf(e.target.files[0]);
    }
  };

  // Toggle chapter selection in PDF mode
  const handleTogglePdfChapter = (chId: string) => {
    const next = new Set(selectedPdfChapterIds);
    if (next.has(chId)) {
      next.delete(chId);
    } else {
      next.add(chId);
    }
    setSelectedPdfChapterIds(next);

    if (uploadedPdf && next.size === uploadedPdf.chapters.length) {
      setSelectEntirePdf(true);
    } else {
      setSelectEntirePdf(false);
    }
  };

  const handleToggleSelectAllPdf = () => {
    if (!uploadedPdf) return;
    if (selectEntirePdf) {
      setSelectEntirePdf(false);
      setSelectedPdfChapterIds(new Set());
    } else {
      setSelectEntirePdf(true);
      setSelectedPdfChapterIds(new Set(uploadedPdf.chapters.map((c) => c.id)));
    }
  };

  // Filter PDF chapters by search query
  const filteredPdfChapters = (uploadedPdf?.chapters || []).filter((ch) => {
    if (!pdfChapterSearch.trim()) return true;
    const q = pdfChapterSearch.toLowerCase();
    return ch.title.toLowerCase().includes(q) || ch.subtopics.some((st) => st.toLowerCase().includes(q));
  });

  // ─── Generate Quiz Handler ───────────────────────────────────
  const handleGenerateQuiz = async () => {
    setValidationError(null);

    // Validation
    if (user.coins < coinCost) {
      setValidationError(`Insufficient study coins! You need ${coinCost} coins to generate this ${questionCount} Marks Exam.`);
      return;
    }

    let targetSubject = "";
    let targetChapter = "";
    let sourceContext = "";
    let selectedChapterNames: string[] = [];

    if (examMode === "database") {
      if (selectedClass !== "9-10") {
        setValidationError("Database exams are pre-indexed for Class 9–10 (Physics & Biology). For Class 11–12, please switch to PDF Study Material Exam.");
        return;
      }
      targetSubject = dbSubject;
      if (dbChapter === "all") {
        targetChapter = `Complete Syllabus (${availableChapters.length} Chapters)`;
        selectedChapterNames = availableChapters.map((c) => `${c.en} (${c.bn})`);
      } else {
        const found = availableChapters.find((c) => c.en === dbChapter);
        targetChapter = found ? `${found.en} (${found.bn})` : dbChapter;
        selectedChapterNames = [targetChapter];
      }
    } else {
      // PDF Mode Validation
      if (!uploadedPdf) {
        setValidationError("Please upload a PDF document before generating the exam.");
        return;
      }
      if (!pdfSubject.trim()) {
        setValidationError("Please provide or confirm the subject name for your PDF.");
        return;
      }
      if (!selectEntirePdf && selectedPdfChapterIds.size === 0) {
        setValidationError("Please select at least one chapter or choose 'Select All Chapters (Entire PDF)'.");
        return;
      }

      targetSubject = pdfSubject.trim();

      if (selectEntirePdf || selectedPdfChapterIds.size === uploadedPdf.chapters.length) {
        targetChapter = `Entire PDF (${uploadedPdf.chapters.length} Chapters, ${uploadedPdf.pageCount} Pages)`;
        sourceContext = uploadedPdf.extractedText;
        selectedChapterNames = uploadedPdf.chapters.map((c) => c.title);
      } else {
        const chosenChapters = uploadedPdf.chapters.filter((c) => selectedPdfChapterIds.has(c.id));
        targetChapter = chosenChapters.map((c) => c.title).join(", ");
        selectedChapterNames = chosenChapters.map((c) => c.title);

        // Gather text for chosen chapters
        if (uploadedPdf.pages && uploadedPdf.pages.length > 0) {
          const matchedPages = uploadedPdf.pages.filter((p) =>
            chosenChapters.some((ch) => p.pageNumber >= ch.startPage && p.pageNumber <= ch.endPage)
          );
          sourceContext = matchedPages.map((p) => p.text).join("\n").trim();
        }

        if (!sourceContext || sourceContext.length < 80) {
          sourceContext = chosenChapters.map((c) => c.snippet).join("\n\n").trim();
        }
        if (!sourceContext || sourceContext.length < 80) {
          sourceContext = uploadedPdf.extractedText;
        }
      }
    }

    setIsGenerating(true);

    try {
      const res = await api.generateQuiz({
        subject: targetSubject,
        chapter: targetChapter,
        questionCount,
        difficulty,
        contextText: sourceContext || undefined,
        selectedChapters: selectedChapterNames,
        classLevel: examMode === "database" ? `Class ${selectedClass}` : "Custom Document",
      });

      let questions: QuizQuestion[] = [];

      if (res.success && res.data?.questions && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        questions = res.data.questions.map((q: any, i: number) => {
          let opts = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
          while (opts.length < 4) {
            opts.push(`Alternative Option ${opts.length + 1}`);
          }
          if (opts.length > 4) opts = opts.slice(0, 4);

          return {
            id: `q-${i + 1}`,
            question: q.question || `Question ${i + 1}`,
            options: opts,
            correctIndex:
              typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < opts.length
                ? q.correctIndex
                : typeof q.correct_index === "number"
                ? q.correct_index
                : 0,
            explanation: q.explanation || "Correct answer based on the learning material.",
          };
        });
      }

      if (questions.length === 0) {
        console.warn("Backend quiz returned 0 questions, activating intelligent fallback generator...");
        const offlineQuestions = generateOfflineQuiz(targetSubject, targetChapter, sourceContext, questionCount);
        if (offlineQuestions && offlineQuestions.length > 0) {
          questions = offlineQuestions.map((q: any, i: number) => ({
            id: `q-${i + 1}`,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation || "Correct answer based on the learning material.",
          }));
        }
      }

      if (questions.length === 0) {
        throw new Error("Unable to generate questions from the selected material. Please try again.");
      }

      // Deduct coins only after successful generation
      updateCoins(-coinCost);

      const newQuiz = addQuiz({
        subject: targetSubject,
        chapter: targetChapter,
        title: `${targetSubject} — ${targetChapter} (${questions.length} Marks Assessment)`,
        questions,
        totalQuestions: questions.length,
        coinCost,
      });

      setIsGenerating(false);
      setQuizzes(getQuizzes());
      startQuiz(newQuiz);
      toast.success(`Exam ready! ${questions.length} Marks MCQ assessment generated.`);
    } catch (err: any) {
      console.error("Quiz generation error:", err);
      setIsGenerating(false);
      setValidationError(err.message || "Failed to generate exam. Please try again.");
    }
  };

  // ─── Quiz Player Handlers ────────────────────────────────────
  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setQuizCompleted(false);
    setFinalScore(0);
    setShowPalette(false);
  };

  const handleSelectOption = (optIndex: number) => {
    if (quizCompleted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQIndex]: optIndex,
    }));

    // In Practice Mode, immediately reveal answer
    if (practiceMode) {
      setRevealedAnswers((prev) => ({
        ...prev,
        [currentQIndex]: true,
      }));
    }
  };

  const handleNext = () => {
    if (!activeQuiz) return;
    if (currentQIndex < activeQuiz.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      submitExam();
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const submitExam = () => {
    if (!activeQuiz) return;

    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });

    setFinalScore(score);
    setQuizCompleted(true);
    updateQuizScore(activeQuiz.id, score);
    setQuizzes(getQuizzes());

    // Award +25 coins on scoring >= 70%
    const pct = Math.round((score / activeQuiz.totalQuestions) * 100);
    if (pct >= 70) {
      updateCoins(25);
      toast.success(`Congratulations! You passed with ${pct}% and earned +25 study coins!`);
    }
  };

  const handleDeleteQuiz = (id: string) => {
    deleteQuiz(id);
    const updated = getQuizzes();
    setQuizzes(updated);
    if (activeQuiz?.id === id) {
      setActiveQuiz(updated.length > 0 && updated[0] ? updated[0] : null);
      setQuizCompleted(false);
    }
  };

  const currentQ = activeQuiz?.questions[currentQIndex];
  const userSelectedOption = selectedAnswers[currentQIndex];
  const isCurrentRevealed = practiceMode || Boolean(revealedAnswers[currentQIndex]);
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1.5">
              <Target className="h-4 w-4" /> Adaptive Exam Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Mock Test &amp; Quiz Engine
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Take comprehensive 10, 50, or 100-mark exams generated from the official NCTB curriculum or your own uploaded study materials.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">Balance:</span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
              🪙 {user.coins} Coins
            </span>
          </div>
        </div>

        {/* ─── Mode Selection: Database vs PDF ───────────────────── */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Select Exam Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mode 1: Database-Based Exam */}
            <button
              type="button"
              onClick={() => handleSwitchMode("database")}
              className={`rounded-xl p-4 text-left border transition flex items-start gap-3.5 cursor-pointer ${
                examMode === "database"
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-border/60 bg-card/60 hover:bg-card hover:border-border text-muted-foreground"
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${examMode === "database" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Database Curriculum Exam</span>
                  {examMode === "database" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Class 9–10 (SSC) and Class 11–12 (HSC) NCTB curriculum subjects and official chapters.
                </p>
              </div>
            </button>

            {/* Mode 2: PDF-Based Exam */}
            <button
              type="button"
              onClick={() => handleSwitchMode("pdf")}
              className={`rounded-xl p-4 text-left border transition flex items-start gap-3.5 cursor-pointer ${
                examMode === "pdf"
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-border/60 bg-card/60 hover:bg-card hover:border-border text-muted-foreground"
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${examMode === "pdf" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">PDF Study Material Exam</span>
                  {examMode === "pdf" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload your own book, guide, or notes. Questions generated strictly from your document.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ─── Main Generator & Player Layout ────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Creator Pane */}
          <div className="lg:col-span-5 space-y-4">
            <div className="panel p-5 space-y-4 bg-card border border-border/80 shadow-md rounded-2xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {examMode === "database" ? "Database Exam Setup" : "PDF Exam Setup"}
                </h2>
                <span className="text-[11px] font-mono text-primary font-semibold">
                  Cost: {coinCost} Coins
                </span>
              </div>

              {/* ─── MODE 1: Database Exam Form ─────────────────── */}
              {examMode === "database" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Class Selection */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      1. Education Level
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleClassChange("9-10")}
                        className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition cursor-pointer ${
                          selectedClass === "9-10"
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40"
                            : "border-border/60 bg-background/60 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        Class 9–10 (SSC)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClassChange("11-12")}
                        className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition cursor-pointer ${
                          selectedClass === "11-12"
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40"
                            : "border-border/60 bg-background/60 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        Class 11–12 (HSC)
                      </button>
                    </div>
                  </div>

                  {/* Subject and Chapter Selection or Class 11-12 Notice */}
                  {selectedClass === "11-12" ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-200">
                        <AlertCircle className="h-4 w-4" />
                        No Preloaded Database Textbooks for Class 11–12
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        The Brain Nest database pre-indexes official textbooks for <strong>Class 9–10 (Physics &amp; Biology)</strong>. For Class 11–12 (HSC), please switch to <strong>PDF Study Material Exam</strong> to upload your own textbook or syllabus notes and generate authentic exams.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSwitchMode("pdf")}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 mt-2"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Switch to PDF Exam Mode
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Dynamic Subject Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            2. Select Subject
                          </label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {availableSubjects.length} subjects
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {availableSubjects.map((sub) => {
                            const isSelected = dbSubject === sub;
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => handleDbSubjectChange(sub)}
                                className={`rounded-xl px-3 py-2.5 text-xs font-medium border text-left truncate transition cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                                    : "border-border/60 bg-background/60 hover:bg-muted text-foreground"
                                }`}
                              >
                                <span>{sub}</span>
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dynamic Chapter Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            3. Select Chapter / Scope
                          </label>
                          <span className="text-[10px] text-primary font-semibold">
                            {availableChapters.length} Chapters
                          </span>
                        </div>
                        <select
                          value={dbChapter}
                          onChange={(e) => setDbChapter(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="all">
                            🌟 All Chapters (Complete Subject Syllabus)
                          </option>
                          {availableChapters.map((ch) => (
                            <option key={ch.id} value={ch.en}>
                              Chapter {ch.number}: {ch.en} ({ch.bn})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── MODE 2: PDF Study Material Exam Form ────────── */}
              {examMode === "pdf" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* File Upload Zone */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      1. Upload Study Document (PDF / DOCX)
                    </label>

                    {!uploadedPdf ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                          isDragOver
                            ? "border-primary bg-primary/10"
                            : "border-border/70 hover:border-primary/60 bg-background/50 hover:bg-background"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.pptx,.txt"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        {isUploadingPdf ? (
                          <div className="py-2 flex flex-col items-center gap-2">
                            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs font-semibold text-primary">{pdfUploadStatus}</span>
                            <span className="text-[10px] text-muted-foreground">Extracting pages, OCR &amp; chapter outlines...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                              <Upload className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-foreground block">
                                Click or drag your PDF here
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                Supports PDF, Word (.docx), PPTX, or TXT up to 50MB
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Analyzed PDF Card */
                      <div className="rounded-xl border border-primary/40 bg-accent/25 p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground truncate block">
                                {uploadedPdf.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span>{uploadedPdf.size}</span>
                                <span>•</span>
                                <span className="text-primary font-semibold">{uploadedPdf.pageCount} Pages</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-medium">
                                  {uploadedPdf.ocrApplied ? "OCR Applied" : "Text Extracted"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleRemovePdf}
                            className="p-1 text-muted-foreground hover:text-destructive transition rounded-lg"
                            title="Remove PDF"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                          <span>Language: <strong className="text-foreground">{uploadedPdf.language.toUpperCase()}</strong></span>
                          <span>{uploadedPdf.wordCount.toLocaleString()} words indexed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PDF Subject Input (Auto-inferred with manual edit) */}
                  {uploadedPdf && (
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        2. Subject / Topic Title
                      </label>
                      <input
                        type="text"
                        value={pdfSubject}
                        onChange={(e) => setPdfSubject(e.target.value)}
                        placeholder="e.g. Information Technology, Physics, Higher Math"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}

                  {/* PDF Detected Chapters & Scope Selection */}
                  {uploadedPdf && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          3. Select Chapters to Test
                        </label>
                        <span className="text-[10px] font-mono text-primary">
                          {uploadedPdf.chapters.length} chapters found
                        </span>
                      </div>

                      {/* Select All Chapters Toggle */}
                      <button
                        type="button"
                        onClick={handleToggleSelectAllPdf}
                        className={`w-full rounded-xl p-2.5 text-xs font-medium border flex items-center justify-between transition cursor-pointer ${
                          selectEntirePdf
                            ? "border-primary bg-primary/15 text-primary font-bold"
                            : "border-border/60 bg-background hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {selectEntirePdf ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                          Entire PDF (All {uploadedPdf.chapters.length} Chapters)
                        </span>
                        <span className="text-[10px] font-mono opacity-80">
                          pp. 1–{uploadedPdf.pageCount}
                        </span>
                      </button>

                      {/* Chapters Filter */}
                      {uploadedPdf.chapters.length > 5 && (
                        <div className="relative">
                          <Search className="h-3 w-3 absolute left-2.5 top-2 text-muted-foreground" />
                          <input
                            type="text"
                            value={pdfChapterSearch}
                            onChange={(e) => setPdfChapterSearch(e.target.value)}
                            placeholder="Filter chapters..."
                            className="w-full rounded-lg border border-border bg-background/60 pl-8 pr-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {/* Chapters List */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {filteredPdfChapters.map((ch) => {
                          const isChecked = selectedPdfChapterIds.has(ch.id);
                          return (
                            <div
                              key={ch.id}
                              onClick={() => handleTogglePdfChapter(ch.id)}
                              className={`rounded-lg border p-2 text-xs flex items-start gap-2 cursor-pointer transition ${
                                isChecked
                                  ? "border-primary/80 bg-primary/10 text-foreground"
                                  : "border-border/50 bg-background/40 hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                {isChecked ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-foreground truncate">
                                    <span className="text-primary font-mono mr-1.5">{ch.chapterNumber}</span>
                                    {ch.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                    {ch.pageRange}
                                  </span>
                                </div>
                                {ch.subtopics.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {ch.subtopics.slice(0, 3).map((st, i) => (
                                      <span key={i} className="text-[9px] bg-accent/40 text-muted-foreground px-1.5 py-0.2 rounded">
                                        {st}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Exam Settings: Marks & Difficulty ─────────── */}
              <div className="border-t border-border/50 pt-3 space-y-3">
                {/* 10, 50, 100 Marks Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Exam Marks / Questions (1 Mark Each)
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { count: 10, label: "10 Marks", desc: "10 Qs · Quick" },
                      { count: 50, label: "50 Marks", desc: "50 Qs · Midterm" },
                      { count: 100, label: "100 Marks", desc: "100 Qs · Full Exam" },
                    ].map((m) => (
                      <button
                        key={m.count}
                        type="button"
                        onClick={() => setQuestionCount(m.count)}
                        className={`rounded-xl p-2 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                          questionCount === m.count
                            ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                            : "border border-border/60 bg-background/60 hover:bg-card text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs font-bold">{m.label}</span>
                        <span className="text-[9px] opacity-80 mt-0.5">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: "mixed", label: "Mixed" },
                      { key: "easy", label: "Easy" },
                      { key: "medium", label: "Medium" },
                      { key: "hard", label: "Hard" },
                    ].map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setDifficulty(d.key as any)}
                        className={`rounded-lg py-1.5 text-xs font-medium border text-center transition cursor-pointer ${
                          difficulty === d.key
                            ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                            : "border-border/60 bg-background/60 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Validation Message */}
              {validationError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateQuiz}
                disabled={isGenerating || isUploadingPdf || (examMode === "pdf" && !uploadedPdf)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-40 cursor-pointer text-xs sm:text-sm"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating
                  ? `Generating ${questionCount} Marks Exam...`
                  : `Generate ${questionCount} Marks Exam (${coinCost} Coins)`}
              </button>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Pass Reward: <strong className="text-emerald-400">+25 Coins on 70%+</strong></span>
                <span>Auto-graded with Explanations</span>
              </div>
            </div>

            {/* Past Quizzes List */}
            {quizzes.length > 0 && (
              <div className="panel p-4 bg-card border border-border/80 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Past Exams ({quizzes.length})
                  </h3>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {quizzes.map((q) => {
                    const hasTaken = q.score !== undefined;
                    const pct = hasTaken ? Math.round((q.score! / q.totalQuestions) * 100) : 0;
                    const isSelected = activeQuiz?.id === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => startQuiz(q)}
                        className={`cursor-pointer rounded-xl p-2.5 text-xs transition flex items-center justify-between border ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground"
                            : "bg-background/50 hover:bg-muted/60 border-border/60 text-muted-foreground"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground text-xs">{q.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{q.totalQuestions} Marks</span>
                            {hasTaken && (
                              <span className={`px-1.5 py-0.2 rounded font-bold ${pct >= 70 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                                {q.score}/{q.totalQuestions} ({pct}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuiz(q.id);
                          }}
                          className="p-1 hover:text-destructive text-muted-foreground ml-2 rounded"
                          title="Delete Quiz"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Quiz Player & Results */}
          <div className="lg:col-span-7">
            {activeQuiz && currentQ ? (
              quizCompleted ? (
                /* Results Screen with Full Mark Sheet & Answer Explanations */
                <div className="panel p-6 sm:p-8 flex flex-col items-center bg-card border border-border shadow-md rounded-2xl animate-in fade-in duration-300">
                  <div className="h-16 w-16 grid place-items-center rounded-2xl bg-primary/20 text-primary mb-4 shadow-sm">
                    <Trophy className="h-8 w-8 text-amber-400" />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Exam Completed</h2>
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    Performance Report: {activeQuiz.title}
                  </p>

                  {/* Score Card */}
                  <div className="mt-5 panel p-5 w-full max-w-sm bg-background/80 border border-border/80 rounded-xl text-center">
                    <div className="text-4xl font-extrabold text-primary font-mono">
                      {finalScore} / {activeQuiz.totalQuestions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total Marks Earned ({Math.round((finalScore / activeQuiz.totalQuestions) * 100)}% Accuracy)
                    </p>

                    {Math.round((finalScore / activeQuiz.totalQuestions) * 100) >= 70 ? (
                      <div className="mt-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2 text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
                        <Award className="h-4 w-4" /> Passed with Distinction (+25 Coins Earned!)
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg bg-amber-500/15 border border-amber-500/30 p-2 text-xs text-amber-300">
                        Score below 70%. Review incorrect questions below to master this topic!
                      </div>
                    )}
                  </div>

                  {/* Review Filter Tabs */}
                  <div className="mt-6 w-full flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-primary" /> Question Review
                    </h3>
                    <div className="flex gap-1">
                      {(["all", "incorrect", "correct"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setReviewFilter(f)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                            reviewFilter === f
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Questions Review List */}
                  <div className="mt-4 w-full space-y-3 max-h-96 overflow-y-auto pr-1">
                    {activeQuiz.questions
                      .filter((q, idx) => {
                        const userAns = selectedAnswers[idx];
                        const isCorrect = userAns === q.correctIndex;
                        if (reviewFilter === "incorrect") return !isCorrect;
                        if (reviewFilter === "correct") return isCorrect;
                        return true;
                      })
                      .map((q, idx) => {
                        // Find original index
                        const originalIdx = activeQuiz.questions.findIndex((item) => item.question === q.question);
                        const userAns = selectedAnswers[originalIdx];
                        const isCorrect = userAns === q.correctIndex;

                        return (
                          <div
                            key={originalIdx}
                            className={`rounded-xl border p-4 text-xs ${
                              isCorrect
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-destructive/30 bg-destructive/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-semibold text-foreground text-xs leading-relaxed">
                                <span className="font-bold text-primary mr-1">Q{originalIdx + 1}.</span>
                                {q.question}
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ${
                                  isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/20 text-destructive"
                                }`}
                              >
                                {isCorrect ? "1 / 1 Mark" : "0 / 1 Mark"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 my-2">
                              {q.options.map((opt, oIdx) => {
                                const isOptCorrect = oIdx === q.correctIndex;
                                const isUserPick = userAns === oIdx;

                                let optClass = "border-border/60 bg-background/50 text-muted-foreground";
                                if (isOptCorrect) {
                                  optClass = "border-emerald-500 bg-emerald-500/20 font-bold text-emerald-300";
                                } else if (isUserPick) {
                                  optClass = "border-destructive bg-destructive/20 text-destructive font-bold";
                                }

                                return (
                                  <div key={oIdx} className={`p-2 rounded-lg text-[11px] border flex items-center justify-between ${optClass}`}>
                                    <span>
                                      <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                                    </span>
                                    {isOptCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-1" />}
                                    {isUserPick && !isOptCorrect && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 ml-1" />}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <div className="text-[11px] text-muted-foreground mt-2 border-t border-border/40 pt-2 leading-relaxed">
                                <strong className="text-primary mr-1">Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => startQuiz(activeQuiz)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition cursor-pointer text-xs"
                    >
                      <RotateCcw className="h-4 w-4" /> Retake This Exam
                    </button>
                  </div>
                </div>
              ) : (
                /* Interactive Quiz Question Card */
                <div className="panel flex flex-col p-6 min-h-[520px] justify-between bg-card border border-border shadow-md rounded-2xl animate-in fade-in duration-200">
                  <div>
                    {/* Top Progress & Mode Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary">
                            Q{currentQIndex + 1} of {activeQuiz.questions.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground">• 1 Mark Each</span>
                        </div>
                        <h3 className="font-bold text-xs text-foreground truncate mt-0.5">
                          {activeQuiz.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Practice Mode Toggle */}
                        <button
                          type="button"
                          onClick={() => setPracticeMode(!practiceMode)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                            practiceMode
                              ? "bg-primary/20 border-primary text-primary font-bold"
                              : "border-border/60 text-muted-foreground hover:bg-muted"
                          }`}
                          title="Instant feedback after every question"
                        >
                          <Eye className="h-3 w-3" />
                          {practiceMode ? "Practice Mode" : "Exam Mode"}
                        </button>

                        {/* Question Palette Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowPalette(!showPalette)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border/60 hover:bg-muted text-muted-foreground transition cursor-pointer flex items-center gap-1"
                          title="View all questions palette"
                        >
                          <Layers className="h-3 w-3" />
                          <span>{answeredCount}/{activeQuiz.questions.length}</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Palette Drawer (Collapsible) */}
                    {showPalette && (
                      <div className="mb-4 p-3 rounded-xl border border-border bg-background/80 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">Question Palette (Jump to Question)</span>
                          <span className="text-[10px]">{answeredCount} Answered • {activeQuiz.questions.length - answeredCount} Pending</span>
                        </div>
                        <div className="grid grid-cols-10 gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {activeQuiz.questions.map((_, idx) => {
                            const isAnswered = selectedAnswers[idx] !== undefined;
                            const isCurrent = idx === currentQIndex;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setCurrentQIndex(idx);
                                  setShowPalette(false);
                                }}
                                className={`h-7 w-7 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center cursor-pointer ${
                                  isCurrent
                                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40"
                                    : isAnswered
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                    : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/40"
                                }`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-muted mb-6 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((currentQIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                      />
                    </div>

                    {/* Question Statement */}
                    <div className="mb-6">
                      <h2 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                        {currentQ.question}
                      </h2>
                    </div>

                    {/* 4 Multiple Choice Options (A, B, C, D) */}
                    <div className="space-y-2.5">
                      {currentQ.options.map((opt, optIdx) => {
                        const isSelected = userSelectedOption === optIdx;
                        let optionStyle = "border-border/60 bg-background/60 hover:bg-card text-foreground";

                        if (isCurrentRevealed) {
                          if (optIdx === currentQ.correctIndex) {
                            optionStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-semibold shadow-sm";
                          } else if (isSelected && optIdx !== currentQ.correctIndex) {
                            optionStyle = "border-destructive bg-destructive/15 text-destructive font-semibold";
                          }
                        } else if (isSelected) {
                          optionStyle = "border-primary bg-primary/20 text-primary font-semibold shadow-sm ring-1 ring-primary/40";
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${optionStyle}`}
                          >
                            <span className="grid h-6 w-6 place-items-center rounded-full border border-current text-xs font-bold shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="text-xs sm:text-sm flex-1 leading-snug">{opt}</span>

                            {isCurrentRevealed && optIdx === currentQ.correctIndex && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            )}
                            {isCurrentRevealed && isSelected && optIdx !== currentQ.correctIndex && (
                              <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box (Visible in Practice Mode or after manual check) */}
                    {isCurrentRevealed && currentQ.explanation && (
                      <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-foreground animate-in fade-in duration-200">
                        <strong className="text-primary block mb-1">Pedagogical Explanation:</strong>
                        <p className="leading-relaxed text-muted-foreground">{currentQ.explanation}</p>
                      </div>
                    )}
                  </div>

                  {/* Navigation & Submission Footer */}
                  <div className="mt-8 pt-4 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={currentQIndex === 0}
                      className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium hover:bg-muted disabled:opacity-30 transition cursor-pointer"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-2">
                      {!practiceMode && userSelectedOption !== undefined && !isCurrentRevealed && (
                        <button
                          type="button"
                          onClick={() => setRevealedAnswers((p) => ({ ...p, [currentQIndex]: true }))}
                          className="rounded-xl border border-primary/40 bg-accent px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition cursor-pointer"
                        >
                          Check Answer
                        </button>
                      )}

                      {currentQIndex === activeQuiz.questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={submitExam}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 cursor-pointer"
                        >
                          Submit Exam ({answeredCount}/{activeQuiz.questions.length})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleNext}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 cursor-pointer"
                        >
                          <span>Next</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Empty State */
              <div className="panel p-12 text-center flex flex-col items-center justify-center min-h-[480px] bg-card border border-border rounded-2xl shadow-sm">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary mb-3">
                  <Target className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">No Active Exam Session</h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                  Choose Database Curriculum or upload your own PDF on the left, select your chapters and question count, and click <strong>Generate Exam</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
