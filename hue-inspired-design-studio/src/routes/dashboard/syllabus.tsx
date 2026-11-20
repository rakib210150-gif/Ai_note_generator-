import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getSyllabusData, updateTopicStatus, getUser, setClassLevel,
  getSelectedClass, setSelectedClass,
  CLASS_9_10_CHAPTERS, type SyllabusSubject,
} from "@/lib/store";
import {
  ListChecks, CheckCircle2, Clock, Circle, Sparkles, BookOpen,
  Target, ArrowRight, Plus, ScrollText, Check, ChevronDown, ChevronRight,
  TrendingUp, Layers, CheckSquare, AlertCircle, FileText
} from "lucide-react";

export const Route = createFileRoute("/dashboard/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus-Based Learning — Brain Nest" },
      { name: "description", content: "Track your subject curriculum, mark chapter progress, and generate AI study materials per topic." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SyllabusPage,
});

function SyllabusPage() {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClassState] = useState<string>(() => getSelectedClass());
  const [sscSubject, setSscSubject] = useState<"Physics" | "Biology">("Physics");
  const [syllabusData, setSyllabusData] = useState<SyllabusSubject[]>(() => getSyllabusData());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => syllabusData[0]?.id || "syl-physics");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    "ch-1": true,
    "ch-2": true,
    "ch-vec": true,
    "ch-dyn": true,
  });

  const handleClassSelect = (newClass: string) => {
    setSelectedClassState(newClass);
    setSelectedClass(newClass);
  };

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

  const activeSubject = syllabusData.find((s) => s.id === selectedSubjectId) || syllabusData[0];

  // Calculate progress metrics
  const allTopics = activeSubject ? activeSubject.chapters.flatMap((c) => c.topics) : [];
  const completedCount = allTopics.filter((t) => t.status === "completed").length;
  const inProgressCount = allTopics.filter((t) => t.status === "in-progress").length;
  const totalCount = allTopics.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleStatusChange = (
    chapterId: string,
    topicId: string,
    newStatus: "completed" | "in-progress" | "not-started"
  ) => {
    if (!activeSubject) return;
    updateTopicStatus(activeSubject.id, chapterId, topicId, newStatus);
    setSyllabusData(getSyllabusData());
  };

  const handle1ClickGenerateNotes = (chapterTitle: string, topicTitle: string) => {
    navigate({
      to: "/dashboard/notes",
      search: {
        subject: activeSubject?.subject || "Physics",
        chapter: `${chapterTitle} — ${topicTitle}`,
      } as any,
    });
  };

  const handle1ClickSummary = (chapterTitle: string, topicTitle: string) => {
    navigate({
      to: "/dashboard/summaries",
      search: {
        subject: activeSubject?.subject || "Physics",
        chapter: chapterTitle,
        topic: topicTitle,
      } as any,
    });
  };

  const handle1ClickQuiz = (chapterTitle: string) => {
    navigate({
      to: "/dashboard/quiz",
      search: {
        subject: activeSubject?.subject || "Physics",
        chapter: chapterTitle,
      } as any,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary border border-primary/40">
                <ListChecks className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold">Syllabus-Based Learning</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow your verified curriculum, monitor mastery per learning objective, and generate notes per topic.
            </p>
          </div>
        </div>

        {/* Class Level Selector */}
        <div className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" /> Select Academic Class
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleClassSelect("9-10")}
              className={`rounded-xl border p-3 text-left transition ${
                selectedClass === "9-10"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/40 bg-card/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Class 9-10 (SSC)</span>
                {selectedClass === "9-10" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                NCTB National Curriculum (14 Chapters Each)
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleClassSelect("11-12")}
              className={`rounded-xl border p-3 text-left transition ${
                selectedClass === "11-12"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/40 bg-card/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Class 11-12 (HSC)</span>
                {selectedClass === "11-12" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Higher Secondary Curriculum
              </p>
            </button>
          </div>
        </div>

        {selectedClass === "11-12" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Class 11-12 Curriculum</span>
              Database currently has official textbook study files for Class 9-10 (Physics & Biology). You can review the HSC syllabus track below or upload custom materials.
            </div>
          </div>
        )}

        {/* Subject Selector Tabs */}
        {selectedClass === "9-10" ? (
          <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-border/60 pb-3">
            <button
              onClick={() => setSscSubject("Physics")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition border flex items-center gap-2 ${
                sscSubject === "Physics"
                  ? "border-primary bg-primary/10 text-primary shadow-glow"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>পদার্থবিজ্ঞান (Physics)</span>
              <span className="font-mono text-xs opacity-80">(14 Chapters · NCTB)</span>
            </button>

            <button
              onClick={() => setSscSubject("Biology")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition border flex items-center gap-2 ${
                sscSubject === "Biology"
                  ? "border-primary bg-primary/10 text-primary shadow-glow"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>জীববিজ্ঞান (Biology)</span>
              <span className="font-mono text-xs opacity-80">(14 Chapters · NCTB)</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-border/60 pb-3">
            {syllabusData.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition border flex items-center gap-2 ${
                  selectedSubjectId === s.id
                    ? "border-primary bg-primary/10 text-primary shadow-glow"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>{s.subject}</span>
                <span className="font-mono text-xs opacity-70">({s.gradeOrLevel})</span>
              </button>
            ))}
          </div>
        )}

        {/* Progress Overview Card */}
        {selectedClass === "9-10" ? (
          <div className="panel p-6 mb-8 border-primary/20">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-center">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  NCTB Curriculum
                </p>
                <h2 className="text-2xl font-bold text-foreground mt-0.5">
                  {sscSubject === "Physics" ? "পদার্থবিজ্ঞান (Physics)" : "জীববিজ্ঞান (Biology)"}
                </h2>
                <p className="text-xs text-primary font-medium mt-1">Class 9-10 (SSC) · 14 Complete Chapters</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Official Materials</p>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Database NCTB Textbook Active
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  14 chapters directly synced with AI note, summary & quiz engine
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-center flex-1">
                  <p className="font-mono text-lg font-bold text-primary">14</p>
                  <p className="text-[11px] text-muted-foreground">Chapters</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 text-center flex-1">
                  <p className="font-mono text-lg font-bold text-foreground">100%</p>
                  <p className="text-[11px] text-muted-foreground">Coverage</p>
                </div>
              </div>

              <div className="flex justify-start sm:justify-end">
                <button
                  onClick={() => handle1ClickQuiz(CLASS_9_10_CHAPTERS[sscSubject]?.[0]?.name || sscSubject)}
                  className="rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition flex items-center gap-1.5"
                >
                  <Target className="h-4 w-4" /> Comprehensive Mock Test
                </button>
              </div>
            </div>
          </div>
        ) : activeSubject && (
          <div className="panel p-6 mb-8 border-primary/20">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-center">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Subject Curriculum
                </p>
                <h2 className="text-2xl font-bold text-foreground mt-0.5">{activeSubject.subject}</h2>
                <p className="text-xs text-muted-foreground mt-1">{activeSubject.gradeOrLevel}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Curriculum Completion</p>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">{completionPercentage}%</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {completedCount} of {totalCount} topics mastered
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center flex-1">
                  <p className="font-mono text-lg font-bold text-emerald-400">{completedCount}</p>
                  <p className="text-[11px] text-emerald-300">Completed</p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center flex-1">
                  <p className="font-mono text-lg font-bold text-amber-400">{inProgressCount}</p>
                  <p className="text-[11px] text-amber-300">In Progress</p>
                </div>
              </div>

              <div className="flex justify-start sm:justify-end">
                <button
                  onClick={() => handle1ClickQuiz(activeSubject.chapters[0]?.title || activeSubject.subject)}
                  className="rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition flex items-center gap-1.5"
                >
                  <Target className="h-4 w-4" /> Comprehensive Mock Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapters & Topics List */}
        {selectedClass === "9-10" ? (
          <div className="space-y-4">
            {CLASS_9_10_CHAPTERS[sscSubject]?.map((chap) => (
              <div key={chap.id} className="panel overflow-hidden border-border/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 text-primary font-mono text-xs font-bold border border-primary/30">
                      {chap.id}
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-foreground">
                        {chap.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        বাংলা: <span className="text-foreground/90 font-semibold">{chap.bn}</span> · NCTB Class 9-10
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center ml-11 sm:ml-0">
                    <button
                      onClick={() => handle1ClickGenerateNotes(chap.name, chap.bn)}
                      className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1"
                      title="Generate AI Notes from textbook"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> AI Notes
                    </button>

                    <button
                      onClick={() => handle1ClickSummary(chap.name, chap.bn)}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 transition flex items-center gap-1"
                      title="Generate Short Summary"
                    >
                      <ScrollText className="h-3.5 w-3.5 text-primary" /> Summary
                    </button>

                    <button
                      onClick={() => handle1ClickQuiz(chap.name)}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 transition flex items-center gap-1"
                      title="Practice Mock Quiz"
                    >
                      <Target className="h-3.5 w-3.5 text-primary" /> Quiz
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeSubject && (
          <div className="space-y-5">
            {activeSubject.chapters.map((chapter) => {
              const isExpanded = expandedChapters[chapter.id] !== false;
              const chCompleted = chapter.topics.filter((t) => t.status === "completed").length;

              return (
                <div key={chapter.id} className="panel overflow-hidden border-border/70">
                  {/* Chapter Header */}
                  <div
                    onClick={() => toggleChapter(chapter.id)}
                    className="flex cursor-pointer items-center justify-between bg-card/80 p-4 transition hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary font-mono text-xs font-bold">
                        {chapter.chapterNumber}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Chapter {chapter.chapterNumber}: {chapter.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {chCompleted} / {chapter.topics.length} topics completed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handle1ClickQuiz(chapter.title);
                        }}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition hidden sm:flex items-center gap-1"
                      >
                        <Target className="h-3.5 w-3.5" /> Chapter Quiz
                      </button>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Topics List */}
                  {isExpanded && (
                    <div className="divide-y divide-border/40 p-2 sm:p-4">
                      {chapter.topics.map((topic) => (
                        <div key={topic.id} className="p-3 sm:p-4 rounded-xl hover:bg-card/40 transition">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Status Toggle Button */}
                              <button
                                onClick={() => {
                                  const nextStatus =
                                    topic.status === "completed"
                                      ? "not-started"
                                      : topic.status === "in-progress"
                                      ? "completed"
                                      : "in-progress";
                                  handleStatusChange(chapter.id, topic.id, nextStatus);
                                }}
                                className="mt-0.5 text-muted-foreground hover:text-primary transition"
                                title="Click to toggle status"
                              >
                                {topic.status === "completed" ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                ) : topic.status === "in-progress" ? (
                                  <Clock className="h-5 w-5 text-amber-400" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground/60" />
                                )}
                              </button>

                              <div>
                                <h4 className={`text-sm font-semibold ${
                                  topic.status === "completed" ? "text-foreground line-through opacity-80" : "text-foreground"
                                }`}>
                                  {topic.title}
                                </h4>

                                {/* Learning Objectives */}
                                <div className="mt-2 space-y-1">
                                  {topic.objectives.map((obj, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="h-1 w-1 rounded-full bg-primary/70 shrink-0" />
                                      <span>{obj}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 1-Click Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center ml-8 sm:ml-0">
                              <button
                                onClick={() => handle1ClickGenerateNotes(chapter.title, topic.title)}
                                className="rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1"
                                title="1-Click: Generate focused notes for this topic"
                              >
                                <Sparkles className="h-3 w-3" /> Notes
                              </button>

                              <button
                                onClick={() => handle1ClickSummary(chapter.title, topic.title)}
                                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/50 transition flex items-center gap-1"
                                title="1-Click: Break down topic summary"
                              >
                                <ScrollText className="h-3 w-3 text-primary" /> Summary
                              </button>

                              <button
                                onClick={() => handle1ClickQuiz(chapter.title)}
                                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/50 transition flex items-center gap-1"
                                title="1-Click: Practice quiz"
                              >
                                <Target className="h-3 w-3 text-primary" /> Quiz
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
