import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getNotes, addNote, deleteNote, getUser,
  saveEditableDocument, getSelectedClass, setSelectedClass,
  type GeneratedNote
} from "@/lib/store";
import {
  DATABASE_CURRICULUM,
  hasClassDatabaseBooks,
  getDatabaseChaptersForSubject
} from "@/lib/curriculum";
import {
  NotebookPen, Sparkles, Copy, Download, Trash2, Check,
  BookOpen, Target, Zap, ArrowRight, Languages, FileText,
  AlertCircle, CheckCircle2, Bookmark, UploadCloud, FileUp,
  X, Search, RefreshCw, Printer, Edit3, ChevronRight, Layers
} from "lucide-react";

export const Route = createFileRoute("/dashboard/notes")({
  head: () => ({
    meta: [
      { title: "AI Note Generator — Brain Nest" },
      { name: "description", content: "Generate personalized, syllabus-focused study notes using your textbooks, academic resources, or uploaded PDF documents." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotesPage,
});

type StartMode = "database" | "upload";
type NoteDepth = "detailed" | "exam-ready" | "definitions" | "short";
type DifficultyLevel = "easy" | "medium" | "hard";
type LanguageMode = "both" | "bangla" | "english";

interface UploadedDocAnalysis {
  id?: string;
  name: string;
  fileType: string;
  sizeBytes: number;
  pageCount: number;
  isScanned: boolean;
  ocrApplied: boolean;
  language: string;
  charCount: number;
  wordCount: number;
  subject?: string;
  bookTitle?: string;
  chapters: Array<{
    id: string;
    chapterNumber: string;
    title: string;
    startPage: number;
    endPage: number;
    pageRange: string;
    subtopics: string[];
    snippet?: string;
  }>;
  allDetectedTopics: string[];
  extractedText: string;
  pages?: Array<{ pageNumber: number; text: string; charCount: number }>;
}

export function NotesPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User & Persisted notes
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [notes, setNotes] = useState<GeneratedNote[]>(() => getNotes());
  const [activeNote, setActiveNote] = useState<GeneratedNote | null>(() => (notes.length > 0 && notes[0] ? notes[0] : null));

  // Top Start Mode: Option A (database) vs Option B (upload)
  const [startMode, setStartMode] = useState<StartMode>("database");

  // --- Option A: Database-driven academic resources ---
  const [academicClasses, setAcademicClasses] = useState<Array<{ target_class: string; className: string; subjects: Array<{ name: string; docId: string; docName: string; totalChapters: number }> }>>([
    {
      target_class: "9-10",
      className: "Class 9-10 (SSC)",
      subjects: [
        { name: "Physics", docId: "7967a517-4b9b-4332-ba95-f9986be1cfdb", docName: "Physics pdf class 9-10 .pdf", totalChapters: 14 },
        { name: "Biology", docId: "02e130f9-9ee4-4537-bb61-521971e93424", docName: "Biology pdf class 9-10 com.pdf", totalChapters: 14 }
      ]
    }
  ]);
  const [selectedClass, setSelectedClassState] = useState<string>(() => getSelectedClass());
  const [selectedSubject, setSelectedSubject] = useState<string>("Physics");
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<string>("01");
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>("");

  const handleSelectClass = (cls: string) => {
    setSelectedClassState(cls);
    setSelectedClass(cls);
    if (cls === "9-10") {
      setSelectedSubject("Physics");
      setSelectedChapterNumber("01");
    } else {
      setSelectedSubject("");
      setSelectedChapterNumber("");
    }
  };

  // Sync external class change events across navigation
  useEffect(() => {
    const onClassChange = (e: any) => {
      const cls = e.detail?.classLevel;
      if (cls && cls !== selectedClass) {
        setSelectedClassState(cls);
      }
    };
    window.addEventListener("bn_class_changed", onClassChange);
    return () => window.removeEventListener("bn_class_changed", onClassChange);
  }, [selectedClass]);

  // --- Option B: Uploaded PDF / Document ---
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocAnalysis | null>(null);
  const [uploadedSubject, setUploadedSubject] = useState<string>("");
  const [uploadedChapterSearch, setUploadedChapterSearch] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedUploadedChapterId, setSelectedUploadedChapterId] = useState<string>("entire");
  const [customTopicInput, setCustomTopicInput] = useState<string>("");

  // --- Common Customization Controls ---
  const [noteDepth, setNoteDepth] = useState<NoteDepth>("detailed");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [language, setLanguage] = useState<LanguageMode>("both");
  const [customInstructions, setCustomInstructions] = useState<string>("");

  // --- Generation & UI States ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);

  // Fetch official database academic resources on mount
  useEffect(() => {
    let isMounted = true;
    api.getAcademicResources("9-10")
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data && res.data.length > 0) {
          setAcademicClasses(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote academic resources, using verified Class 9-10 database resources:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync user state periodically or after coin deduction
  const refreshUserData = () => {
    setCurrentUser(getUser());
  };

  // Class-based content visibility: Only Class 9-10 has preloaded database textbooks
  const isDbSupported = hasClassDatabaseBooks(selectedClass);

  // Available subjects for Option A: strictly Physics & Biology for Class 9-10; empty for HSC/BSc
  const availableSubjects = useMemo(() => {
    if (!isDbSupported) return [];
    const classData = academicClasses.find((c) => c.target_class === "9-10") || academicClasses[0];
    return classData?.subjects || [];
  }, [isDbSupported, academicClasses]);

  // Chapters list for Option A (strictly for Class 9-10 Physics/Biology)
  const curriculumChapters = useMemo(() => {
    if (!isDbSupported || !selectedSubject) return [];
    return getDatabaseChaptersForSubject("9-10", selectedSubject);
  }, [isDbSupported, selectedSubject]);

  // Filtered chapters in search
  const filteredChapters = useMemo(() => {
    if (!chapterSearchQuery.trim()) return curriculumChapters;
    const q = chapterSearchQuery.toLowerCase().trim();
    return curriculumChapters.filter(
      (ch) => ch.number.includes(q) || ch.en.toLowerCase().includes(q) || ch.bn.toLowerCase().includes(q)
    );
  }, [curriculumChapters, chapterSearchQuery]);

  // Currently selected chapter object in Option A
  const activeCurriculumChapter = useMemo(() => {
    return curriculumChapters.find((ch) => ch.number === selectedChapterNumber) || curriculumChapters[0];
  }, [curriculumChapters, selectedChapterNumber]);

  // Filtered chapters for Option B (Uploaded Document)
  const filteredUploadedChapters = useMemo(() => {
    if (!uploadedDoc?.chapters) return [];
    if (!uploadedChapterSearch.trim()) return uploadedDoc.chapters;
    const q = uploadedChapterSearch.toLowerCase().trim();
    return uploadedDoc.chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.chapterNumber.includes(q) ||
        (c.subtopics && c.subtopics.some((s) => s.toLowerCase().includes(q)))
    );
  }, [uploadedDoc?.chapters, uploadedChapterSearch]);

  // Handle file upload and AI deep analysis for Option B
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size exceeds 50MB. Please upload a smaller document.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();

    try {
      const res = await api.analyzeDocument(file);
      if (res.success && res.data) {
        const data = res.data;
        const analysis: UploadedDocAnalysis = {
          id: data.id,
          name: data.name || file.name,
          fileType: data.fileType || file.type,
          sizeBytes: data.sizeBytes || file.size,
          pageCount: data.pageCount || 1,
          isScanned: Boolean(data.isScanned),
          ocrApplied: Boolean(data.ocrApplied),
          language: data.language || "english",
          charCount: data.charCount || 0,
          wordCount: data.wordCount || 0,
          subject: data.subject,
          bookTitle: data.bookTitle,
          chapters: data.chapters || [],
          allDetectedTopics: data.allDetectedTopics || [],
          extractedText: data.extractedText || "",
          pages: data.pages || [],
        };

        const detectedSubjectName =
          data.bookTitle ||
          data.subject ||
          (data.chapters && data.chapters[0]?.title ? data.chapters[0].title.split(/[:(]/)[0].trim() : cleanBaseName);

        setUploadedSubject(detectedSubjectName);
        setUploadedDoc(analysis);
        setSelectedUploadedChapterId("entire");
        setCustomTopicInput("");
        setUploadedChapterSearch("");
        setIsUploading(false);
        return;
      }
    } catch (err: any) {
      console.warn("Backend document analysis notice, activating local fallback:", err);
    }

    // Client-side fallback if backend is slow, down, or large file
    try {
      let text = "";
      try {
        text = await file.text();
      } catch {
        text = "";
      }

      let estPages = Math.min(450, Math.max(1, Math.round(file.size / (65 * 1024))));
      const countMatch = text.match(/\/Count\s+(\d+)/);
      if (countMatch && countMatch[1]) {
        const cnt = parseInt(countMatch[1], 10);
        if (cnt >= 1 && cnt <= 650) estPages = cnt;
      }
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches && pageMatches.length >= 1 && pageMatches.length <= 650) {
        estPages = pageMatches.length;
      }

      const lowerName = file.name.toLowerCase();
      const lowerText = text.slice(0, 8000).toLowerCase();

      let detectedChapters: Array<{
        id: string;
        chapterNumber: string;
        title: string;
        startPage: number;
        endPage: number;
        pageRange: string;
        subtopics: string[];
        snippet?: string;
      }> = [];
      let detectedBook = cleanBaseName;

      // 1. Biology match
      if (lowerName.includes("bio") || lowerText.includes("biology") || lowerText.includes("জীববিজ্ঞান") || lowerText.includes("জীবন পাঠ")) {
        detectedBook = "Biology (জীববিজ্ঞান)";
        const bioChs = DATABASE_CURRICULUM["9-10"]["Biology"] || [];
        const pagesPerCh = Math.max(1, Math.floor(estPages / bioChs.length));
        detectedChapters = bioChs.map((c, i) => {
          const sPage = i * pagesPerCh + 1;
          const ePage = i === bioChs.length - 1 ? estPages : (i + 1) * pagesPerCh;
          return {
            id: `bio-ch-${c.id}`,
            chapterNumber: c.number,
            title: `${c.en} (${c.bn})`,
            startPage: sPage,
            endPage: ePage,
            pageRange: `pp. ${sPage}–${ePage}`,
            subtopics: ["Core Concepts", "Definitions", "Board Exam Focus"],
            snippet: `Textbook content for Chapter ${c.number}: ${c.en} (${c.bn})`,
          };
        });
      }
      // 2. Physics match
      else if (lowerName.includes("physic") || lowerText.includes("physics") || lowerText.includes("পদার্থ") || lowerText.includes("পদার্থবিজ্ঞান")) {
        detectedBook = "Physics (পদার্থবিজ্ঞান)";
        const phyChs = DATABASE_CURRICULUM["9-10"]["Physics"] || [];
        const pagesPerCh = Math.max(1, Math.floor(estPages / phyChs.length));
        detectedChapters = phyChs.map((c, i) => {
          const sPage = i * pagesPerCh + 1;
          const ePage = i === phyChs.length - 1 ? estPages : (i + 1) * pagesPerCh;
          return {
            id: `phy-ch-${c.id}`,
            chapterNumber: c.number,
            title: `${c.en} (${c.bn})`,
            startPage: sPage,
            endPage: ePage,
            pageRange: `pp. ${sPage}–${ePage}`,
            subtopics: ["Principles & Laws", "Formulas", "Numerical Applications"],
            snippet: `Textbook content for Chapter ${c.number}: ${c.en} (${c.bn})`,
          };
        });
      }
      // 3. Chemistry match
      else if (lowerName.includes("chem") || lowerText.includes("chemistry") || lowerText.includes("রসায়ন") || lowerText.includes("রসায়ন")) {
        detectedBook = "Chemistry (রসায়ন)";
        const chemChs = DATABASE_CURRICULUM["9-10"]["Chemistry"] || [];
        const pagesPerCh = Math.max(1, Math.floor(estPages / (chemChs.length || 1)));
        detectedChapters = chemChs.map((c, i) => {
          const sPage = i * pagesPerCh + 1;
          const ePage = i === chemChs.length - 1 ? estPages : (i + 1) * pagesPerCh;
          return {
            id: `chem-ch-${c.id}`,
            chapterNumber: c.number,
            title: `${c.en} (${c.bn})`,
            startPage: sPage,
            endPage: ePage,
            pageRange: `pp. ${sPage}–${ePage}`,
            subtopics: ["Chemical Reactions", "Periodic Properties", "Key Definitions"],
            snippet: `Textbook content for Chapter ${c.number}: ${c.en} (${c.bn})`,
          };
        });
      }
      // 4. Regex detection from text
      else {
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
          // 5. Logical multi-section breakdown
          const secCount = Math.min(8, Math.max(3, Math.ceil(estPages / 15)));
          const pagesPerSec = Math.max(1, Math.ceil(estPages / secCount));
          for (let i = 0; i < secCount; i++) {
            const sPage = i * pagesPerSec + 1;
            const ePage = Math.min(estPages, (i + 1) * pagesPerSec);
            detectedChapters.push({
              id: `sec-${i + 1}`,
              chapterNumber: String(i + 1).padStart(2, "0"),
              title: `${cleanBaseName} — Chapter / Section ${i + 1}`,
              startPage: sPage,
              endPage: ePage,
              pageRange: `pp. ${sPage}–${ePage}`,
              subtopics: ["Core Concepts", "Definitions", "Exam Focus"],
              snippet: text.slice(i * 1500, (i + 1) * 1500),
            });
          }
        }
      }

      setUploadedSubject(detectedBook);
      setUploadedDoc({
        name: file.name,
        fileType: file.type || "application/pdf",
        sizeBytes: file.size,
        pageCount: estPages,
        isScanned: text.length < 50,
        ocrApplied: false,
        language: /[\u0980-\u09FF]/.test(text) ? "bangla" : "english",
        charCount: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        subject: detectedBook,
        bookTitle: detectedBook,
        chapters: detectedChapters,
        allDetectedTopics: detectedChapters.map((c) => c.title),
        extractedText: text,
      });
      setSelectedUploadedChapterId("entire");
      setCustomTopicInput("");
      setUploadedChapterSearch("");
    } catch (fallbackErr: any) {
      setUploadError(fallbackErr?.message || "Failed to analyze document. Please check the file format and try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearUploadedFile = () => {
    setUploadedDoc(null);
    setUploadedSubject("");
    setSelectedUploadedChapterId("entire");
    setCustomTopicInput("");
    setUploadedChapterSearch("");
    setUploadError(null);
  };

  // Main Note Generation Function
  const handleGenerateNotes = async () => {
    setGenerationError(null);
    const cost = 20;

    if ((currentUser.coins ?? 0) < cost) {
      setGenerationError(`Insufficient coins! You need 20 coins to generate AI study notes, but your balance is ${currentUser.coins ?? 0} coins.`);
      return;
    }

    let targetSubject = "";
    let targetChapter = "";
    let fileId: string | undefined = undefined;
    let sourceText: string | undefined = undefined;
    let customPromptText = customInstructions.trim();

    if (startMode === "database") {
      // Option A: Database Curriculum
      if (!selectedSubject) {
        setGenerationError("Please select a subject.");
        return;
      }
      if (!activeCurriculumChapter) {
        setGenerationError("Please select a chapter from the list.");
        return;
      }

      targetSubject = selectedSubject;
      targetChapter = `${activeCurriculumChapter.en} (${activeCurriculumChapter.bn})`;
      const subjectDoc = availableSubjects.find((s) => s.name.toLowerCase() === selectedSubject.toLowerCase());
      fileId = subjectDoc?.docId;
    } else {
      // Option B: Uploaded PDF
      if (!uploadedDoc) {
        setGenerationError("Please upload a study document to continue.");
        return;
      }

      targetSubject = uploadedSubject.trim() || uploadedDoc.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");

      if (customTopicInput.trim()) {
        targetChapter = customTopicInput.trim();
      } else if (selectedUploadedChapterId === "entire") {
        targetChapter = "Entire Document Overview & Key Concepts";
      } else {
        const foundCh = uploadedDoc.chapters.find((c) => c.id === selectedUploadedChapterId);
        targetChapter = foundCh ? `${foundCh.title} (${foundCh.pageRange})` : "Document Study Notes";
      }

      fileId = uploadedDoc.id;

      // Extract context from selected uploaded chapter or entire doc
      if (selectedUploadedChapterId !== "entire") {
        const foundCh = uploadedDoc.chapters.find((c) => c.id === selectedUploadedChapterId);
        if (foundCh && uploadedDoc.pages && uploadedDoc.pages.length > 0) {
          const relPages = uploadedDoc.pages.filter(
            (p) => p.pageNumber >= foundCh.startPage && p.pageNumber <= foundCh.endPage
          );
          sourceText = relPages.map((p) => p.text).join("\n").trim();
        }
        if (!sourceText || sourceText.length < 50) {
          sourceText = foundCh?.snippet || uploadedDoc.extractedText;
        }
      } else {
        sourceText = uploadedDoc.extractedText;
      }
    }

    setIsGenerating(true);

    try {
      const res = await api.generateNotes({
        subject: targetSubject,
        chapter: targetChapter,
        fileId,
        difficulty,
        outputType: noteDepth,
        language,
        customPrompt: customPromptText || undefined,
        sourceText: sourceText ? sourceText.slice(0, 14000) : undefined,
      });

      let markdownContent = "";
      if (res.success && res.data) {
        markdownContent = typeof res.data.content === "string" ? res.data.content : JSON.stringify(res.data.content, null, 2);
      } else {
        const errorMsg = res.message || (typeof res.error === "string" ? res.error : res.error?.code) || "Unable to generate study notes. Please try again.";
        throw new Error(errorMsg);
      }

      // Add to store and deduct coins
      const createdNote = addNote({
        fileId,
        subject: targetSubject,
        chapter: targetChapter,
        difficulty: difficulty === "easy" ? "beginner" : difficulty === "hard" ? "advanced" : "intermediate",
        outputType: noteDepth,
        language,
        title: `${targetSubject}: ${targetChapter}`,
        content: markdownContent,
        coinCost: cost,
      });

      refreshUserData();
      setNotes(getNotes());
      setActiveNote(createdNote);
      setIsGenerating(false);
    } catch (err: any) {
      console.error("Notes generation error:", err);
      setGenerationError(err?.message || "Failed to generate study notes. Your coins were not deducted.");
      setIsGenerating(false);
    }
  };

  // Clipboard copy
  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown file
  const handleDownload = () => {
    if (!activeNote) return;
    const cleanTitle = activeNote.title.replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, "_");
    const blob = new Blob([activeNote.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanTitle}_Notes.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print notes
  const handlePrint = () => {
    window.print();
  };

  // Open note in Real-Time Editor
  const handleOpenInEditor = () => {
    if (!activeNote) return;
    saveEditableDocument({
      title: activeNote.title,
      content: activeNote.content,
      sourceType: "md",
      tags: [activeNote.subject, activeNote.chapter, "AI Notes"],
    });
    navigate({ to: "/dashboard/editor" });
  };

  // Delete note
  const handleDelete = (id: string) => {
    deleteNote(id);
    const updated = getNotes();
    setNotes(updated);
    if (activeNote?.id === id) {
      setActiveNote(updated.length > 0 && updated[0] ? updated[0] : null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Note Generator</h1>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  Syllabus Engine
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Generate personalized, syllabus-focused study notes using your textbooks, academic resources, or uploaded PDF documents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Uses:</span>
              <strong className="text-primary font-bold">20 Coins</strong>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">Balance:</span>
              <strong className="text-foreground">{currentUser.coins ?? 0}</strong>
            </div>

            {notes.length > 0 && (
              <button
                type="button"
                onClick={() => setViewHistory(!viewHistory)}
                className="rounded-xl border border-border/80 bg-card/60 hover:bg-card px-3 py-1.5 text-xs font-medium text-foreground transition flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Saved Notes ({notes.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Section: How do you want to start? */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            How do you want to start?
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Option A (Browse Academic Resources) */}
            <div
              onClick={() => setStartMode("database")}
              className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 flex items-start gap-3.5 ${
                startMode === "database"
                  ? "border-primary bg-primary/10 shadow-glow/10 ring-1 ring-primary"
                  : "border-border/70 bg-card/40 hover:bg-card/80 hover:border-border"
              }`}
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                  startMode === "database"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Browse Academic Resources</h3>
                  {startMode === "database" && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Official Class 9–10 NCTB curriculum & textbooks stored in database
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                    Class 9-10 (SSC)
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Physics & Biology
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Option B (Upload Your Own PDF) */}
            <div
              onClick={() => setStartMode("upload")}
              className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 flex items-start gap-3.5 ${
                startMode === "upload"
                  ? "border-primary bg-primary/10 shadow-glow/10 ring-1 ring-primary"
                  : "border-border/70 bg-card/40 hover:bg-card/80 hover:border-border"
              }`}
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                  startMode === "upload"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Upload Your Own PDF</h3>
                  {startMode === "upload" && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use your own PDF, lecture slides, college notes, or study guide
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    PDF, DOCX, PPTX, TXT
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                    Multimodal AI OCR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Notes History Drawer (Conditional) */}
        {viewHistory && notes.length > 0 && (
          <div className="panel p-5 border-border/70 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <BookOpen className="h-4 w-4 text-primary" /> Generated Notes Library ({notes.length})
              </h3>
              <button
                type="button"
                onClick={() => setViewHistory(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Close History
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto">
              {notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    setActiveNote(n);
                    setViewHistory(false);
                  }}
                  className={`cursor-pointer rounded-xl p-3 text-xs border transition flex items-start justify-between gap-2 ${
                    activeNote?.id === n.id
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-card/60 hover:bg-card border-border text-foreground"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{n.subject} — {n.chapter}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      {n.outputType} • {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    className="p-1 hover:text-destructive text-muted-foreground transition cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* LEFT COLUMN: Progressive Step Flow (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* OPTION A FLOW: Browse Academic Resources */}
            {startMode === "database" && (
              <div className="space-y-5">
                {/* Step 1: Education Level (Class) */}
                <div className="panel p-5 space-y-3 border-border/70 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">1</span>
                      Education Level
                    </span>
                    <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> Class-Based Visibility
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { target_class: "9-10", className: "Class 9-10 (SSC)", subtitle: "National Curriculum (Physics & Biology preloaded)", hasDb: true },
                      { target_class: "11-12", className: "Class 11-12 (HSC)", subtitle: "Higher Secondary (Custom PDF Upload)", hasDb: false },
                      { target_class: "bsc", className: "University / BSc", subtitle: "Undergraduate & Diploma (Custom PDF Upload)", hasDb: false },
                    ].map((ac) => {
                      const isChosen = selectedClass === ac.target_class;
                      return (
                        <button
                          key={ac.target_class}
                          type="button"
                          onClick={() => handleSelectClass(ac.target_class)}
                          className={`w-full rounded-xl p-3 text-left border transition flex items-center justify-between cursor-pointer ${
                            isChosen
                              ? "border-primary bg-primary/10 shadow-glow/10 ring-1 ring-primary text-foreground"
                              : "border-border/70 bg-card/60 hover:bg-card text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Bookmark className={`h-4 w-4 ${isChosen ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <span className="text-xs font-bold block">{ac.className}</span>
                              <span className="text-[10px] text-muted-foreground">{ac.subtitle}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                            ac.hasDb
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground border-border/50"
                          }`}>
                            {ac.hasDb ? "2 Books Stored" : "Custom PDF"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notice for non-9-10 classes or Step 2 & 3 for 9-10 */}
                {!isDbSupported ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-3">
                    <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">
                        No Database Textbooks for {selectedClass === "11-12" ? "Class 11–12 (HSC)" : "University / BSc"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        Database textbooks are exclusively pre-indexed for <strong>Class 9–10 (Physics &amp; Biology)</strong>.
                        To generate AI notes for your syllabus, please switch to <strong>Option B: Upload Your Own PDF</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStartMode("upload")}
                      className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Switch to Option B: Upload Your Own PDF
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Step 2: Select Subject (Class 9-10 Physics & Biology ONLY) */}
                    <div className="panel p-5 space-y-3 border-border/70 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">2</span>
                          Select Subject
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {availableSubjects.length} Available in Database
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {availableSubjects.map((sub) => {
                          const isChosen = selectedSubject.toLowerCase() === sub.name.toLowerCase();
                          return (
                            <button
                              key={sub.name}
                              type="button"
                              onClick={() => {
                                setSelectedSubject(sub.name);
                                setSelectedChapterNumber("01");
                              }}
                              className={`rounded-xl p-3 text-left border transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                                isChosen
                                  ? "border-primary bg-primary/10 shadow-glow/10 ring-1 ring-primary"
                                  : "border-border/70 bg-card/50 hover:bg-card/90 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isChosen ? "text-foreground" : "text-foreground/80"}`}>
                                  {sub.name}
                                </span>
                                {isChosen && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <span className="text-[10px] text-primary font-medium">
                                ✓ {sub.totalChapters} Chapters available
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                {/* Step 3: Chapter Selection (Table Style) */}
                <div className="panel p-5 space-y-3 border-border/70 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">3</span>
                      Chapter Selection
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {curriculumChapters.length} chapters
                    </span>
                  </div>

                  {/* Search filter input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={chapterSearchQuery}
                      onChange={(e) => setChapterSearchQuery(e.target.value)}
                      placeholder="Search chapters in English or বাংলা..."
                      className="w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {chapterSearchQuery && (
                      <button
                        onClick={() => setChapterSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Table-style Chapter list */}
                  <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
                    <div className="grid grid-cols-12 bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      <div className="col-span-2">#</div>
                      <div className="col-span-8">Chapter Name</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
                      {filteredChapters.length > 0 ? (
                        filteredChapters.map((ch) => {
                          const isSelected = selectedChapterNumber === ch.number;
                          return (
                            <button
                              key={ch.number}
                              type="button"
                              onClick={() => setSelectedChapterNumber(ch.number)}
                              className={`w-full grid grid-cols-12 px-3 py-2.5 text-left text-xs transition items-center cursor-pointer ${
                                isSelected
                                  ? "bg-primary/15 border-l-4 border-l-primary text-foreground font-semibold"
                                  : "hover:bg-muted/50 text-foreground/80 border-l-4 border-l-transparent"
                              }`}
                            >
                              <div className="col-span-2 font-mono text-[11px] text-primary font-bold">
                                {ch.number}
                              </div>
                              <div className="col-span-8 min-w-0 pr-2">
                                <p className="font-semibold text-xs truncate text-foreground">{ch.en}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{ch.bn}</p>
                              </div>
                              <div className="col-span-2 text-right">
                                {isSelected ? (
                                  <span className="inline-flex items-center text-[10px] text-primary font-bold">
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono">pp. {ch.id * 20 - 19}–{ch.id * 20}</span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No chapters match your search query.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

            {/* OPTION B FLOW: Upload Your Own PDF */}
            {startMode === "upload" && (
              <div className="space-y-5">
                {/* Step 1: Document Upload Box */}
                <div className="panel p-5 space-y-3 border-border/70 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">1</span>
                    Upload Study Material
                  </span>

                  {!uploadedDoc ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition flex flex-col items-center justify-center gap-2.5 ${
                        isUploading
                          ? "border-primary bg-primary/5"
                          : "border-border/80 hover:border-primary/60 hover:bg-card/60 bg-card/30"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.pptx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />

                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2 py-3">
                          <RefreshCw className="h-7 w-7 text-primary animate-spin" />
                          <p className="text-xs font-semibold text-foreground">
                            Extracting text & analyzing document pages...
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            Applying Multimodal OCR if scanned
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <FileUp className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Click to upload or drag & drop document
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Supports PDF, DOCX, PPTX, or TXT (Up to 50MB)
                            </p>
                          </div>
                          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary border border-primary/20">
                            Automatic chapter & topic indexing
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    /* Uploaded File Card */
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{uploadedDoc.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(uploadedDoc.sizeBytes / (1024 * 1024)).toFixed(1)} MB • {uploadedDoc.pageCount} Pages • {uploadedDoc.wordCount} words
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleClearUploadedFile}
                          className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-card/60 transition cursor-pointer"
                          title="Remove document"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-[10px]">
                        <span className="rounded bg-primary/15 text-primary px-1.5 py-0.5 font-medium">
                          {uploadedDoc.ocrApplied ? "Vision OCR Applied" : "Text Extracted"}
                        </span>
                        <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 capitalize">
                          Lang: {uploadedDoc.language}
                        </span>
                        <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5">
                          {uploadedDoc.chapters.length} Sections Found
                        </span>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                {/* Step 2: Detected Subject / Book Title */}
                {uploadedDoc && (
                  <div className="panel p-5 space-y-2 border-border/70 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">2</span>
                        Detected Subject / Book Title
                      </span>
                      <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Auto-Identified
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={uploadedSubject}
                        onChange={(e) => setUploadedSubject(e.target.value)}
                        placeholder="e.g. Biology, Physics, ICT, Machine Learning..."
                        className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Identified from uploaded document structure. You can edit this if needed.
                    </p>
                  </div>
                )}

                {/* Step 3: Detected Chapters & Topics */}
                {uploadedDoc && (
                  <div className="panel p-5 space-y-3 border-border/70 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">3</span>
                        Detected Chapters & Topics
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {uploadedDoc.chapters.length} detected
                      </span>
                    </div>

                    {/* Chapter Search Filter (for > 4 chapters) */}
                    {uploadedDoc.chapters.length > 4 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={uploadedChapterSearch}
                          onChange={(e) => setUploadedChapterSearch(e.target.value)}
                          placeholder="Search detected chapters..."
                          className="w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {uploadedChapterSearch && (
                          <button
                            type="button"
                            onClick={() => setUploadedChapterSearch("")}
                            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {/* Option for Entire Document */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUploadedChapterId("entire");
                          setCustomTopicInput("");
                        }}
                        className={`w-full rounded-xl p-2.5 text-left text-xs border transition flex items-center justify-between cursor-pointer ${
                          selectedUploadedChapterId === "entire" && !customTopicInput.trim()
                            ? "border-primary bg-primary/15 font-semibold text-primary"
                            : "border-border/60 bg-card/40 hover:bg-card text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Bookmark className="h-3.5 w-3.5 text-primary" />
                          <span>Entire Document Overview (All {uploadedDoc.pageCount} Pages)</span>
                        </div>
                        {selectedUploadedChapterId === "entire" && !customTopicInput.trim() && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>

                      {/* Detected Chapters list */}
                      {filteredUploadedChapters.map((ch) => {
                        const isChosen = selectedUploadedChapterId === ch.id && !customTopicInput.trim();
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => {
                              setSelectedUploadedChapterId(ch.id);
                              setCustomTopicInput("");
                            }}
                            className={`w-full rounded-xl p-2.5 text-left text-xs border transition flex items-center justify-between cursor-pointer ${
                              isChosen
                                ? "border-primary bg-primary/15 font-semibold text-primary"
                                : "border-border/60 bg-card/40 hover:bg-card text-foreground"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="truncate font-semibold">
                                {ch.chapterNumber ? `${ch.chapterNumber}. ` : ""}{ch.title}
                              </p>
                              {ch.subtopics && ch.subtopics.length > 0 && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {ch.subtopics.slice(0, 3).join(", ")}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {ch.pageRange}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 4: Custom Topic Search */}
                {uploadedDoc && (
                  <div className="panel p-5 space-y-3 border-border/70 shadow-sm animate-in fade-in duration-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">4</span>
                      Custom Topic Search (Optional)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Type any specific topic or concept from your uploaded document:
                    </p>

                    <div className="relative">
                      <input
                        type="text"
                        value={customTopicInput}
                        onChange={(e) => setCustomTopicInput(e.target.value)}
                        placeholder="e.g. Newton's 2nd Law, Hooke's Law, Mitochondria..."
                        className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {customTopicInput && (
                        <button
                          onClick={() => setCustomTopicInput("")}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick suggestion pills from detected topics */}
                    {uploadedDoc.allDetectedTopics && uploadedDoc.allDetectedTopics.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Quick suggestions from document:
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {uploadedDoc.allDetectedTopics.slice(0, 8).map((top, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCustomTopicInput(top)}
                              className="rounded-md border border-border/70 bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer"
                            >
                              + {top}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note Customization Controls (Shared between Option A & B) */}
            <div className="panel p-5 space-y-4 border-border/70 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Study Note Settings
              </span>

              {/* Note Depth */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Note Depth & Structure</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "detailed", label: "Detailed Notes", desc: "Comprehensive academic mastery" },
                    { id: "exam-ready", label: "Exam-Ready Q&A", desc: "Formulas & board questions" },
                    { id: "definitions", label: "Key Definitions", desc: "Laws, formulas & SI units" },
                    { id: "short", label: "Quick Summary", desc: "High-retention rapid recap" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setNoteDepth(fmt.id as NoteDepth)}
                      className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                        noteDepth === fmt.id
                          ? "border-primary bg-primary/10 shadow-glow/5 ring-1 ring-primary text-foreground font-semibold"
                          : "border-border/70 bg-card/50 hover:bg-card text-muted-foreground"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground">{fmt.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`rounded-xl py-2 text-xs font-semibold capitalize transition cursor-pointer ${
                        difficulty === lvl
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-card"
                      }`}
                    >
                      {lvl === "easy" ? "Easy (Beginner)" : lvl === "medium" ? "Medium (Academic)" : "Hard (Advanced)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-primary" /> Language Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "both", label: "Bilingual (বাং+Eng)" },
                    { id: "bangla", label: "বাংলা (Bangla)" },
                    { id: "english", label: "English" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id as LanguageMode)}
                      className={`rounded-xl py-2 text-xs font-medium transition cursor-pointer ${
                        language === lang.id
                          ? "bg-primary/20 border border-primary text-primary font-bold"
                          : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-card"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Textarea */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Custom Student Focus (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus heavily on mathematical derivations, graph analysis, and common board traps..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-background/80 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Error Message */}
              {generationError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerateNotes}
                disabled={isGenerating || (startMode === "upload" && !uploadedDoc)}
                className="w-full rounded-xl btn-primary py-3.5 text-xs font-bold shadow-glow hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Exam Notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Study Notes (20 Coins)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Result Pane & Markdown Viewer (7 cols) */}
          <div className="lg:col-span-7">
            {isGenerating ? (
              /* Generating Loader State */
              <div className="panel p-12 flex flex-col items-center justify-center text-center min-h-[560px] border-border/70 space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow">
                    <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary animate-ping" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Brain Nest AI is Synthesizing Study Notes</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Analyzing syllabus structure, extracting bilingual definitions, governing formulas, and high-yield board exam questions...
                  </p>
                </div>
                <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
                </div>
              </div>
            ) : activeNote ? (
              /* Generated Note View */
              <div className="panel flex flex-col p-6 min-h-[560px] border-border/70 shadow-sm space-y-4">
                {/* Note Header & Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="rounded-md bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 border border-primary/20 uppercase">
                        {activeNote.outputType}
                      </span>
                      <span className="rounded-md bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 capitalize">
                        {activeNote.difficulty} Level
                      </span>
                      <span className="rounded-md bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 capitalize">
                        Lang: {activeNote.language}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-foreground truncate">{activeNote.title}</h2>
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-lg border border-border/70 bg-card/60 hover:bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition flex items-center gap-1 cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="rounded-lg border border-border/70 bg-card/60 hover:bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition flex items-center gap-1 cursor-pointer"
                      title="Download Markdown"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>.md</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="rounded-lg border border-border/70 bg-card/60 hover:bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition flex items-center gap-1 cursor-pointer"
                      title="Print or export as PDF"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenInEditor}
                      className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3 cursor-pointer"
                      title="Edit note in Real-Time Editor"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit in Editor</span>
                    </button>
                  </div>
                </div>

                {/* Markdown Content Body */}
                <div className="flex-1 overflow-y-auto rounded-xl bg-background/50 border border-border/40 p-5 text-sm leading-relaxed max-w-none text-foreground print:bg-white print:text-black">
                  <div className="prose prose-invert max-w-none font-sans text-xs sm:text-sm whitespace-pre-wrap selection:bg-primary/30">
                    {activeNote.content}
                  </div>
                </div>

                {/* Bottom Study Next Steps */}
                <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-primary" /> Ready to test your retention?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/dashboard/quiz" })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                    >
                      <span>Take Practice Quiz</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate({ to: "/dashboard/summaries" })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                    >
                      <span>Quick Summary</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="panel p-12 text-center flex flex-col items-center justify-center min-h-[560px] border-border/70">
                <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4">
                  <NotebookPen className="h-7 w-7 text-primary/60" />
                </div>
                <h3 className="text-base font-bold text-foreground">No Note Generated Yet</h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  Choose <strong>Browse Academic Resources</strong> to study official Class 9–10 NCTB chapters, or <strong>Upload Your Own PDF</strong> to generate notes from custom slides or guides.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-primary font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Select your chapter or document on the left to begin
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
export default NotesPage;
