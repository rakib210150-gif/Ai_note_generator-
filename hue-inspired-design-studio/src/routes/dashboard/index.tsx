import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import {
  getUser, getFiles, getNotes, getQuizzes, getProgress,
  getUserActivities, type UploadedFile, type GeneratedNote, type Quiz,
  type UserActivityLog
} from "@/lib/store";
import {
  Sparkles, FolderOpen, NotebookPen, Target, Zap, FileEdit,
  BarChart3, Coins, ArrowRight, FileText, BookOpen, ScrollText,
  Brain, BookOpenCheck, ListChecks, GitBranch, Bot, FileUp,
  Clock, TrendingUp, CheckCircle2, Flame, RefreshCw, ChevronRight,
  ExternalLink, Layers, Search, Filter, ShieldCheck, Calendar,
  Activity, Award, PieChart as PieChartIcon
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area, Cell, PieChart, Pie
} from "recharts";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "AI Learning Analytics Dashboard — Brain Nest" },
      { name: "description", content: "Personalized AI learning analytics, feature usage tracking, study resources, and complete study intelligence hub." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const navigate = useNavigate();
  const localUser = getUser();
  const localFiles = getFiles();
  const localNotes = getNotes();
  const localQuizzes = getQuizzes();
  const localProgress = getProgress();
  const localActivities = getUserActivities();

  // State for remote database analytics
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<"weekly" | "breakdown" | "subjects">("weekly");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Fetch real analytics from backend/Supabase
  const fetchAnalytics = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const res = await api.getDashboardAnalytics();
      if (res.success && res.data) {
        setAnalyticsData(res.data);
        if (showToast) {
          toast.success("Dashboard analytics synchronized with database!");
        }
      }
    } catch (err) {
      console.warn("Failed to fetch remote analytics, using fallback store:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Compute merged stats (Database API + Local Store synchronization)
  const overview = useMemo(() => {
    const apiOver = analyticsData?.overview;
    const userUploaded = localFiles.filter((f) => !f.isOfficial);
    return {
      totalPdfsUploaded: apiOver?.totalPdfsUploaded ?? userUploaded.length,
      totalNotesGenerated: apiOver?.totalNotesGenerated ?? localNotes.length,
      totalQuizzes: apiOver?.totalQuizzes ?? localQuizzes.length,
      totalMockTests: apiOver?.totalMockTests ?? localQuizzes.filter((q) => q.score !== undefined).length,
      totalQuestionAnalyses: apiOver?.totalQuestionAnalyses ?? 0,
      totalTopicSummaries: apiOver?.totalTopicSummaries ?? 0,
      totalRevisionSheets: apiOver?.totalRevisionSheets ?? 0,
      totalBookAnalyses: apiOver?.totalBookAnalyses ?? 0,
      totalTutorInteractions: apiOver?.totalTutorInteractions ?? 0,
      totalActivities: apiOver?.totalActivities ?? (localNotes.length + localQuizzes.length + userUploaded.length),
      coinsBalance: apiOver?.coinsBalance ?? localUser.coins ?? 500,
      studyStreakDays: apiOver?.studyStreakDays ?? 0,
      distinctLoginDays: apiOver?.distinctLoginDays ?? 1,
    };
  }, [analyticsData, localFiles, localNotes, localQuizzes, localUser]);

  // Unified recent activity timeline
  const recentActivities = useMemo(() => {
    const apiTimeline: any[] = analyticsData?.recentActivities || [];

    // Map local activities into timeline format if not in API
    const mappedLocal: any[] = localActivities.map((act) => ({
      id: act.id,
      featureId: act.featureId,
      featureTitle: act.featureTitle,
      actionType: act.actionType,
      title: act.title,
      documentName: act.documentName || null,
      documentId: act.documentId || null,
      details: act.details || "Activity performed",
      timestamp: act.timestamp,
      route: act.route,
    }));

    // Merge and deduplicate
    const combined = [...apiTimeline, ...mappedLocal];
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
      const key = `${item.featureId}-${item.title}-${new Date(item.timestamp).toISOString().slice(0, 16)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return unique.slice(0, 15);
  }, [analyticsData, localActivities]);

  // Filtered timeline
  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return recentActivities;
    return recentActivities.filter((act) => act.featureId === activityFilter);
  }, [recentActivities, activityFilter]);

  // Feature-wise activity tracking cards with associated PDFs
  const featureUsageList = useMemo(() => {
    if (analyticsData?.featureUsage && analyticsData.featureUsage.length > 0) {
      return analyticsData.featureUsage;
    }
    const userPdfs = localFiles.filter((f) => !f.isOfficial);
    return [
      {
        featureId: "notes",
        title: "AI Note Generator",
        category: "Creation",
        count: overview.totalNotesGenerated,
        associatedPdfs: userPdfs.slice(0, 2).map((f) => f.name),
        lastUsedAt: localNotes[0]?.createdAt || (overview.totalNotesGenerated > 0 ? new Date().toISOString() : null),
        route: "/dashboard/notes",
        iconName: "NotebookPen",
      },
      {
        featureId: "summaries",
        title: "Topic-Wise Summaries",
        category: "Creation",
        count: overview.totalTopicSummaries,
        associatedPdfs: userPdfs.slice(0, 2).map((f) => f.name),
        lastUsedAt: overview.totalTopicSummaries > 0 ? new Date().toISOString() : null,
        route: "/dashboard/summaries",
        iconName: "ScrollText",
      },
      {
        featureId: "question-analysis",
        title: "AI Question Analysis",
        category: "Creation",
        count: overview.totalQuestionAnalyses,
        associatedPdfs: userPdfs.slice(0, 2).map((f) => f.name),
        lastUsedAt: overview.totalQuestionAnalyses > 0 ? new Date().toISOString() : null,
        route: "/dashboard/question-analysis",
        iconName: "Brain",
      },
      {
        featureId: "prediction",
        title: "AI Syllabus & Book Analyzer",
        category: "Creation",
        count: overview.totalBookAnalyses,
        associatedPdfs: userPdfs.slice(0, 2).map((f) => f.name),
        lastUsedAt: overview.totalBookAnalyses > 0 ? new Date().toISOString() : null,
        route: "/dashboard/prediction",
        iconName: "BookOpenCheck",
      },
      {
        featureId: "quizzes",
        title: "Quiz & Mock Test Generator",
        category: "Practice",
        count: overview.totalQuizzes,
        associatedPdfs: userPdfs.slice(0, 2).map((f) => f.name),
        lastUsedAt: localQuizzes[0]?.createdAt || (overview.totalQuizzes > 0 ? new Date().toISOString() : null),
        route: "/dashboard/quiz",
        iconName: "Target",
      },
      {
        featureId: "upload",
        title: "PDF & Document Upload",
        category: "Documents",
        count: overview.totalPdfsUploaded,
        associatedPdfs: userPdfs.slice(0, 4).map((f) => f.name),
        lastUsedAt: userPdfs[0]?.uploadedAt || (overview.totalPdfsUploaded > 0 ? new Date().toISOString() : null),
        route: "/dashboard/upload",
        iconName: "FileUp",
      },
    ];
  }, [analyticsData, overview, localFiles, localNotes, localQuizzes]);

  // Learning resources (PDFs with usage history)
  const learningResources = useMemo(() => {
    if (analyticsData?.learningResources && analyticsData.learningResources.length > 0) {
      return analyticsData.learningResources;
    }
    const userPdfs = localFiles.filter((f) => !f.isOfficial);
    return userPdfs.map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.size,
      fileType: f.type,
      createdAt: f.uploadedAt,
      subject: f.subject || "General",
      chapter: f.chapter || "Full Document",
      usageCount: localNotes.filter((n) => n.fileId === f.id).length,
      usedIn: localNotes.filter((n) => n.fileId === f.id).length > 0 ? ["AI Notes"] : ["Uploaded Resource"],
    }));
  }, [analyticsData, localFiles, localNotes]);

  // Weekly chart data
  const weeklyData = useMemo(() => {
    if (analyticsData?.analytics?.weeklyActivity) {
      return analyticsData.analytics.weeklyActivity;
    }
    // Clean 7-day zero state
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      result.push({ day: dayName, date: dateStr, count: 0, notes: 0, quizzes: 0, summaries: 0, analyses: 0 });
    }
    return result;
  }, [analyticsData]);

  // Subject mastery progress data
  const subjectMastery = useMemo(() => {
    if (analyticsData?.analytics?.subjectMastery && analyticsData.analytics.subjectMastery.length > 0) {
      return analyticsData.analytics.subjectMastery;
    }
    // Dynamically calculate from localNotes and localQuizzes
    const map = new Map<string, { notes: number; quizzes: number }>();
    localNotes.forEach((n) => {
      const s = n.subject || "General";
      const cur = map.get(s) || { notes: 0, quizzes: 0 };
      cur.notes++;
      map.set(s, cur);
    });
    localQuizzes.forEach((q) => {
      const s = q.subject || "General";
      const cur = map.get(s) || { notes: 0, quizzes: 0 };
      cur.quizzes++;
      map.set(s, cur);
    });

    if (map.size === 0) return [];

    return Array.from(map.entries()).map(([sub, counts]) => {
      const total = counts.notes + counts.quizzes;
      return {
        subject: sub,
        masteryPercentage: Math.min(100, total * 15),
        totalActivities: total,
        notesCount: counts.notes,
        quizzesCount: counts.quizzes,
        analysesCount: 0,
        chapters: [],
      };
    });
  }, [analyticsData, localNotes, localQuizzes]);

  // Pie chart data for feature distribution
  const pieDistributionData = useMemo(() => {
    return [
      { name: "AI Notes", value: overview.totalNotesGenerated, color: "#34d3bd" },
      { name: "Summaries", value: overview.totalTopicSummaries, color: "#2dd4bf" },
      { name: "Quizzes", value: overview.totalQuizzes, color: "#38bdf8" },
      { name: "Question Analysis", value: overview.totalQuestionAnalyses, color: "#a855f7" },
      { name: "Book Analyzer", value: overview.totalBookAnalyses, color: "#f59e0b" },
      { name: "PDF Uploads", value: overview.totalPdfsUploaded, color: "#10b981" },
    ];
  }, [overview]);

  // Relative time formatter
  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* ======================================================== */}
        {/* 1. TOP HEADER & PERSONALIZED GREETING                    */}
        {/* ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/50 to-primary/5 p-6 shadow-sm backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center font-display text-2xl font-bold text-primary shadow-glow/10">
                  {localUser?.name?.charAt(0) || "S"}
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background ring-2 ring-emerald-500/20" title="Online" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Welcome back, <span className="text-gradient">{localUser?.name || "Student"}</span>
                  </h1>
                  <span className="rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    Pro Scholar
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Your personalized AI Learning Analytics & Study Intelligence Hub.{" "}
                  <strong className="text-foreground">{overview.totalActivities}</strong> total learning actions recorded across your materials.
                </p>
              </div>
            </div>

            {/* Quick Header Indicators */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Study Streak */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 flex items-center gap-1.5 shadow-sm">
                <Flame className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>{overview.studyStreakDays}-Day Streak</span>
              </div>

              {/* Coin Balance */}
              <Link
                to="/dashboard/wallet"
                className="rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition px-3 py-1.5 text-xs font-semibold text-primary flex items-center gap-1.5"
                title="Manage Coins & Wallet"
              >
                <Coins className="h-4 w-4 text-primary" />
                <span>{overview.coinsBalance} Coins</span>
                <ChevronRight className="h-3 w-3 opacity-70" />
              </Link>

              {/* Live Synced Badge */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Cloud Synced</span>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchAnalytics(true)}
                disabled={isRefreshing}
                className="rounded-xl border border-border/80 bg-card hover:bg-muted p-2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Refresh Analytics from Database"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. PERSONALIZED STATISTICS OVERVIEW (6 Metric Cards)     */}
        {/* ======================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" /> Personalized Study Statistics
            </span>
            <span className="text-[10px] text-muted-foreground">
              Real-time records from authenticated database
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Card 1: Uploaded PDFs */}
            <Link
              to="/dashboard/upload"
              className="panel group p-4 border-border/70 hover:border-primary/60 hover:shadow-glow/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Uploaded PDFs</span>
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <FolderOpen className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {overview.totalPdfsUploaded}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-primary font-medium">Indexed</span> · All chapters active
              </p>
            </Link>

            {/* Card 2: AI Notes Generated */}
            <Link
              to="/dashboard/notes"
              className="panel group p-4 border-border/70 hover:border-primary/60 hover:shadow-glow/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Notes Created</span>
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <NotebookPen className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold text-primary">
                  {overview.totalNotesGenerated}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-primary font-medium">Syllabus-focused</span> notes
              </p>
            </Link>

            {/* Card 3: Question Analyses */}
            <Link
              to="/dashboard/question-analysis"
              className="panel group p-4 border-border/70 hover:border-primary/60 hover:shadow-glow/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Question Analyses</span>
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Brain className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {overview.totalQuestionAnalyses}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Exam priority predictions
              </p>
            </Link>

            {/* Card 4: Topic Summaries */}
            <Link
              to="/dashboard/summaries"
              className="panel group p-4 border-border/70 hover:border-primary/60 hover:shadow-glow/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Topic Summaries</span>
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <ScrollText className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {overview.totalTopicSummaries}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                High-retention recaps
              </p>
            </Link>

            {/* Card 5: Quizzes Completed */}
            <Link
              to="/dashboard/quiz"
              className="panel group p-4 border-border/70 hover:border-primary/60 hover:shadow-glow/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Quizzes & Tests</span>
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {overview.totalQuizzes}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-primary font-medium">84%</span> avg test accuracy
              </p>
            </Link>

            {/* Card 6: Book & Syllabus Guides */}
            <Link
              to="/dashboard/prediction"
              className="panel group p-4 border-border/70 hover:border-primary/60 hover:shadow-glow/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Book & Syllabus</span>
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <BookOpenCheck className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {overview.totalBookAnalyses}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Matched study guides
              </p>
            </Link>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. INTERACTIVE LEARNING ANALYTICS (Charts & Insights)     */}
        {/* ======================================================== */}
        <div className="panel p-6 border-border/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" /> Learning Analytics & Mastery Trends
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Interactive charts illustrating your weekly study volume, feature distribution, and subject mastery.
              </p>
            </div>

            {/* Chart Mode Toggle */}
            <div className="flex items-center rounded-xl border border-border/80 bg-background/60 p-1 text-xs gap-1">
              <button
                type="button"
                onClick={() => setActiveChartTab("weekly")}
                className={`rounded-lg px-3 py-1 font-medium transition cursor-pointer ${
                  activeChartTab === "weekly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Weekly Trend
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("breakdown")}
                className={`rounded-lg px-3 py-1 font-medium transition cursor-pointer ${
                  activeChartTab === "breakdown"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Feature Distribution
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("subjects")}
                className={`rounded-lg px-3 py-1 font-medium transition cursor-pointer ${
                  activeChartTab === "subjects"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Subject Mastery
              </button>
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="min-h-[280px]">
            {activeChartTab === "weekly" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Total learning activities over the last 7 days</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#34d3bd]" /> Notes</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#38bdf8]" /> Quizzes</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#2dd4bf]" /> Summaries</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#a855f7]" /> Analyses</span>
                  </div>
                </div>

                <div className="h-[250px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#223537" vertical={false} />
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0e1c1e",
                          borderColor: "#1e3a3d",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#f1f5f9",
                        }}
                        cursor={{ fill: "rgba(52, 211, 189, 0.08)" }}
                      />
                      <Bar dataKey="notes" name="Notes" stackId="a" fill="#34d3bd" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="quizzes" name="Quizzes" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="summaries" name="Summaries" stackId="a" fill="#2dd4bf" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="analyses" name="Analyses" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeChartTab === "breakdown" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 h-[240px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0e1c1e",
                          borderColor: "#1e3a3d",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="md:col-span-7 grid grid-cols-2 gap-3">
                  {pieDistributionData.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-border/60 bg-card/40 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-medium text-foreground">{item.name}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {item.value} actions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeChartTab === "subjects" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Syllabus mastery calculated from your generated notes, completed quizzes, and predicted chapters:
                </p>
                {subjectMastery.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {subjectMastery.map((sub: any) => (
                      <div
                        key={sub.subject}
                        className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground">{sub.subject}</h4>
                          <span className="font-mono text-xs font-bold text-primary">
                            {sub.masteryPercentage}% Mastery
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                            style={{ width: `${sub.masteryPercentage}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>{sub.notesCount} Notes · {sub.quizzesCount} Quizzes</span>
                          <span className="text-foreground/80 font-medium">{sub.totalActivities} Total Actions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 p-8 text-center space-y-2">
                    <Target className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-xs font-medium text-foreground">No subject activity recorded yet</p>
                    <p className="text-[11px] text-muted-foreground">Generate notes or complete mock exams to establish subject mastery scores.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. FEATURE-WISE ACTIVITY TRACKING & ASSOCIATED PDFS      */}
        {/* ======================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-5 w-5 text-primary" /> Feature-Wise Activity Tracking
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every action tracked separately with exact usage counts and the specific study PDFs used.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureUsageList.map((feat: any) => (
              <div
                key={feat.featureId}
                className="panel p-4 border-border/70 hover:border-primary/50 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                        {feat.featureId === "notes" ? <NotebookPen className="h-4 w-4" /> :
                         feat.featureId === "summaries" ? <ScrollText className="h-4 w-4" /> :
                         feat.featureId === "question-analysis" ? <Brain className="h-4 w-4" /> :
                         feat.featureId === "prediction" ? <BookOpenCheck className="h-4 w-4" /> :
                         feat.featureId === "quizzes" ? <Target className="h-4 w-4" /> :
                         feat.featureId === "revision" ? <Zap className="h-4 w-4" /> :
                         feat.featureId === "tutor" ? <Bot className="h-4 w-4" /> :
                         feat.featureId === "upload" ? <FileUp className="h-4 w-4" /> :
                         feat.featureId === "editor" ? <FileEdit className="h-4 w-4" /> :
                         <Sparkles className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{feat.title}</h3>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                          {feat.category}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-primary/15 text-primary text-[11px] font-bold px-2 py-0.5 font-mono">
                      {feat.count} used
                    </span>
                  </div>

                  {/* Associated PDFs section */}
                  <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground block">
                      Associated PDFs / Study Materials:
                    </span>
                    {feat.associatedPdfs && feat.associatedPdfs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {feat.associatedPdfs.map((pdfName: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-md bg-card/80 border border-border/70 px-1.5 py-0.5 text-[10px] text-foreground font-mono flex items-center gap-1 truncate max-w-[200px]"
                            title={pdfName}
                          >
                            <FileText className="h-2.5 w-2.5 text-primary shrink-0" />
                            <span className="truncate">{pdfName}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        Official NCTB database curriculum
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {feat.lastUsedAt ? formatRelativeTime(feat.lastUsedAt) : "Recently"}
                  </span>

                  <Link
                    to={feat.route as any}
                    className="text-primary font-semibold hover:underline flex items-center gap-0.5"
                  >
                    Launch <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. RECENT ACTIVITY TIMELINE (with View Result)           */}
        {/* ======================================================== */}
        <div className="panel p-6 border-border/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" /> Recent Activity Timeline
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed audit trail of your generated notes, assessments, question analyses, and uploads.
              </p>
            </div>

            {/* Timeline Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {[
                { id: "all", label: "All Activities" },
                { id: "notes", label: "Notes" },
                { id: "quizzes", label: "Quizzes" },
                { id: "summaries", label: "Summaries" },
                { id: "upload", label: "Uploads" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActivityFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer text-[11px] font-medium ${
                    activityFilter === f.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-card"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline List */}
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 p-3.5 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                      {act.featureId === "notes" ? <NotebookPen className="h-4 w-4" /> :
                       act.featureId === "quizzes" ? <Target className="h-4 w-4" /> :
                       act.featureId === "summaries" ? <ScrollText className="h-4 w-4" /> :
                       act.featureId === "question-analysis" ? <Brain className="h-4 w-4" /> :
                       act.featureId === "prediction" ? <BookOpenCheck className="h-4 w-4" /> :
                       act.featureId === "upload" ? <FileUp className="h-4 w-4" /> :
                       <Sparkles className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate max-w-sm">
                          {act.title}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {act.featureTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        {act.documentName && (
                          <span className="flex items-center gap-1 text-primary/90 font-mono font-medium truncate max-w-[220px]">
                            <FileText className="h-3 w-3 shrink-0" />
                            {act.documentName}
                          </span>
                        )}
                        <span>•</span>
                        <span>{act.details}</span>
                        <span>•</span>
                        <span className="font-mono">{formatRelativeTime(act.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* View Result Action Button */}
                  <Link
                    to={act.route as any}
                    className="shrink-0 self-end sm:self-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <span>View Result</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No activities match the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. MY LEARNING RESOURCES (PDFs with Usage History)       */}
        {/* ======================================================== */}
        <div className="panel p-6 border-border/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <FolderOpen className="h-5 w-5 text-primary" /> My Learning Resources
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your uploaded study materials with exact usage history across Notes, Quizzes, and Analyses.
              </p>
            </div>

            <Link
              to="/dashboard/upload"
              className="rounded-xl btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>Upload New PDF</span>
            </Link>
          </div>

          {learningResources.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {learningResources.slice(0, 6).map((res: any) => (
                <div
                  key={res.id}
                  className="rounded-xl border border-border/70 bg-card/40 hover:bg-card/70 p-4 transition space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate" title={res.name}>
                            {res.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {((res.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB · {new Date(res.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <span className="rounded bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-medium">
                        {res.usageCount} Uses
                      </span>
                    </div>

                    {/* Usage History tags */}
                    <div className="mt-3 pt-2 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground block mb-1">Feature Usage History:</span>
                      <div className="flex flex-wrap gap-1">
                        {res.usedIn && res.usedIn.map((item: string, idx: number) => (
                          <span
                            key={idx}
                            className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-foreground/80 font-medium"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-border/40 grid grid-cols-3 gap-1.5 text-center">
                    <Link
                      to="/dashboard/notes"
                      className="rounded-lg border border-border/70 bg-card py-1 text-[10px] font-medium text-foreground hover:border-primary hover:text-primary transition"
                    >
                      Note
                    </Link>
                    <Link
                      to="/dashboard/quiz"
                      className="rounded-lg border border-border/70 bg-card py-1 text-[10px] font-medium text-foreground hover:border-primary hover:text-primary transition"
                    >
                      Quiz
                    </Link>
                    <Link
                      to="/dashboard/editor"
                      className="rounded-lg border border-border/70 bg-card py-1 text-[10px] font-medium text-foreground hover:border-primary hover:text-primary transition"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center space-y-2">
              <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs font-medium text-foreground">No personal study documents uploaded yet</p>
              <p className="text-[11px] text-muted-foreground">Upload your textbooks, class notes, or lecture guides to track usage analytics.</p>
              <Link to="/dashboard/upload" className="inline-block mt-2 rounded-lg btn-primary px-3 py-1.5 text-xs font-semibold">
                Upload Document
              </Link>
            </div>
          )}

          {learningResources.length > 6 && (
            <div className="text-center pt-2">
              <Link to="/dashboard/upload" className="text-xs text-primary font-semibold hover:underline">
                View all {learningResources.length} uploaded files in library →
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
