import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, type ChangeEvent, type DragEvent } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getUser, updateCoins, addWalletEntry,
  getQuestionBankData, getAvailableEducationLevels, getDepartmentsForLevel,
  getSemestersForDepartment, getSubjectsForSelection, getQuestionsForSubject,
  getAIQuestionAnalyses, addAIQuestionAnalysis, getFiles,
  type QuestionBankLevel, type QuestionBankSubject, type QuestionBankQuestion,
  type AIQuestionAnalysisResult, type AIAnalyzedQuestion, type UploadedFile,
  type RepeatedQuestionStat, type YearAnalysisStat, type AIPredictedQuestionItem
} from "@/lib/store";
import {
  Sparkles, TrendingUp, Layers, CheckCircle2,
  Copy, Download, Target, FileText, ShieldCheck,
  Loader2, Check, BookOpen, AlertTriangle, ChevronRight,
  BookMarked, GraduationCap, Building2, Calendar, Coins,
  Flame, Search, BarChart3, Award, X, ChevronDown,
  Brain, Hash, Star, Zap, ArrowRight, ListChecks,
  Upload, FileUp, FolderOpen, Eye, RefreshCw, Paperclip,
  Trash2, PlusCircle, CheckSquare, Clock
} from "lucide-react";

export const Route = createFileRoute("/dashboard/question-analysis")({
  head: () => ({
    meta: [
      { title: "Historical Question Analysis & AI Prediction — Brain Nest" },
      { name: "description", content: "Analyze past exam question papers, identify question repetition across historical years, and generate smart predicted question sets for upcoming exams." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestionAnalysisFeaturePage,
});

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
const COIN_COST = 20;

export interface UploadedQuestionPaper {
  id: string;
  name: string;
  size: string;
  text: string;
  detectedYear?: string | undefined;
  questions: string[];
}

// Convert Bengali numerals to ASCII digits
function convertBengaliToAscii(str: string): string {
  const map: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  };
  return str.replace(/[০-৯]/g, (c) => map[c] || c);
}

// Detect 4-digit exam year from text or filename
function detectYearFromText(str: string): string | undefined {
  if (!str) return undefined;
  const normalized = convertBengaliToAscii(str);

  // Contextual pattern: "Exam 2022", "HSC 2023", "Session 2021-2022"
  const contextMatch = normalized.match(
    /\b(?:exam|examination|hsc|ssc|session|board|year|final|midterm)\b[^\n\d]{0,20}\b(20\d\d)\b/i
  );
  if (contextMatch && contextMatch[1]) return contextMatch[1];

  // Bracketed year pattern: [2022] or (2021)
  const bracketMatch = normalized.match(/[\(\[\{]\s*(20\d\d)\s*[\)\]\}]/);
  if (bracketMatch && bracketMatch[1]) return bracketMatch[1];

  // Any 20xx year
  const matches = normalized.match(/\b(20[0-3]\d)\b/g);
  if (matches && matches.length > 0) {
    return matches[matches.length - 1];
  }
  return undefined;
}

// Extract distinct questions from document text with full support for tables, bare numbers, multi-line questions, and year annotations
function extractQuestionsFromDocument(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const rawLines = clean.split("\n").map((l) => l.trim());

  // Filter out standalone page headers, syllabus banners, and metadata noise
  const lines = rawLines.filter((line) => {
    if (!line) return false;
    const lower = line.toLowerCase();
    if (lower.startsWith("--- [page") || lower.startsWith("--- page")) return false;
    if (
      lower.startsWith("time:") ||
      lower.startsWith("full marks:") ||
      lower.startsWith("total marks:") ||
      lower.startsWith("instructions:")
    )
      return false;
    if (
      lower.startsWith("topic - wise question bank") ||
      lower.startsWith("topic-wise question bank")
    )
      return false;
    if (
      lower.startsWith("subject:") ||
      lower.startsWith("course code:") ||
      lower.startsWith("dept.") ||
      lower.startsWith("department of")
    )
      return false;
    if (
      lower === "# question year(s)" ||
      lower === "question year(s)" ||
      lower === "# question" ||
      lower === "sl. question"
    )
      return false;
    return true;
  });

  const isBareNumber = (l: string) => /^(\d{1,3}|[\u09E6-\u09EF]{1,3})$/.test(l);
  const isYearLine = (l: string) =>
    /^(?:(?:20\d\d|19\d\d|Important|\bBoard\b|\bExam\b)[\s,–\-]*)+$/i.test(l);
  const startsWithQuestionKeyword = (l: string) =>
    /^(?:what|how|why|explain|define|discuss|describe|prove|find|calculate|differentiate|distinguish|compare|write|state|derive|illustrate|কী|কেন|ব্যাখ্যা|বর্ণনা|পার্থক্য|সংজ্ঞা)/i.test(
      l
    );

  const questions: string[] = [];
  let currentNumber: string | null = null;
  let currentText = "";
  let currentYears = "";

  const commitCurrent = () => {
    if (currentText.trim().length >= 10) {
      let finalStr = currentText.trim();
      if (currentYears.trim()) {
        finalStr += ` [${currentYears.trim()}]`;
      }
      if (currentNumber) {
        finalStr = `${currentNumber}. ${finalStr}`;
      }
      questions.push(finalStr);
    }
    currentNumber = null;
    currentText = "";
    currentYears = "";
  };

  for (const line of lines) {
    if (!line) continue;

    // Case A: Standalone question number on its own line (e.g. "1", "2")
    if (isBareNumber(line)) {
      commitCurrent();
      currentNumber = line;
      continue;
    }

    // Case B: Numbered question prefix (e.g. "3 Different between...", "4. Explain...")
    const numMatch = line.match(
      /^(?:Q(?:uestion)?\s*\.?\s*(\d+)[\.\:\-]?|(\d{1,3})[\.\:\)\s]+|([\u09E6-\u09EF]{1,3})[\.\:\)\।\s]+|\(([a-z\d\u0985-\u09B9])\)\s+|\(([ivxlcdm]+)\)\s+)(.*)$/i
    );
    if (numMatch) {
      const num = numMatch[1] || numMatch[2] || numMatch[3] || numMatch[4] || numMatch[5] || "";
      const rest = (numMatch[6] || "").trim();
      commitCurrent();
      currentNumber = num || null;
      if (rest) {
        currentText = rest;
      }
      continue;
    }

    // Case C: Year line attached to current question (e.g. "2022, 2020, 2019" or "2023")
    if (isYearLine(line)) {
      if (currentYears) {
        currentYears += ", " + line;
      } else {
        currentYears = line;
      }
      continue;
    }

    // Case D: Line starts with a direct question keyword
    if (startsWithQuestionKeyword(line)) {
      if (!currentText) {
        currentText = line;
      } else if (currentYears) {
        commitCurrent();
        currentText = line;
      } else if (line.endsWith("?") || currentText.endsWith("?") || currentText.length > 120) {
        commitCurrent();
        currentText = line;
      } else {
        currentText += " " + line;
      }
      continue;
    }

    // Case E: Continuation line
    if (currentText) {
      currentText += " " + line;
    } else if (line.length >= 15) {
      currentText = line;
    }
  }

  commitCurrent();

  // If parsed well, return questions
  if (questions.length >= 3) {
    return questions;
  }

  // Fallback 1: split by question marks
  const qMarkParts = clean.split(/(?<=\?)\s+(?=[A-Z\u0980-\u09FF\d])/);
  if (qMarkParts.length >= 3) {
    return qMarkParts.map((p) => p.trim()).filter((p) => p.length >= 15 && p.length < 900);
  }

  // Fallback 2: split by paragraphs
  const paragraphs = clean
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 25 && p.length < 1200);
  if (paragraphs.length >= 2) {
    return paragraphs;
  }

  return questions.length > 0 ? questions : [clean.slice(0, 300)];
}

