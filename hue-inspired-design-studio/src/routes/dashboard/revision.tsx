import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getFiles, getRevisionSheets, addRevisionSheet, deleteRevisionSheet, getUser, setClassLevel,
  getCurrentUserId, getNotes, getSummaries, getQuestionAnalyses, getQuizzes, getEditableDocuments,
  CLASS_9_10_CHAPTERS, getSelectedClass, setSelectedClass, getDatabaseBooks,
  type RevisionSheet, type UploadedFile
} from "@/lib/store";
import { generateRevisionSheet, calculateCoinCost } from "@/lib/ai-engine";
import {
  Zap, Sparkles, Printer, Download, Trash2, Key,
  Lightbulb, HelpCircle, BookOpen, Layers, GraduationCap, CheckCircle2,
  AlertCircle, Bookmark, Check, FileText, CheckSquare, Square,
  RotateCcw, Search, Eye, EyeOff, FileDown, Clock, Tag
} from "lucide-react";

export const Route = createFileRoute("/dashboard/revision")({
  head: () => ({
    meta: [
      { title: "Smart Exam Revision Sheets — Brain Nest" },
      { name: "description", content: "Consolidate your notes, summaries, important questions, and study tasks into high-yield, 1-page printable exam revision sheets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RevisionPage,
});

// Normalized Learning Activity Item
interface ActivityItem {
  id: string;
  sourceType: "note" | "summary" | "questions" | "quiz" | "document";
  typeLabel: string;
  badgeClass: string;
  title: string;
  subject: string;
  chapter: string;
  snippet: string;
  content: string;
  date: string;
}

function RevisionPage() {
  const user = getUser();
  const userId = getCurrentUserId();

  // Mode: "activities" (synthesizing user's past activities) vs "manual" (Class & subject curriculum from DB)
  const [sourceMode, setSourceMode] = useState<"activities" | "manual">("activities");

  // User's saved revision sheets
  const [sheets, setSheets] = useState<RevisionSheet[]>(() => getRevisionSheets());
  const [activeSheet, setActiveSheet] = useState<RevisionSheet | null>(() => (sheets.length > 0 && sheets[0] ? sheets[0] : null));

  // Excluded activity IDs (deleted by user for this revision session)
  const [excludedIds, setExcludedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`bn_${userId}_excluded_revision_activities`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Selected activities for generating the revision sheet
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search & Filters on learning activities
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Interactive Self-Test answer reveals
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // Manual generation states (preserved existing functionality)
  const [selectedClass, setSelectedClassState] = useState<string>(() => getSelectedClass());
  const [files, setFiles] = useState<UploadedFile[]>(() => getFiles());
  const [selectedFileId, setSelectedFileId] = useState("");
  const selectedFile = files.find((f) => f.id === selectedFileId);
  const [manualSubject, setManualSubject] = useState("Physics");
  const [manualChapter, setManualChapter] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);

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

  // 1. Collect all learning activities for the current user
  const allActivities = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    // AI Notes
    const notes = getNotes();
    notes.forEach((n) => {
      list.push({
        id: `note-${n.id}`,
        sourceType: "note",
        typeLabel: "AI Note",
        badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        title: n.title,
        subject: n.subject || "General",
        chapter: n.chapter || "Core Concepts",
        snippet: n.content ? n.content.replace(/[#*`_-]/g, "").slice(0, 140) + "..." : "High-yield lecture note",
        content: n.content,
        date: n.createdAt,
      });
    });

    // Topic Summaries
    const summaries = getSummaries();
    summaries.forEach((s) => {
      list.push({
        id: `sum-${s.id}`,
        sourceType: "summary",
        typeLabel: "Topic Summary",
        badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        title: `${s.topic}`,
        subject: s.subject || "General",
        chapter: s.chapter || "Overview",
        snippet: s.overview ? s.overview.slice(0, 140) + "..." : "Executive topic summary with formulas",
        content: `Overview: ${s.overview}\n\nKey Points:\n${s.keyPoints?.join("\n") || ""}\n\nFormulas:\n${s.formulas?.join("\n") || ""}`,
        date: s.createdAt,
      });
    });

    // Important Questions & Exam Analysis
    const analyses = getQuestionAnalyses();
    analyses.forEach((qa) => {
      const topQs = qa.frequencyTopics?.map((t) => t.sampleQuestions?.join("; ")).filter(Boolean).join(" | ");
      list.push({
        id: `qa-${qa.id}`,
        sourceType: "questions",
        typeLabel: "Exam Questions",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        title: `${qa.subject}: ${qa.chapter} Analysis`,
        subject: qa.subject || "General",
        chapter: qa.chapter || "Exam Papers",
        snippet: topQs ? topQs.slice(0, 140) + "..." : "Repetitive board exam patterns & model answers",
        content: `High Frequency Topics:\n${qa.frequencyTopics?.map((t) => `- ${t.topic}: ${t.modelAnswer || ""}`).join("\n\n") || ""}`,
        date: qa.createdAt,
      });
    });

    // Quizzes & Practice Tests
    const quizzes = getQuizzes();
    quizzes.forEach((q) => {
      const qSnippet = q.questions?.slice(0, 2).map((qu) => qu.question).join(" | ");
      list.push({
        id: `quiz-${q.id}`,
        sourceType: "quiz",
        typeLabel: "Quiz Review",
        badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        title: q.title,
        subject: q.subject || "General",
        chapter: q.chapter || "Mock Test",
        snippet: qSnippet ? qSnippet.slice(0, 140) + "..." : `${q.totalQuestions} questions with detailed explanations`,
        content: `Questions & Pedagogical Explanations:\n${q.questions?.map((qu, i) => `Q${i + 1}: ${qu.question}\nCorrect Answer: ${qu.options[qu.correctIndex]}\nExplanation: ${qu.explanation}`).join("\n\n") || ""}`,
        date: q.createdAt,
      });
    });

    // Study & Editable Documents
    const docs = getEditableDocuments();
    docs.forEach((d) => {
      list.push({
        id: `doc-${d.id}`,
        sourceType: "document",
        typeLabel: "Study Document",
        badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        title: d.title,
        subject: d.tags?.[0] || "General Studies",
        chapter: d.originalFileName || "Workspace",
        snippet: d.content ? d.content.replace(/[#*`_-]/g, "").slice(0, 140) + "..." : "Custom student study document",
        content: d.content,
        date: d.createdAt,
      });
    });

    // Filter out excluded items and sort newest first
    return list
      .filter((item) => !excludedIds.includes(item.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [excludedIds]);

  // Available subjects from activities
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    allActivities.forEach((a) => {
      if (a.subject) set.add(a.subject);
    });
    return Array.from(set);
  }, [allActivities]);

  // Filtered activities based on search and filters
  const filteredActivities = useMemo(() => {
    return allActivities.filter((a) => {
      if (subjectFilter !== "all" && a.subject.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      if (typeFilter !== "all" && a.sourceType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.subject.toLowerCase().includes(q) ||
          a.chapter.toLowerCase().includes(q) ||
          a.snippet.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allActivities, subjectFilter, typeFilter, searchQuery]);

  // Auto-select all filtered activities by default on initial load
  useEffect(() => {
    if (filteredActivities.length > 0 && selectedIds.length === 0) {
      setSelectedIds(filteredActivities.slice(0, 8).map((a) => a.id));
    }
  }, [filteredActivities]);

  // Persist excluded IDs in user-isolated storage
  const handleDeleteActivity = (id: string) => {
    const updated = [...excludedIds, id];
    setExcludedIds(updated);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    try {
      localStorage.setItem(`bn_${userId}_excluded_revision_activities`, JSON.stringify(updated));
    } catch {}
  };

  // Reset all deleted/excluded activities
  const handleResetExcluded = () => {
    setExcludedIds([]);
    try {
      localStorage.removeItem(`bn_${userId}_excluded_revision_activities`);
    } catch {}
  };

  // Toggle selection for an individual activity
  const toggleSelectActivity = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle select all in current filtered view
  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredActivities.map((a) => a.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Calculate Coin Cost
  const estimatedCost = calculateCoinCost("revision", 1200);

  // Generate Revision Sheet from SELECTED Activities
  const handleGenerateFromActivities = async () => {
    const chosen = allActivities.filter((a) => selectedIds.includes(a.id));
    if (chosen.length === 0) {
      alert("Please select at least one learning activity from the list to generate a revision sheet.");
      return;
    }

    if (user.coins < estimatedCost) {
      alert(`Insufficient coins! You need ${estimatedCost} coins for this revision sheet.`);
      return;
    }

    setIsGenerating(true);

    try {
      // Aggregate subject, chapter, and combined text
      const subjects = Array.from(new Set(chosen.map((c) => c.subject)));
      const chapters = Array.from(new Set(chosen.map((c) => c.chapter)));
      const primarySubject = subjects.length === 1 && subjects[0] ? subjects[0] : `${subjects.slice(0, 2).join(" & ")}`;
      const primaryChapter = chapters.length === 1 && chapters[0] ? chapters[0] : `${chapters.slice(0, 2).join(", ")}${chapters.length > 2 ? ` (+${chapters.length - 2} more)` : ""}`;

      const combinedContext = chosen
        .map((item, idx) => `### Source ${idx + 1} [${item.typeLabel}]: ${item.title} (${item.subject} - ${item.chapter})\n${item.content}`)
        .join("\n\n---\n\n");

      const res = await api.generateRevisionSheet({
        subject: primarySubject,
        chapter: primaryChapter,
        contextText: combinedContext,
      });

      let generated: any = null;
      if (res.success && res.data) {
        generated = {
          keyPoints: res.data.key_points || res.data.keyPoints || [],
          formulas: res.data.formulas || [],
          memoryAids: res.data.memory_aids || res.data.memoryAids || [],
          quickQuestions: res.data.quick_questions || res.data.quickQuestions || [],
        };
      } else {
        // High quality offline fallback with authentic extraction
        generated = generateRevisionSheet(primarySubject, primaryChapter, combinedContext);
      }

      const newSheet = addRevisionSheet({
        subject: primarySubject,
        chapter: primaryChapter,
        title: `${primarySubject}: ${primaryChapter} (Master Revision)`,
        keyPoints: generated.keyPoints && generated.keyPoints.length > 0 ? generated.keyPoints : [
          "Core principles synthesized from your selected study activities.",
          "High-yield exam definitions and critical conceptual relationships.",
          "Common student pitfalls and examiner's focal areas.",
        ],
        formulas: generated.formulas && generated.formulas.length > 0 ? generated.formulas : [
          "Core Relationship: Output = Efficiency × Input Work",
          "Equilibrium Condition: Σ F = 0; Σ τ = 0",
        ],
        memoryAids: generated.memoryAids && generated.memoryAids.length > 0 ? generated.memoryAids : [
          "Mnemonics for rapid recall during timed exam conditions.",
        ],
        quickQuestions: generated.quickQuestions && generated.quickQuestions.length > 0 ? generated.quickQuestions : [
          "What is the key defining law of this topic?",
          "How do you calculate efficiency given input and output values?",
        ],
        coinCost: estimatedCost,
      });

      setIsGenerating(false);
      const updatedSheets = getRevisionSheets();
      setSheets(updatedSheets);
      setActiveSheet(newSheet);
      setRevealedAnswers({});
    } catch (err) {
      console.error("Revision generation error:", err);
      setIsGenerating(false);
    }
  };

  // Generate Revision Sheet from Manual Class & Subject (Preserved existing flow)
  const handleGenerateManual = async () => {
    if (!manualSubject.trim() || !manualChapter.trim()) return;
    if (user.coins < estimatedCost) {
      alert(`Insufficient coins! You need ${estimatedCost} coins for this revision sheet.`);
      return;
    }

    setIsGenerating(true);

    try {
      const selectedFile = files.find((f) => f.id === selectedFileId);
      const res = await api.generateRevisionSheet({
        subject: manualSubject,
        chapter: manualChapter,
        fileId: selectedFileId || undefined,
        contextText: selectedFile?.content,
      });

      let generated: any = null;
      if (res.success && res.data) {
        generated = {
          keyPoints: res.data.key_points || res.data.keyPoints || [],
          formulas: res.data.formulas || [],
          memoryAids: res.data.memory_aids || res.data.memoryAids || [],
          quickQuestions: res.data.quick_questions || res.data.quickQuestions || [],
        };
      } else {
        generated = generateRevisionSheet(manualSubject, manualChapter, selectedFile?.content);
      }

      const newSheet = addRevisionSheet({
        subject: manualSubject,
        chapter: manualChapter,
        title: `${manualSubject} — ${manualChapter} Rapid Revision`,
        keyPoints: generated.keyPoints,
        formulas: generated.formulas,
        memoryAids: generated.memoryAids,
        quickQuestions: generated.quickQuestions,
        coinCost: estimatedCost,
      });

      setIsGenerating(false);
      setSheets(getRevisionSheets());
      setActiveSheet(newSheet);
      setRevealedAnswers({});
    } catch {
      setIsGenerating(false);
    }
  };

  // Class Selection Handler (Manual mode)
  const handleClassSelect = (newClass: string) => {
    setSelectedClassState(newClass);
    setSelectedClass(newClass);
    const updated = getFiles();
    setFiles(updated);

    if (newClass === "9-10") {
      setManualSubject("Physics");
      const dbBooks = getDatabaseBooks("9-10");
      const physDoc = dbBooks.find((f) => f.subject === "Physics");
      setSelectedFileId(physDoc?.id || "");
      setManualChapter(CLASS_9_10_CHAPTERS["Physics"]?.[0]?.name || "");
    } else {
      setSelectedFileId("");
      setManualSubject("");
      setManualChapter("");
    }
  };

  const handleManualSubjectPick = (sub: string) => {
    setManualSubject(sub);
    if (selectedClass === "9-10") {
      const dbBooks = getDatabaseBooks("9-10");
      const matchDoc = dbBooks.find((f) => f.subject?.toLowerCase() === sub.toLowerCase());
      if (matchDoc) setSelectedFileId(matchDoc.id);
      const chapList = CLASS_9_10_CHAPTERS[sub];
      if (chapList && chapList.length > 0 && chapList[0]) {
        setManualChapter(chapList[0].name);
      }
    }
  };

  useEffect(() => {
    if (sourceMode === "manual" && selectedClass === "9-10") {
      const targetSub = manualSubject || "Physics";
      const dbBooks = getDatabaseBooks("9-10");
      const matchDoc = dbBooks.find((f) => f.subject?.toLowerCase() === targetSub.toLowerCase());
      if (matchDoc && !selectedFileId) setSelectedFileId(matchDoc.id);
      if (!manualChapter) {
        const chapList = CLASS_9_10_CHAPTERS[targetSub];
        if (chapList && chapList.length > 0 && chapList[0]) {
          setManualChapter(chapList[0].name);
        }
      }
    }
  }, [selectedClass, files, sourceMode]);

  // Clean, professional PDF Download / Print Formatter
  const handleDownloadPDF = () => {
    if (!activeSheet) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${activeSheet.title} - Revision Sheet</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 10px;
            max-width: 820px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title-area h1 {
            margin: 0 0 4px 0;
            font-size: 20px;
            color: #1e3a8a;
          }
          .badge {
            display: inline-block;
            background: #dbeafe;
            color: #1d4ed8;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 6px;
            margin-bottom: 6px;
          }
          .meta {
            font-size: 11px;
            color: #64748b;
          }
          .section {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e40af;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          ul {
            margin: 0;
            padding-left: 18px;
          }
          li {
            font-size: 11.5px;
            margin-bottom: 5px;
            color: #334155;
          }
          .formula-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .formula-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
          }
          .mnemonic-box {
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
            padding: 8px 12px;
            margin-bottom: 6px;
            font-size: 11.5px;
            border-radius: 0 6px 6px 0;
          }
          .qa-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 6px;
            font-size: 11.5px;
          }
          .footer {
            margin-top: 25px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <span class="badge">${activeSheet.subject} • ${activeSheet.chapter}</span>
            <h1>${activeSheet.title}</h1>
            <div class="meta">Brain Nest High-Yield Exam Revision Blueprint • Generated on ${new Date(activeSheet.createdAt).toLocaleDateString()}</div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <strong>5-Min Exam Read</strong><br>Personalized Student Copy
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. High-Yield Core Concepts</div>
          <ul>
            ${activeSheet.keyPoints.map((p) => `<li>${p}</li>`).join("")}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">2. Must-Know Formulas &amp; Equations</div>
          <div class="formula-grid">
            ${activeSheet.formulas.map((f) => `<div class="formula-card">${f}</div>`).join("")}
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. Memory Aids &amp; Mnemonics</div>
          ${activeSheet.memoryAids.map((m) => `<div class="mnemonic-box">💡 ${m}</div>`).join("")}
        </div>

        <div class="section">
          <div class="section-title">4. Rapid-Fire Self-Test Questions</div>
          ${activeSheet.quickQuestions.map((q, i) => `<div class="qa-card"><strong>Q${i + 1}:</strong> ${q}</div>`).join("")}
        </div>

        <div class="footer">
          Brain Nest — AI Study Companion • Keep this sheet handy 15 minutes before entering the exam hall.
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    if (!activeSheet) return;
    const text = `# ${activeSheet.title}
Subject: ${activeSheet.subject} | Chapter: ${activeSheet.chapter}
Generated: ${new Date(activeSheet.createdAt).toLocaleString()}

## 1. High-Yield Core Concepts
${activeSheet.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 2. Must-Know Formulas & Equations
${activeSheet.formulas.map((f) => `- ${f}`).join("\n")}

## 3. Memory Mnemonics & Tricks
${activeSheet.memoryAids.map((m) => `- ${m}`).join("\n")}

## 4. Rapid-Fire Self-Test Questions
${activeSheet.quickQuestions.map((q, i) => `Q${i + 1}: ${q}`).join("\n")}
`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSheet.subject}_${activeSheet.chapter}_revision.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete saved revision sheet
  const handleDeleteSheet = (id: string) => {
    deleteRevisionSheet(id);
    const updated = getRevisionSheets();
    setSheets(updated);
    if (activeSheet?.id === id) {
      setActiveSheet(updated.length > 0 && updated[0] ? updated[0] : null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
              <Zap className="h-4 w-4" /> 5-Minute Exam Revision
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Smart Revision Sheets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatically collect your past AI notes, topic summaries, questions, and quizzes to generate clean, high-retention 1-page exam revision sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/80 border border-primary/30 px-3.5 py-1 text-xs font-semibold text-primary">
              {sheets.length} Saved Sheets
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSourceMode("activities")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                sourceMode === "activities"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              From My Learning Activities ({allActivities.length})
            </button>

            <button
              type="button"
              onClick={() => setSourceMode("manual")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                sourceMode === "manual"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              From Class &amp; Subject Database
            </button>
          </div>

          {sourceMode === "activities" && excludedIds.length > 0 && (
            <button
              type="button"
              onClick={handleResetExcluded}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Restore {excludedIds.length} removed items
            </button>
          )}
        </div>

        {/* Main 2-Column Content */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* =========================================================================
              LEFT COLUMN: ACTIVITIES COLLECTOR & CONTROLS (lg:col-span-5)
             ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {sourceMode === "activities" ? (
              /* TAB 1: Automatic Activity Collector */
              <div className="panel p-5 space-y-4 bg-card border border-border shadow-xl rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Your Learning Materials
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Review topics and delete any you don't wish to include.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">
                    {selectedIds.length} / {filteredActivities.length} Selected
                  </span>
                </div>

                {/* Search & Subject/Type Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search topics, chapters, notes..."
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px]">
                      <button
                        type="button"
                        onClick={() => setSubjectFilter("all")}
                        className={`rounded-lg px-2 py-0.5 font-medium transition cursor-pointer ${
                          subjectFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        All
                      </button>
                      {availableSubjects.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubjectFilter(sub)}
                          className={`rounded-lg px-2 py-0.5 font-medium transition cursor-pointer truncate max-w-[80px] ${
                            subjectFilter === sub ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {filteredActivities.length > 0 && filteredActivities.every((a) => selectedIds.includes(a.id)) ? (
                        <>
                          <CheckSquare className="h-3 w-3" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="h-3 w-3" /> Select All
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Organized Activities Scrollable List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((item) => {
                      const isChecked = selectedIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 transition flex items-start gap-2.5 group cursor-pointer ${
                            isChecked
                              ? "border-primary/50 bg-primary/5 shadow-sm"
                              : "border-border bg-card/60 hover:bg-card opacity-75 hover:opacity-100"
                          }`}
                          onClick={() => toggleSelectActivity(item.id)}
                        >
                          {/* Checkbox */}
                          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleSelectActivity(item.id)}
                              className="text-primary cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-primary fill-primary/20" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>

                          {/* Activity Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${item.badgeClass}`}>
                                {item.typeLabel}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {item.subject} • {item.chapter}
                              </span>
                            </div>
                            <h3 className="text-xs font-bold text-foreground leading-snug truncate">
                              {item.title}
                            </h3>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {item.snippet}
                            </p>
                          </div>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            title="Remove from revision list"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteActivity(item.id);
                            }}
                            className="p-1 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-2">
                      <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                      <p className="font-semibold text-foreground">No matching learning activities found</p>
                      <p className="text-[11px]">
                        Generate notes or quizzes first, or switch to the <strong>"From Class &amp; Subject Database"</strong> tab above!
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Selected: <strong className="text-foreground">{selectedIds.length} Activities</strong>
                    </span>
                    <span>
                      Cost: <strong className="text-primary">{estimatedCost} Coins</strong> (Wallet: {user.coins})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateFromActivities}
                    disabled={isGenerating || selectedIds.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                  >
                    <Zap className="h-4 w-4" />
                    {isGenerating
                      ? "Synthesizing Revision Sheet..."
                      : `Generate Revision Sheet (${selectedIds.length} Selected)`}
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: Class & Subject Database Flow (Preserved) */
              <div className="panel p-6 space-y-4 bg-card border border-border shadow-xl rounded-2xl">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Curated Subject Syllabus
                </h2>

                {/* Step 1: Class Selection */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                    <span>Select Class</span>
                    <span className="text-[10px] text-primary font-medium">NCTB Database</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleClassSelect("9-10")}
                      className={`rounded-xl p-3 text-left border transition flex flex-col justify-between ${
                        selectedClass === "9-10"
                          ? "border-primary bg-primary/10 shadow-glow/10 ring-1 ring-primary"
                          : "border-border bg-card/60 hover:bg-card text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Class 9-10 (SSC)</span>
                        {selectedClass === "9-10" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="text-[10px] text-primary mt-1 font-medium">✓ 2 NCTB Books in Database</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClassSelect("11-12")}
                      className={`rounded-xl p-3 text-left border transition flex flex-col justify-between ${
                        selectedClass === "11-12"
                          ? "border-primary bg-primary/10 shadow-glow/10 ring-1 ring-primary"
                          : "border-border bg-card/60 hover:bg-card text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Class 11-12 (HSC)</span>
                        {selectedClass === "11-12" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Syllabus based</span>
                    </button>
                  </div>
                </div>

                {/* Step 2: Subject Selection */}
                {selectedClass === "9-10" ? (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Select Subject</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleManualSubjectPick("Physics")}
                        className={`rounded-xl p-3 text-left border transition flex items-center justify-between ${
                          manualSubject.toLowerCase() === "physics"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-card/60 text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">পদার্থবিজ্ঞান (Physics)</span>
                        {manualSubject.toLowerCase() === "physics" && <Check className="h-4 w-4 text-primary" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleManualSubjectPick("Biology")}
                        className={`rounded-xl p-3 text-left border transition flex items-center justify-between ${
                          manualSubject.toLowerCase() === "biology"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-card/60 text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">জীববিজ্ঞান (Biology)</span>
                        {manualSubject.toLowerCase() === "biology" && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Subject</label>
                    <input
                      type="text"
                      value={manualSubject}
                      onChange={(e) => setManualSubject(e.target.value)}
                      placeholder="e.g. Higher Math, Chemistry"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                )}

                {/* Step 3: Chapter Selection */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                    <span>Select Chapter / Topic</span>
                    {selectedClass === "9-10" && CLASS_9_10_CHAPTERS[manualSubject] && (
                      <span className="text-[10px] text-primary font-mono font-semibold">
                        {CLASS_9_10_CHAPTERS[manualSubject]?.length} Chapters
                      </span>
                    )}
                  </label>

                  {selectedClass === "9-10" && CLASS_9_10_CHAPTERS[manualSubject] ? (
                    <select
                      value={manualChapter}
                      onChange={(e) => setManualChapter(e.target.value)}
                      className="w-full rounded-xl border border-primary/50 bg-background px-3 py-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                    >
                      {CLASS_9_10_CHAPTERS[manualSubject]?.map((chap) => (
                        <option key={chap.id} value={chap.name}>
                          {chap.name} ({chap.bn})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Thermodynamics, Optics"
                      value={manualChapter}
                      onChange={(e) => setManualChapter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateManual}
                    disabled={isGenerating || !manualSubject.trim() || !manualChapter.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 cursor-pointer text-xs sm:text-sm"
                  >
                    <Zap className="h-4 w-4" />
                    {isGenerating ? "Synthesizing Revision Sheet..." : `Generate Sheet (${estimatedCost} Coins)`}
                  </button>
                </div>
              </div>
            )}

            {/* Saved Sheets List */}
            {sheets.length > 0 && (
              <div className="panel p-5 bg-card border border-border rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Saved Revision Sheets ({sheets.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sheets.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveSheet(s);
                        setRevealedAnswers({});
                      }}
                      className={`cursor-pointer rounded-xl p-3 text-xs transition flex items-center justify-between ${
                        activeSheet?.id === s.id
                          ? "bg-primary/15 border border-primary/40 text-primary font-semibold"
                          : "bg-muted/40 hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {s.formulas.length} formulas • {s.keyPoints.length} core concepts
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSheet(s.id);
                        }}
                        className="p-1 hover:text-destructive text-muted-foreground ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              RIGHT COLUMN: INTERACTIVE REVISION VIEWER & DOWNLOADER (lg:col-span-7)
             ========================================================================= */}
          <div className="lg:col-span-7">
            {activeSheet ? (
              <div className="panel p-6 flex flex-col min-h-[640px] bg-card border border-border shadow-xl rounded-2xl">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {activeSheet.subject}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {activeSheet.chapter}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> ~5 Min Read
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">{activeSheet.title}</h2>
                  </div>

                  {/* Actions: Download PDF, Markdown, Print */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      title="Download clean printable PDF document"
                      className="rounded-xl border border-primary/40 bg-accent px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <FileDown className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      title="Download Markdown summary"
                      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" /> .MD
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      title="Print sheet"
                      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted flex items-center gap-1 transition cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6 overflow-y-auto max-h-[620px] pr-2">
                  {/* Section 1: High-Yield Core Concepts */}
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                    <h3 className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2">
                      <Key className="h-4 w-4" /> 1. High-Yield Core Concepts
                    </h3>
                    <ul className="space-y-2">
                      {activeSheet.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-xs leading-relaxed flex items-start gap-2.5 text-foreground/90">
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 2: Formulas & Equations */}
                  {activeSheet.formulas.length > 0 && (
                    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                      <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground">
                        <Zap className="h-4 w-4 text-amber-400" /> 2. Core Formulas &amp; Principles
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeSheet.formulas.map((formula, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl bg-background/80 p-3 font-mono text-xs font-semibold border border-border/80 text-foreground flex items-center justify-between"
                          >
                            <span>{formula}</span>
                            <Tag className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Memory Mnemonics */}
                  {activeSheet.memoryAids.length > 0 && (
                    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                      <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground">
                        <Lightbulb className="h-4 w-4 text-sky-400" /> 3. Memory Mnemonics &amp; Retention Aids
                      </h3>
                      <div className="space-y-2">
                        {activeSheet.memoryAids.map((aid, idx) => (
                          <div
                            key={idx}
                            className="text-xs rounded-xl bg-sky-500/10 border border-sky-500/20 p-3 flex items-start gap-2.5 text-sky-200"
                          >
                            <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0 mt-1" />
                            <span className="leading-relaxed">{aid}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Rapid-Fire Self-Test Questions */}
                  {activeSheet.quickQuestions.length > 0 && (
                    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground">
                          <HelpCircle className="h-4 w-4 text-emerald-400" /> 4. Rapid-Fire Self-Test Questions
                        </h3>
                        <span className="text-[10px] text-muted-foreground">Active Recall Practice</span>
                      </div>

                      <div className="space-y-2.5">
                        {activeSheet.quickQuestions.map((q, idx) => {
                          const isRevealed = revealedAnswers[idx];
                          return (
                            <div
                              key={idx}
                              className="rounded-xl bg-background border border-border p-3 transition hover:border-border/80"
                            >
                              <div className="flex items-start justify-between gap-3 text-xs font-medium text-foreground">
                                <span>
                                  <strong>Q{idx + 1}:</strong> {q}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                  }
                                  className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  {isRevealed ? (
                                    <>
                                      <EyeOff className="h-3 w-3" /> Hide Answer
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3 w-3" /> Reveal Answer
                                    </>
                                  )}
                                </button>
                              </div>

                              {isRevealed && (
                                <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground animate-fadeIn leading-relaxed">
                                  <strong className="text-emerald-400">Answer Focus:</strong> Apply the core principles and formulas stated in Section 1 and 2 above. Review key relationships and verify units.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="panel p-16 text-center flex flex-col items-center justify-center min-h-[500px] bg-card border border-border rounded-2xl shadow-xl">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary mb-4 animate-float">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No Revision Sheet Selected</h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  Select your learning activities on the left and click <strong>"Generate Revision Sheet"</strong>, or choose a saved sheet from the list.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