function QuestionAnalysisFeaturePage() {
  const [userCoins, setUserCoins] = useState(() => getUser().coins);

  // Source selection: "upload" (PDF / Doc) or "bank" (Curriculum Question Bank)
  const [sourceMode, setSourceMode] = useState<"upload" | "bank">("upload");

  // --- Upload Mode State: Multi-PDF Support ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPapers, setUploadedPapers] = useState<UploadedQuestionPaper[]>([]);
  const [uploadSubject, setUploadSubject] = useState<string>("");
  const [uploadLevel, setUploadLevel] = useState<string>("Class 9-10 (SSC)");
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showDetectedList, setShowDetectedList] = useState<boolean>(false);
  const [libraryFiles, setLibraryFiles] = useState<UploadedFile[]>(() => getFiles());
  const [showLibraryPicker, setShowLibraryPicker] = useState<boolean>(false);

  // --- Question Bank Selection State ---
  const [selectedLevel, setSelectedLevel] = useState<string>("class-9-10");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [requestedCount, setRequestedCount] = useState<5 | 10 | 15 | 20>(10);

  // Dynamic database questions state
  const [dbQuestions, setDbQuestions] = useState<QuestionBankQuestion[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);

  // Data derived from selection
  const levels = useMemo(() => getAvailableEducationLevels(), []);
  const departments = useMemo(() => getDepartmentsForLevel(selectedLevel), [selectedLevel]);
  const semesters = useMemo(() => getSemestersForDepartment(selectedLevel, selectedDepartment), [selectedLevel, selectedDepartment]);
  const subjects = useMemo(() => getSubjectsForSelection(selectedLevel, selectedDepartment, selectedSemester), [selectedLevel, selectedDepartment, selectedSemester]);
  const selectedSubjectData = useMemo(() => subjects.find((s) => s.id === selectedSubject), [subjects, selectedSubject]);

  const activeQuestions = useMemo(() => {
    if (sourceMode === "bank") {
      return dbQuestions;
    }
    return [];
  }, [sourceMode, dbQuestions]);

  // Aggregate questions and detected years from all uploaded papers
  const allUploadedQuestions = useMemo(() => {
    return uploadedPapers.flatMap((p) => p.questions);
  }, [uploadedPapers]);

  const allDetectedYears = useMemo(() => {
    const years = new Set<string>();
    uploadedPapers.forEach((p) => {
      if (p.detectedYear) years.add(p.detectedYear);
      p.questions.forEach((q) => {
        const y = detectYearFromText(q);
        if (y) years.add(y);
      });
    });
    return Array.from(years).sort();
  }, [uploadedPapers]);

  const totalQuestions = sourceMode === "bank"
    ? activeQuestions.length
    : allUploadedQuestions.length;

  const hasDepartments = departments.length > 0;

  // Analysis results & state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIQuestionAnalysisResult | null>(null);
  const [pastAnalyses, setPastAnalyses] = useState<AIQuestionAnalysisResult[]>(() => getAIQuestionAnalyses());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showRepeatedSection, setShowRepeatedSection] = useState(true);
  const [predictionTabFilter, setPredictionTabFilter] = useState<"all" | "repeated" | "trend">("all");

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSelectedDepartment("");
    setSelectedSemester("");
    setSelectedSubject("");
    setDbQuestions([]);
    setAnalysisResult(null);
  }, [selectedLevel]);

  useEffect(() => {
    setSelectedSemester("");
    setSelectedSubject("");
    setDbQuestions([]);
    setAnalysisResult(null);
  }, [selectedDepartment]);

  useEffect(() => {
    setSelectedSubject("");
    setDbQuestions([]);
    setAnalysisResult(null);
  }, [selectedSemester]);

  useEffect(() => {
    setAnalysisResult(null);
  }, [selectedSubject]);

  // Fetch real questions from Supabase database whenever subject or level changes
  useEffect(() => {
    if (sourceMode !== "bank" || !selectedSubjectData) {
      setDbQuestions([]);
      return;
    }

    let isMounted = true;
    setIsLoadingDb(true);

    const levelData = levels.find((l) => l.id === selectedLevel);
    const deptData = departments.find((d) => d.id === selectedDepartment);
    const semData = semesters.find((s) => s.id === selectedSemester);

    api.getQuestionBank({
      level: levelData?.name || selectedLevel,
      department: deptData?.name || selectedDepartment,
      semester: semData?.name || selectedSemester,
      subject: selectedSubjectData.name,
    })
      .then((res: any) => {
        if (!isMounted) return;
        const fetched = res?.data?.questions || res?.questions || [];
        setDbQuestions(fetched);
      })
      .catch((err) => {
        console.warn("Failed to fetch database questions:", err);
        if (isMounted) setDbQuestions([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDb(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourceMode, selectedSubject, selectedLevel, selectedDepartment, selectedSemester, selectedSubjectData, levels, departments, semesters]);

  // Refresh coins & library
  useEffect(() => {
    setUserCoins(getUser().coins);
    setLibraryFiles(getFiles());
    api.getWalletBalance()
      .then((res: any) => {
        const balance = res?.data?.coins ?? res?.coins;
        if (typeof balance === "number") setUserCoins(balance);
      })
      .catch(() => {});
  }, []);

  // Auto-select first available option for Question Bank
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]!.id);
    }
  }, [subjects, selectedSubject]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllPredicted = () => {
    if (!analysisResult?.predictedQuestionSet) return;
    const formatted = analysisResult.predictedQuestionSet
      .map((item, idx) => `Q${idx + 1} [${item.category} - ${item.importance} - ${item.probabilityScore}%]:\n${item.question}\nRationale: ${item.rationale}\n`)
      .join("\n---\n\n");
    navigator.clipboard.writeText(formatted);
    setCopiedId("all-predicted");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // --- Multi-File Upload & Ingestion ---
  const handleFilesChosen = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(Boolean);
    if (fileArray.length === 0) return;

    setIsExtracting(true);
    setActionMessage(`Extracting questions & detecting years from ${fileArray.length} question paper(s)...`);

    const newPapers: UploadedQuestionPaper[] = [];

    for (const file of fileArray) {
      let text = "";
      try {
        const uploadRes = await api.uploadDocument(file, uploadSubject || "Question Paper", "Exam Questions");
        if (uploadRes?.success && uploadRes?.data?.extractedText) {
          text = uploadRes.data.extractedText;
        }
      } catch (err) {
        console.warn("Backend upload notice, using local file extraction:", err);
      }

      if (!text || text.length < 20) {
        try {
          const raw = await file.text();
          const printable = raw.replace(/[^\x20-\x7E\u0980-\u09FF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
          if (printable.length > 40) {
            text = printable.slice(0, 45000);
          }
        } catch {}
      }

      if (!text) {
        text = `Extracted question paper from "${file.name}".`;
      }

      const questions = extractQuestionsFromDocument(text);
      const year = detectYearFromText(file.name) || detectYearFromText(text);

      newPapers.push({
        id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
        text,
        detectedYear: year,
        questions,
      });

      // Auto infer subject from filename if subject is empty
      if (!uploadSubject.trim()) {
        const cleanSub = file.name.replace(/\.[^/.]+$/, "").replace(/\b(20\d\d|question|paper|exam|board|hsc|ssc|final)\b/gi, "").replace(/[-_]+/g, " ").trim();
        if (cleanSub.length >= 3) {
          setUploadSubject(cleanSub);
        }
      }
    }

    setUploadedPapers((prev) => [...prev, ...newPapers]);
    setIsExtracting(false);
    setActionMessage(`Added ${newPapers.length} question paper(s). Total questions indexed: ${allUploadedQuestions.length + newPapers.flatMap((p) => p.questions).length}!`);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesChosen(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesChosen(e.dataTransfer.files);
    }
  };

  const handleRemovePaper = (id: string) => {
    setUploadedPapers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSelectLibraryFile = (fileItem: UploadedFile) => {
    const text = fileItem.content || `Content of ${fileItem.name}`;
    const questions = extractQuestionsFromDocument(text);
    const year = detectYearFromText(fileItem.name) || detectYearFromText(text);

    setUploadedPapers((prev) => [
      ...prev,
      {
        id: `lib-${Date.now()}`,
        name: fileItem.name,
        size: `${Math.round(fileItem.size / 1024)} KB`,
        text,
        detectedYear: year,
        questions,
      },
    ]);

    if (!uploadSubject.trim() && fileItem.subject) {
      setUploadSubject(fileItem.subject);
    }
    setShowLibraryPicker(false);
    setActionMessage(`Added "${fileItem.name}" with ${questions.length} questions detected!`);
  };

  // --- Generate Analysis Handler ---
  const handleGenerateAnalysis = async () => {
    if (userCoins < COIN_COST) {
      alert(`Insufficient coins! You need ${COIN_COST} coins. Current balance: ${userCoins}`);
      return;
    }

    // ─── UPLOAD MODE ───
    if (sourceMode === "upload") {
      if (uploadedPapers.length === 0) {
        alert("Please upload at least one question PDF or document first!");
        return;
      }
      if (allUploadedQuestions.length === 0) {
        alert("No questions detected from the uploaded document(s). Please check the file or upload another question paper.");
        return;
      }

      setIsAnalyzing(true);
      setActionMessage("Analyzing historical exam years, detecting repetitions, and forecasting with Gemini AI...");

      const targetSubject = uploadSubject.trim() || uploadedPapers[0]?.name.replace(/\.[^/.]+$/, "") || "Selected Subject";

      try {
        let backendResult: any = null;
        try {
          const res = await api.analyzeQuestionsWithAI({
            educationLevel: uploadLevel,
            subject: targetSubject,
            questions: allUploadedQuestions,
            documents: uploadedPapers.map((p) => ({
              name: p.name,
              text: p.text,
              ...(p.detectedYear ? { year: p.detectedYear } : {}),
            })),
            documentText: uploadedPapers.map((p) => `--- ${p.name} [Year: ${p.detectedYear || "Unknown"}] ---\n${p.text}`).join("\n\n"),
            requestedCount,
          });
          if (res?.success && res?.data) {
            backendResult = res.data;
          }
        } catch (err) {
          console.warn("Backend AI analysis fallback to client-side:", err);
        }

        let finalResult: AIQuestionAnalysisResult;

        if (backendResult?.predictedQuestionSet && backendResult.predictedQuestionSet.length > 0) {
          finalResult = addAIQuestionAnalysis({
            educationLevel: `${uploadLevel} (from ${uploadedPapers.length} question paper${uploadedPapers.length > 1 ? "s" : ""})`,
            subject: targetSubject,
            totalQuestionsAnalyzed: backendResult.totalQuestionsAnalyzed || allUploadedQuestions.length,
            requestedCount,
            detectedYears: backendResult.detectedYears || allDetectedYears,
            latestYear: backendResult.latestYear || "2023",
            upcomingPreparationYear: backendResult.upcomingPreparationYear || "2024",
            yearWiseDistribution: backendResult.yearWiseDistribution || [],
            frequentlyRepeatedQuestions: backendResult.frequentlyRepeatedQuestions || [],
            predictedQuestionSet: backendResult.predictedQuestionSet || [],
            uploadedDocumentsSummary: backendResult.uploadedDocumentsSummary || uploadedPapers.map((p) => ({ name: p.name, questionCount: p.questions.length, detectedYears: p.detectedYear ? [p.detectedYear] : [] })),
            analysisItems: backendResult.analysisItems || [],
            coinCost: COIN_COST,
          });
        } else {
          // Client-side fallback engine
          finalResult = performClientHistoricalAnalysis({
            subject: targetSubject,
            educationLevel: `${uploadLevel} (${uploadedPapers.length} papers)`,
            papers: uploadedPapers,
            requestedCount,
          });
        }

        // Deduct coins & update state
        updateCoins(-COIN_COST);
        addWalletEntry(`AI Question Prediction (${targetSubject})`, -COIN_COST);
        setUserCoins(getUser().coins);

        setAnalysisResult(finalResult);
        setPastAnalyses(getAIQuestionAnalyses());
        setActionMessage(
          `Successfully analyzed ${finalResult.totalQuestionsAnalyzed} questions across ${finalResult.detectedYears?.length || 1} year(s)! Target ${finalResult.upcomingPreparationYear} Exam Predicted Set Ready.`
        );
      } catch (err: any) {
        console.error("Analysis generation error:", err);
        alert(`Analysis failed: ${err.message || "Unknown error. Please try again."}`);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // ─── BANK MODE ───
    if (sourceMode === "bank") {
      if (!selectedSubjectData) return;
      if (totalQuestions === 0) {
        alert("Still not updated yet. No question papers have been uploaded to the database for this subject.");
        return;
      }

      setIsAnalyzing(true);
      setActionMessage("Analyzing question patterns with Gemini AI...");

      const questions = activeQuestions;
      const questionTexts = questions.map((q) => q.text);

      try {
        let backendResult: any = null;
        try {
          const levelData = levels.find((l) => l.id === selectedLevel);
          const deptData = departments.find((d) => d.id === selectedDepartment);
          const semData = semesters.find((s) => s.id === selectedSemester);

          const res = await api.analyzeQuestionsWithAI({
            educationLevel: levelData?.name || selectedLevel,
            department: deptData?.name,
            semester: semData?.name,
            subject: selectedSubjectData.name,
            questions: questionTexts,
            requestedCount,
          });
          if (res?.success && res?.data) {
            backendResult = res.data;
          }
        } catch (err) {
          console.warn("Backend question analysis API failed, running client-side:", err);
        }

        const levelData = levels.find((l) => l.id === selectedLevel);
        const deptData = departments.find((d) => d.id === selectedDepartment);
        const semData = semesters.find((s) => s.id === selectedSemester);

        let finalResult: AIQuestionAnalysisResult;

        if (backendResult?.predictedQuestionSet && backendResult.predictedQuestionSet.length > 0) {
          finalResult = addAIQuestionAnalysis({
            educationLevel: levelData?.name || selectedLevel,
            department: deptData?.name,
            semester: semData?.name,
            subject: selectedSubjectData.name,
            totalQuestionsAnalyzed: backendResult.totalQuestionsAnalyzed || questions.length,
            requestedCount,
            detectedYears: backendResult.detectedYears || [],
            latestYear: backendResult.latestYear || "2023",
            upcomingPreparationYear: backendResult.upcomingPreparationYear || "2024",
            yearWiseDistribution: backendResult.yearWiseDistribution || [],
            frequentlyRepeatedQuestions: backendResult.frequentlyRepeatedQuestions || [],
            predictedQuestionSet: backendResult.predictedQuestionSet || [],
            analysisItems: backendResult.analysisItems || [],
            coinCost: COIN_COST,
          });
        } else {
          finalResult = performClientHistoricalAnalysis({
            subject: selectedSubjectData.name,
            educationLevel: levelData?.name || selectedLevel,
            ...(deptData?.name ? { department: deptData.name } : {}),
            ...(semData?.name ? { semester: semData.name } : {}),
            rawQuestions: questions,
            requestedCount,
          });
        }

        updateCoins(-COIN_COST);
        addWalletEntry(`AI Question Prediction: ${selectedSubjectData.name}`, -COIN_COST);
        setUserCoins(getUser().coins);

        setAnalysisResult(finalResult);
        setPastAnalyses(getAIQuestionAnalyses());
        setActionMessage(
          `Analysis complete! ${finalResult.predictedQuestionSet?.length || requestedCount} predicted questions generated for ${finalResult.upcomingPreparationYear} Exam.`
        );
      } catch (err: any) {
        console.error("Bank analysis error:", err);
        alert(`Analysis failed: ${err.message || "Unknown error."}`);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleDownload = () => {
    if (!analysisResult) return;
    const lines = [
      `=============================================================`,
      `BRAIN NEST — AI QUESTION ANALYSIS & PREDICTION REPORT`,
      `=============================================================`,
      `Target Upcoming Exam: ${analysisResult.upcomingPreparationYear || "Upcoming"} Exam Preparation Set`,
      `Subject: ${analysisResult.subject}`,
      `Education Level: ${analysisResult.educationLevel}`,
      analysisResult.department ? `Department: ${analysisResult.department}` : null,
      analysisResult.semester ? `Semester: ${analysisResult.semester}` : null,
      `Historical Years Analyzed: ${analysisResult.detectedYears?.join(", ") || "Multiple Years"}`,
      `Latest Available Paper Year: ${analysisResult.latestYear || "N/A"}`,
      `Total Questions Analyzed: ${analysisResult.totalQuestionsAnalyzed}`,
      `Date Generated: ${new Date(analysisResult.generatedAt).toLocaleString()}`,
      `=============================================================\n`,
      `--- FREQUENTLY REPEATED QUESTIONS ACROSS YEARS ---`,
      ...(analysisResult.frequentlyRepeatedQuestions || []).map(
        (r, i) => `${i + 1}. [Appeared ${r.repetitionCount}x in ${r.years.join(", ") || "Multiple Years"}] (Weight: ${r.recurrenceWeight}%)\n   ${r.question}\n`
      ),
      `\n=============================================================`,
      `--- ${analysisResult.upcomingPreparationYear || "UPCOMING"} PREDICTED QUESTION SET (${analysisResult.predictedQuestionSet?.length || analysisResult.requestedCount} QUESTIONS) ---`,
      `=============================================================`,
      ...(analysisResult.predictedQuestionSet || []).map((item) =>
        `#${item.rank} [${item.category}] [Importance: ${item.importance}] [Score: ${item.probabilityScore}%] [Topic: ${item.topic}]\n` +
        `Question: ${item.question}\n` +
        `Forecast Rationale: ${item.rationale}\n` +
        (item.modelAnswerHint ? `Solution Key Points:\n${item.modelAnswerHint}\n` : "") +
        `-------------------------------------------------------------`
      ),
    ].filter(Boolean);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analysisResult.subject.replace(/\s+/g, "_")}_${analysisResult.upcomingPreparationYear || "2024"}_Exam_Predicted_Set.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canGenerate = sourceMode === "upload"
    ? allUploadedQuestions.length > 0 && !isAnalyzing && !isExtracting
    : Boolean(selectedSubject && totalQuestions > 0 && !isAnalyzing && !isLoadingDb);

  const importanceBadge = (importance: string) => {
    switch (importance) {
      case "Critical":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "Very High":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "High":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    }
  };

  // Filtered predicted questions list based on tab
  const displayedPredictedQuestions = useMemo(() => {
    if (!analysisResult?.predictedQuestionSet) return [];
    if (predictionTabFilter === "repeated") {
      return analysisResult.predictedQuestionSet.filter((q) => q.category === "Frequently Repeated");
    }
    if (predictionTabFilter === "trend") {
      return analysisResult.predictedQuestionSet.filter((q) => q.category === "Trend-Based Prediction");
    }
    return analysisResult.predictedQuestionSet;
  }, [analysisResult, predictionTabFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/30 flex items-center gap-1">
                <Brain className="h-3 w-3" /> Historical Analysis & Prediction
              </span>
              <span className="text-xs text-muted-foreground">• 20 Study Coins</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              AI Question Analysis & Prediction
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              Extract all questions across historical exam years, identify frequently repeated questions, and generate high-yield predicted question sets for your upcoming exam.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link
              to="/dashboard/wallet"
              className="panel px-3.5 py-2 flex items-center gap-2 hover:border-primary/40 transition text-xs font-semibold"
            >
              <Coins className="h-4 w-4 text-amber-400" />
              <span>{userCoins} Coins</span>
            </Link>
          </div>
        </div>

        {/* Action message banner */}
        {actionMessage && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 shrink-0 text-primary animate-pulse" />
              <span className="truncate">{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-primary hover:text-foreground p-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Source Selection & Parameters */}
          <div className="lg:col-span-5 space-y-4">
            {/* Mode Switcher */}
            <div className="panel p-1.5 flex gap-1 bg-muted/40 border-border/60">
              <button
                type="button"
                onClick={() => setSourceMode("upload")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  sourceMode === "upload"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload Question Papers
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("bank")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  sourceMode === "bank"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookMarked className="h-3.5 w-3.5" /> Database Question Bank
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODE 1: MULTI-PDF UPLOAD MODE */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {sourceMode === "upload" && (
              <div className="space-y-4">
                {/* Upload Zone */}
                <div className="panel p-5 space-y-4 border-border/80">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-primary" />
                      1. Upload Past Question Papers
                    </h2>
                    {uploadedPapers.length > 0 && (
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
                        {uploadedPapers.length} paper{uploadedPapers.length > 1 ? "s" : ""} added
                      </span>
                    )}
                  </div>

                  {/* Drag and Drop Box */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? "border-primary bg-primary/10 scale-[0.99]"
                        : "border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-card/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {isExtracting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {isExtracting ? "Extracting questions & years..." : "Click or drag past question papers here"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Upload multiple PDFs (e.g. 2021, 2022, 2023 papers) · Instant Year Detection
                      </p>
                    </div>
                  </div>

                  {/* Pick from library toggle */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                      className="text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <Paperclip className="h-3 w-3" /> Select from Library ({libraryFiles.length})
                    </button>
                    {uploadedPapers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUploadedPapers([])}
                        className="text-muted-foreground hover:text-destructive flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="h-3 w-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {/* Library Picker Modal/Drawer */}
                  {showLibraryPicker && (
                    <div className="panel p-3 border-primary/30 bg-muted/40 space-y-2 rounded-xl animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <span className="text-xs font-bold text-foreground">Choose Saved Question Paper</span>
                        <button
                          type="button"
                          onClick={() => setShowLibraryPicker(false)}
                          className="text-muted-foreground hover:text-foreground text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      {libraryFiles.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground py-2 text-center">No files saved in library yet.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {libraryFiles.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleSelectLibraryFile(f)}
                              className="w-full text-left p-1.5 rounded hover:bg-primary/10 text-xs flex items-center justify-between transition"
                            >
                              <span className="truncate font-medium text-foreground">{f.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{f.subject || "PDF"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Uploaded Papers List */}
                  {uploadedPapers.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <p className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Uploaded Papers ({uploadedPapers.length})</span>
                        <span className="font-mono text-primary text-[11px]">{allUploadedQuestions.length} Total Questions</span>
                      </p>

                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {uploadedPapers.map((paper) => (
                          <div
                            key={paper.id}
                            className="rounded-lg border border-border/70 bg-card p-2.5 flex items-center justify-between gap-2 shadow-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="text-xs font-semibold text-foreground truncate">{paper.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span>{paper.size}</span>
                                <span>•</span>
                                <span className="font-mono text-primary font-medium">{paper.questions.length} questions</span>
                                {paper.detectedYear && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.2 rounded font-bold">
                                      {paper.detectedYear} Exam
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePaper(paper.id)}
                              className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                              title="Remove this paper"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Detected Years Bar */}
                      {allDetectedYears.length > 0 && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 text-xs flex items-center justify-between">
                          <span className="text-muted-foreground font-medium text-[11px]">Years Identified:</span>
                          <div className="flex flex-wrap gap-1">
                            {allDetectedYears.map((yr) => (
                              <span
                                key={yr}
                                className="bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded font-mono font-bold text-[10px]"
                              >
                                {yr}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subject Name Input */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-foreground">
                      Subject / Course Name:
                    </label>
                    <input
                      type="text"
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      placeholder="e.g. Physics, Biology, Digital Image Processing"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Question Count Selection */}
                {uploadedPapers.length > 0 && (
                  <div className="panel p-5 space-y-4 border-primary/20 shadow-md">
                    <h2 className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Target className="h-4 w-4 text-primary" />
                      2. Choose Predicted Question Count
                    </h2>

                    <div className="grid grid-cols-4 gap-2">
                      {QUESTION_COUNT_OPTIONS.map((count) => {
                        const isSelected = requestedCount === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setRequestedCount(count)}
                            className={`rounded-xl border p-2.5 text-center transition cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30 text-primary"
                                : "border-border hover:border-primary/40 bg-card/60 text-foreground"
                            }`}
                          >
                            <span className="text-base font-bold font-mono block">{count}</span>
                            <span className="text-[10px] text-muted-foreground">Questions</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleGenerateAnalysis}
                      disabled={!canGenerate}
                      className="w-full rounded-xl btn-primary py-3 text-xs font-bold shadow-glow hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                          <span>Analyzing Historical Years & Predicting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate {requestedCount} Predicted Questions ({COIN_COST} coins)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODE 2: DATABASE QUESTION BANK MODE */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {sourceMode === "bank" && (
              <div className="space-y-4">
                {/* Step 1: Education Level */}
                <div className="panel p-5 space-y-4 border-border/80">
                  <h2 className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    1. Select Education Level
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {levels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setSelectedLevel(level.id)}
                        className={`rounded-xl border p-2 text-center transition ${
                          selectedLevel === level.id
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 bg-card/60"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground block">{level.name}</span>
                        {selectedLevel === level.id && (
                          <Check className="h-3.5 w-3.5 text-primary mx-auto mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2 (Optional): Department for BSc */}
                {hasDepartments && (
                  <div className="panel p-5 space-y-4 border-border/80">
                    <h2 className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      2. Select Department
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {departments.map((dept) => (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setSelectedDepartment(dept.id)}
                          className={`rounded-xl border p-2 text-center transition ${
                            selectedDepartment === dept.id
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-border hover:border-primary/40 bg-card/60"
                          }`}
                        >
                          <span className="text-xs font-bold text-foreground">{dept.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3 (Optional): Semester for BSc */}
                {hasDepartments && selectedDepartment && semesters.length > 0 && (
                  <div className="panel p-5 space-y-4 border-border/80">
                    <h2 className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      3. Select Semester
                    </h2>
                    <div className="grid grid-cols-4 gap-2">
                      {semesters.map((sem) => (
                        <button
                          key={sem.id}
                          type="button"
                          onClick={() => setSelectedSemester(sem.id)}
                          className={`rounded-xl border p-2 text-center transition ${
                            selectedSemester === sem.id
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-border hover:border-primary/40 bg-card/60"
                          }`}
                        >
                          <span className="text-xs font-bold text-foreground">{sem.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step N: Subject Selection */}
                {subjects.length > 0 && (
                  <div className="panel p-5 space-y-4 border-border/80">
                    <h2 className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                      <BookMarked className="h-4 w-4 text-primary" />
                      {hasDepartments ? "4. Select Subject" : "2. Select Subject"}
                      <span className="ml-auto text-[10px] font-mono text-primary">{subjects.length} Available</span>
                    </h2>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {subjects.map((subj) => {
                        const isCurrent = selectedSubject === subj.id;
                        return (
                          <button
                            key={subj.id}
                            type="button"
                            onClick={() => setSelectedSubject(subj.id)}
                            className={`w-full rounded-lg border p-2.5 text-left transition flex items-center justify-between ${
                              isCurrent
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/60 hover:border-primary/40 bg-card/60"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">
                                {subj.name}
                                {subj.nameBn && <span className="text-muted-foreground font-normal ml-1">({subj.nameBn})</span>}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {isCurrent ? (
                                  isLoadingDb ? (
                                    <span className="inline-flex items-center gap-1 text-primary">
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking question papers...
                                    </span>
                                  ) : totalQuestions > 0 ? (
                                    <span className="text-primary font-medium">
                                      <Hash className="h-2.5 w-2.5 inline mr-0.5" />
                                      {totalQuestions} questions available
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/80 font-medium">
                                      Still not updated yet
                                    </span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground/60">
                                    Click to check questions
                                  </span>
                                )}
                              </div>
                            </div>
                            {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State when no questions exist in DB */}
                {selectedSubject && !isLoadingDb && totalQuestions === 0 && (
                  <div className="panel p-6 text-center space-y-3 border-border/80 bg-card/40 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground">
                      <FolderOpen className="h-6 w-6 text-muted-foreground/70" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">Still not updated yet.</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        No official question papers have been uploaded to the database for {selectedSubjectData?.name || "this subject"} yet.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSourceMode("upload");
                          if (selectedSubjectData) {
                            setUploadSubject(selectedSubjectData.name);
                          }
                        }}
                        className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload Past Question Papers
                      </button>
                    </div>
                  </div>
                )}

                {/* Question Count & Generate for Bank Mode */}
                {selectedSubject && !isLoadingDb && totalQuestions > 0 && (
                  <div className="panel p-5 space-y-4 border-primary/20 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
                    <h2 className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Target className="h-4 w-4 text-primary" />
                      {hasDepartments ? "5" : "3"}. Choose Predicted Question Count
                    </h2>

                    <div className="grid grid-cols-4 gap-2">
                      {QUESTION_COUNT_OPTIONS.map((count) => {
                        const isSelected = requestedCount === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setRequestedCount(count)}
                            className={`rounded-xl border p-2.5 text-center transition cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30 text-primary"
                                : "border-border hover:border-primary/40 bg-card/60 text-foreground"
                            }`}
                          >
                            <span className="text-base font-bold font-mono block">{count}</span>
                            <span className="text-[10px] text-muted-foreground">Questions</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleGenerateAnalysis}
                      disabled={!canGenerate}
                      className="w-full rounded-xl btn-primary py-3 text-xs font-bold shadow-glow hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                          <span>Forecasting Exam Questions...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate {requestedCount} Predicted Questions ({COIN_COST} coins)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Past Analyses Drawer */}
            {pastAnalyses.length > 0 && (
              <div className="panel p-4 space-y-2 border-border/60">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Recent Analyses & Predictions ({pastAnalyses.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {pastAnalyses.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAnalysisResult(a)}
                      className="w-full text-left p-2 rounded-lg border border-border/40 hover:border-primary/40 bg-card/40 hover:bg-card text-xs transition"
                    >
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span className="truncate">{a.subject}</span>
                        <span className="text-[10px] text-primary font-mono font-bold">
                          {a.upcomingPreparationYear || "Exam"} Set
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {a.totalQuestionsAnalyzed} questions · {new Date(a.generatedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* Right Column: Historical Analysis & Smart Prediction Dashboard */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7">
            {analysisResult ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* 1. PROMINENT UPCOMING EXAM YEAR HEADER */}
                <div className="panel p-6 border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-primary px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-primary-foreground uppercase tracking-wide flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Target Exam
                        </span>
                        <span className="text-xs font-mono font-bold text-primary">
                          Historical Analysis ({analysisResult.detectedYears?.join(", ") || "Multi-Year"})
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                        {analysisResult.upcomingPreparationYear || "Upcoming"} Exam Preparation – AI Predicted Question Set
                      </h2>

                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                        Deep historical pattern synthesis of <strong>{analysisResult.totalQuestionsAnalyzed} questions</strong> from {analysisResult.detectedYears?.length || "past"} exam sessions. The questions below combine recurring historical essentials with high-probability upcoming exam forecasts.
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <button
                        onClick={handleDownload}
                        className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-sm shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Prep Sheet (.txt)
                      </button>
                      <button
                        onClick={handleCopyAllPredicted}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition p-1"
                      >
                        {copiedId === "all-predicted" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Copied All Questions!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy className="h-3.5 w-3.5" /> Copy All Questions
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. STATS & YEARS METRICS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border/50">
                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                      <div className="text-lg font-black text-foreground font-mono">
                        {analysisResult.totalQuestionsAnalyzed}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                        Questions Analyzed
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                      <div className="text-lg font-black text-primary font-mono">
                        {analysisResult.detectedYears?.length || 1}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                        Years Covered
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                      <div className="text-lg font-black text-sky-400 font-mono">
                        {analysisResult.latestYear || "N/A"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                        Latest Paper Year
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center">
                      <div className="text-lg font-black text-primary font-mono">
                        {analysisResult.upcomingPreparationYear || "Target"}
                      </div>
                      <div className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mt-0.5">
                        Upcoming Target
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. HISTORICAL YEAR-WISE DISTRIBUTION VISUAL */}
                {analysisResult.yearWiseDistribution && analysisResult.yearWiseDistribution.length > 0 && (
                  <div className="panel p-5 border-border/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Historical Year-Wise Question Distribution
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        {analysisResult.detectedYears?.join(" → ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {analysisResult.yearWiseDistribution.map((item) => (
                        <div
                          key={item.year}
                          className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-center space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-foreground">{item.year} Exam</span>
                            <span className="font-mono text-primary text-[10px] font-semibold">{item.questionCount} Qs</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(10, item.percentage)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground block text-right">
                            {item.percentage}% share
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. FREQUENTLY REPEATED QUESTIONS SECTION */}
                {analysisResult.frequentlyRepeatedQuestions && analysisResult.frequentlyRepeatedQuestions.length > 0 && (
                  <div className="panel p-5 border-border/80 space-y-3 bg-card/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-amber-400" />
                        <h3 className="text-xs font-bold text-foreground">
                          Frequently Repeated Core Questions ({analysisResult.frequentlyRepeatedQuestions.length})
                        </h3>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          Multi-Year Recurrence
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRepeatedSection(!showRepeatedSection)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                      >
                        {showRepeatedSection ? "Collapse" : "Expand"}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRepeatedSection ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {showRepeatedSection && (
                      <div className="space-y-2.5 pt-1">
                        {analysisResult.frequentlyRepeatedQuestions.slice(0, 6).map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border/70 bg-background/80 p-3.5 space-y-2 hover:border-amber-500/40 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                                  Appeared {item.repetitionCount}x
                                </span>
                                {item.years.length > 0 && (
                                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    Years: {item.years.join(", ")}
                                  </span>
                                )}
                                <span className="text-[10px] bg-accent/40 text-muted-foreground px-2 py-0.5 rounded">
                                  {item.primaryTopic}
                                </span>
                              </div>

                              <button
                                onClick={() => handleCopy(item.question, `rep-${idx}`)}
                                className="p-1 hover:text-primary text-muted-foreground transition"
                                title="Copy question"
                              >
                                {copiedId === `rep-${idx}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            <p className="text-xs text-foreground font-semibold leading-relaxed">
                              {item.question}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. PREDICTED QUESTION SET ({requestedCount} Questions) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Predicted Question Set for {analysisResult.upcomingPreparationYear || "Upcoming"} Exam
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Showing top {displayedPredictedQuestions.length} exam-forecasted questions ranked by probability.
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPredictionTabFilter("all")}
                        className={`px-2.5 py-1 rounded font-medium transition ${
                          predictionTabFilter === "all"
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All ({analysisResult.predictedQuestionSet?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPredictionTabFilter("repeated")}
                        className={`px-2.5 py-1 rounded font-medium transition ${
                          predictionTabFilter === "repeated"
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Repeated ({analysisResult.predictedQuestionSet?.filter((q) => q.category === "Frequently Repeated").length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPredictionTabFilter("trend")}
                        className={`px-2.5 py-1 rounded font-medium transition ${
                          predictionTabFilter === "trend"
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Trend-Based ({analysisResult.predictedQuestionSet?.filter((q) => q.category === "Trend-Based Prediction").length || 0})
                      </button>
                    </div>
                  </div>

                  {/* Individual Question Cards */}
                  <div className="space-y-3">
                    {displayedPredictedQuestions.map((item, idx) => (
                      <div
                        key={item.rank || idx}
                        className="panel p-4 border-border/50 hover:border-primary/40 transition space-y-3 shadow-xs bg-card"
                      >
                        {/* Header: Rank, Category, Importance, Probability */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary text-xs font-bold font-mono flex items-center justify-center shrink-0">
                              #{item.rank}
                            </span>

                            {/* Category Badge */}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                item.category === "Frequently Repeated"
                                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                  : "bg-teal-500/15 text-teal-400 border-teal-500/30"
                              }`}
                            >
                              {item.category === "Frequently Repeated" ? (
                                <span className="flex items-center gap-1">
                                  <Flame className="h-2.5 w-2.5" /> Frequently Repeated ({item.repetitionCount}x)
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-2.5 w-2.5" /> Trend Forecast ({item.predictedForYear})
                                </span>
                              )}
                            </span>

                            {/* Importance Pill */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${importanceBadge(item.importance)}`}>
                              {item.importance}
                            </span>

                            {/* Probability Score */}
                            <span className="text-[10px] font-mono text-primary font-bold">
                              {item.probabilityScore}% Probability
                            </span>
                          </div>

                          <button
                            onClick={() => handleCopy(item.question, `pred-q-${idx}`)}
                            className="p-1 hover:text-primary text-muted-foreground transition shrink-0"
                            title="Copy question text"
                          >
                            {copiedId === `pred-q-${idx}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Question Text */}
                        <p className="text-xs sm:text-sm text-foreground font-semibold leading-relaxed whitespace-pre-wrap">
                          {item.question}
                        </p>

                        {/* Meta Tags: Topic, Format, Historical Years */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                            Topic: {item.topic}
                          </span>
                          {item.examFormat && (
                            <span className="bg-accent/40 text-muted-foreground px-2 py-0.5 rounded-md">
                              Format: {item.examFormat}
                            </span>
                          )}
                          {item.historicalYears && item.historicalYears.length > 0 && (
                            <span className="text-muted-foreground font-mono flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              Past Years: {item.historicalYears.join(", ")}
                            </span>
                          )}
                        </div>

                        {/* Forecast Rationale Box */}
                        <div className="rounded-lg bg-accent/20 border border-border/40 p-2.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-primary mr-1">Forecast Rationale:</span>
                          {item.rationale}
                        </div>

                        {/* Full Marks Model Solution Hint */}
                        {item.modelAnswerHint && (
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-[11px] text-foreground/90">
                            <span className="font-semibold text-primary mr-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 inline" /> Full Marks Solution Points:
                            </span>
                            <span className="text-muted-foreground">{item.modelAnswerHint}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="panel p-10 flex flex-col items-center justify-center text-center min-h-[460px] bg-card/30 border-border/60">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  {sourceMode === "bank" && selectedSubject && !isLoadingDb && totalQuestions === 0 ? (
                    <FolderOpen className="h-8 w-8 text-muted-foreground/70" />
                  ) : (
                    <Brain className="h-8 w-8 text-primary/60" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {sourceMode === "bank" && selectedSubject && !isLoadingDb && totalQuestions === 0
                    ? "Still not updated yet."
                    : "Question Analysis & Prediction Results"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                  {sourceMode === "upload"
                    ? uploadedPapers.length === 0
                      ? "Upload one or more past question papers (PDF, DOCX) on the left panel to begin multi-year historical analysis."
                      : "Select how many predicted questions you want (5, 10, 15, or 20) and click Generate Analysis."
                    : !selectedLevel
                      ? "Start by selecting your education level on the left panel."
                      : !selectedSubject
                        ? "Continue selecting your department, semester and subject to see available questions."
                        : isLoadingDb
                          ? "Loading questions from database..."
                          : totalQuestions === 0
                            ? "No question papers have been uploaded to the database for this subject yet. Upload past question papers on the left to analyze."
                            : "Choose your desired predicted question count and click Generate Analysis to forecast upcoming questions."
                  }
                </p>

                {sourceMode === "bank" && selectedSubject && !isLoadingDb && totalQuestions === 0 ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceMode("upload");
                        if (selectedSubjectData) {
                          setUploadSubject(selectedSubjectData.name);
                        }
                      }}
                      className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload Question Papers to Predict Now
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-1 text-xs text-primary animate-pulse">
                    <ArrowRight className="h-3.5 w-3.5" />
                    {sourceMode === "upload"
                      ? uploadedPapers.length === 0
                        ? "Upload papers on the left to start"
                        : "Click Generate to forecast questions"
                      : !selectedSubject
                        ? "Complete the selection on the left"
                        : totalQuestions > 0
                          ? "Click Generate to begin"
                          : "Subject not updated yet"
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Client-Side Historical Analysis & Prediction Engine ──────────────
function performClientHistoricalAnalysis(params: {
  subject: string;
  educationLevel: string;
  department?: string | undefined;
  semester?: string | undefined;
  papers?: UploadedQuestionPaper[] | undefined;
  rawQuestions?: QuestionBankQuestion[] | undefined;
  requestedCount: 5 | 10 | 15 | 20;
}): AIQuestionAnalysisResult {
  const { subject, educationLevel, department, semester, papers, rawQuestions, requestedCount } = params;

  // 1. Gather all questions
  const allQs: Array<{ text: string; year: string | undefined; topic?: string | undefined }> = [];

  if (papers && papers.length > 0) {
    papers.forEach((p) => {
      p.questions.forEach((q) => {
        allQs.push({
          text: q,
          year: detectYearFromText(q) || p.detectedYear,
        });
      });
    });
  } else if (rawQuestions && rawQuestions.length > 0) {
    rawQuestions.forEach((q) => {
      allQs.push({
        text: q.text,
        year: q.year || detectYearFromText(q.text),
      });
    });
  }

  // 2. Identify years
  const yearSet = new Set<string>();
  allQs.forEach((q) => {
    if (q.year && /^\d{4}$/.test(q.year)) yearSet.add(q.year);
  });
  let detectedYears = Array.from(yearSet).sort();
  if (detectedYears.length === 0) {
    const curYear = new Date().getFullYear();
    detectedYears = [String(curYear - 3), String(curYear - 2), String(curYear - 1)];
    allQs.forEach((q, idx) => {
      q.year = detectedYears[idx % detectedYears.length]!;
    });
  }

  const latestYear = detectedYears[detectedYears.length - 1] || String(new Date().getFullYear() - 1);
  const upcomingPreparationYear = String((parseInt(latestYear, 10) || new Date().getFullYear()) + 1);

  // 3. Year distribution
  const yearCountMap: Record<string, number> = {};
  detectedYears.forEach((y) => (yearCountMap[y] = 0));
  allQs.forEach((q) => {
    if (q.year && yearCountMap[q.year] !== undefined) {
      yearCountMap[q.year] = (yearCountMap[q.year] || 0) + 1;
    }
  });

  const yearWiseDistribution: YearAnalysisStat[] = detectedYears.map((yr) => ({
    year: yr,
    questionCount: yearCountMap[yr] || 0,
    percentage: allQs.length > 0 ? Math.round(((yearCountMap[yr] || 0) / allQs.length) * 100) : 0,
  }));

  // 4. Tokenization & similarity clustering for repetition detection
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s\u0980-\u09FF]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const clusters: Array<{
    canonical: string;
    tokens: Set<string>;
    years: Set<string>;
    count: number;
    topic: string;
  }> = [];

  for (const q of allQs) {
    const clean = q.text.replace(/^[0-9Q\.\:\-\s]+/i, "").trim();
    const tokens = new Set(tokenize(clean));

    let found = clusters.find((c) => {
      let common = 0;
      tokens.forEach((t) => { if (c.tokens.has(t)) common++; });
      const union = new Set([...c.tokens, ...tokens]).size;
      return union > 0 && common / union >= 0.5;
    });

    if (found) {
      found.count++;
      if (q.year) found.years.add(q.year);
      tokens.forEach((t) => found!.tokens.add(t));
    } else {
      const ys = new Set<string>();
      if (q.year) ys.add(q.year);
      clusters.push({
        canonical: clean.length > 15 ? clean : q.text,
        tokens,
        years: ys,
        count: 1,
        topic: `${subject} Core Principles`,
      });
    }
  }

  clusters.sort((a, b) => b.count - a.count);

  const frequentlyRepeatedQuestions: RepeatedQuestionStat[] = clusters.map((c) => ({
    question: c.canonical,
    repetitionCount: c.count,
    years: Array.from(c.years).sort(),
    recurrenceWeight: Math.min(99, 72 + c.count * 8 + c.years.size * 4),
    primaryTopic: c.topic,
    isHighPriority: c.count >= 2 || c.years.size >= 2,
  }));

  // 5. Build predicted question set (exact requestedCount items)
  const predictedQuestionSet: AIPredictedQuestionItem[] = [];
  const used = new Set<string>();

  // Take top repeated questions first
  for (const rep of frequentlyRepeatedQuestions) {
    if (predictedQuestionSet.length >= Math.ceil(requestedCount * 0.6)) break;
    const key = rep.question.slice(0, 40).toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      const prob = Math.min(98, 88 + rep.repetitionCount * 3);
      predictedQuestionSet.push({
        rank: predictedQuestionSet.length + 1,
        question: rep.question,
        category: "Frequently Repeated",
        importance: rep.repetitionCount >= 3 ? "Critical" : "Very High",
        repetitionCount: rep.repetitionCount,
        historicalYears: rep.years.length > 0 ? rep.years : detectedYears.slice(-2),
        predictedForYear: upcomingPreparationYear,
        topic: rep.primaryTopic,
        probabilityScore: prob,
        rationale: `Appeared in ${rep.repetitionCount} historical exam sessions (${rep.years.join(", ") || "Past Years"}). Heavy examiner preference indicates mandatory preparation for ${upcomingPreparationYear}.`,
        examFormat: "CQ / Broad Problem",
        modelAnswerHint: "State exact definition, write governing formula with SI units, and address edge conditions.",
      });
    }
  }

  // Fill remaining slots with trend questions
  for (const q of allQs) {
    if (predictedQuestionSet.length >= requestedCount) break;
    const key = q.text.slice(0, 40).toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      const idx = predictedQuestionSet.length;
      const prob = Math.max(68, 92 - idx * 2);
      predictedQuestionSet.push({
        rank: idx + 1,
        question: q.text,
        category: "Trend-Based Prediction",
        importance: prob >= 90 ? "Critical" : prob >= 80 ? "Very High" : "High",
        repetitionCount: 1,
        historicalYears: q.year ? [q.year] : detectedYears.slice(-1),
        predictedForYear: upcomingPreparationYear,
        topic: q.topic || `${subject} Core Principles`,
        probabilityScore: prob,
        rationale: `Core curriculum question identified from ${q.year || "recent sessions"}. Fits the cyclical pattern expected for ${upcomingPreparationYear}.`,
        examFormat: "CQ / Broad Problem",
        modelAnswerHint: "Provide step-by-step reasoning and emphasize analytical boundary conditions.",
      });
    }
  }

  const analysisItems: AIAnalyzedQuestion[] = predictedQuestionSet.map((pq, idx) => ({
    rank: idx + 1,
    question: pq.question,
    importance: pq.importance,
    frequencyCount: pq.repetitionCount,
    frequencyYears: pq.historicalYears,
    topics: [pq.topic],
    reason: pq.rationale,
    probabilityScore: pq.probabilityScore,
  }));

  return addAIQuestionAnalysis({
    educationLevel,
    department,
    semester,
    subject,
    totalQuestionsAnalyzed: allQs.length,
    requestedCount,
    detectedYears,
    latestYear,
    upcomingPreparationYear,
    yearWiseDistribution,
    frequentlyRepeatedQuestions,
    predictedQuestionSet,
    analysisItems,
    coinCost: COIN_COST,
  });
}
