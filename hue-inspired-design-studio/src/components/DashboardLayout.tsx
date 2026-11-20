import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import {
  BrainCircuit, FileUp, NotebookPen, Target, Zap, FileEdit, Sparkles,
  BarChart3, Coins, LogOut, Menu, X, Home, Bot, ScrollText,
  FileQuestion, ListChecks, GitBranch, GraduationCap, Brain, BookOpenCheck
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { getUser, logout, isAuthenticated, setClassLevel } from "@/lib/store";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { toast } from "sonner";

type To = NonNullable<LinkProps["to"]>;

interface NavLinkItem {
  to: To;
  icon: any;
  label: string;
  comingSoon?: boolean;
}

interface NavGroup {
  title: string;
  links: NavLinkItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "AI Tools",
    links: [
      { to: "/dashboard" as To, icon: Home, label: "Overview" },
      { to: "/dashboard/prediction" as To, icon: BookOpenCheck, label: "AI Syllabus & Book Analyzer" },
      { to: "/dashboard/editor" as To, icon: FileEdit, label: "Real-Time Editor" },
      { to: "/dashboard/upload" as To, icon: FileUp, label: "PDF & Upload" },
      { to: "/dashboard/notes" as To, icon: NotebookPen, label: "AI Note Generator" },
      { to: "/dashboard/summaries" as To, icon: ScrollText, label: "Topic Summaries" },
      { to: "/dashboard/question-analysis" as To, icon: Brain, label: "AI Question Analysis" },
      { to: "/dashboard/revision" as To, icon: Zap, label: "Revision Sheets" },
    ],
  },
  {
    title: "Study & Practice",
    links: [
      { to: "/dashboard/syllabus" as To, icon: ListChecks, label: "Syllabus Learning" },
      { to: "/dashboard/graph" as To, icon: GitBranch, label: "Dependency Graph" },
      { to: "/dashboard/quiz" as To, icon: Target, label: "Quizzes & Tests" },
      { to: "/dashboard/tutor" as To, icon: Bot, label: "AI Study Tutor" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { to: "/dashboard/progress" as To, icon: BarChart3, label: "Learning Progress" },
      { to: "/dashboard/wallet" as To, icon: Coins, label: "Coin Wallet" },
    ],
  },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getUser();
  const [currentClass, setCurrentClassState] = useState<string>(() => user?.classLevel || "9-10");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      const redirectPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/dashboard";
      navigate({
        to: "/login",
        search: {
          redirect: redirectPath,
          message: "Please log in or register to access this Brain Nest AI study feature.",
        } as any,
      });
    }
  }, [navigate]);

  if (!isAuthenticated()) {
    const redirectPath = typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/dashboard";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background blueprint px-4">
        <div className="panel max-w-md w-full p-8 text-center bg-card border border-border shadow-2xl rounded-2xl">
          <div className="flex justify-center mb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/40 bg-accent shadow-glow">
              <BrainCircuit className="h-6 w-6 text-primary animate-pulse" />
            </span>
          </div>
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            All Brain Nest AI study features require a verified account. Please log in or register to continue.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to="/login"
              search={{ redirect: redirectPath } as any}
              className="rounded-xl bg-gradient-primary py-2.5 px-4 font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition text-sm flex items-center justify-center gap-2"
            >
              Log In to Continue
            </Link>
            <Link
              to="/signup"
              search={{ redirect: redirectPath } as any}
              className="rounded-xl border border-border py-2.5 px-4 text-xs font-semibold hover:border-primary transition text-foreground"
            >
              Create Free Account (+500 Starter Coins)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleClassChange = async (newClass: string) => {
    setCurrentClassState(newClass);
    setClassLevel(newClass);
    try {
      await api.updateClassLevel(newClass);
    } catch (err) {
      console.warn("Failed to update class level on server:", err);
    }
    // Reload slightly to re-render files
    window.location.reload();
  };

  const handleLogout = () => {
    api.logout();
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background blueprint">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/60 bg-sidebar z-30">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-accent">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Brain<span className="text-primary">Nest</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Dashboard">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.links.map((link) => (
                  link.comingSoon ? (
                    <div
                      key={link.to as string}
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("AI Syllabus Predictor is Coming Soon!");
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50 cursor-not-allowed hover:bg-sidebar-accent/50 select-none transition-colors"
                      title="Coming Soon"
                    >
                      <link.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="flex-1 truncate">{link.label}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Coming Soon
                      </span>
                    </div>
                  ) : (
                    <Link
                      key={link.to as string}
                      to={link.to}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeProps={{ className: "!bg-sidebar-accent !text-primary font-semibold" }}
                      activeOptions={{ exact: link.to === "/dashboard" }}
                    >
                      <link.icon className="h-3.5 w-3.5" />
                      <span>{link.label}</span>
                    </Link>
                  )
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3.5 space-y-2.5">
          {/* Class Level Selector */}
          <div className="rounded-lg border border-border/60 bg-accent/40 p-2">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-primary" /> Class Level
              </span>
              <span className="text-[10px] rounded bg-primary/10 px-1.5 py-0.2 font-semibold text-primary">
                {currentClass === "9-10" ? "Class 9-10" : currentClass === "11-12" ? "Class 11-12" : "University"}
              </span>
            </div>
            <select
              value={currentClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="9-10">Class 9-10 (SSC / NCTB)</option>
              <option value="11-12">Class 11-12 (HSC)</option>
              <option value="university">University / Higher Studies</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold">{user?.name || "User"}</p>
              <p className="truncate text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <Coins className="h-3 w-3 text-primary" />{user?.coins ?? 0} coins
              </p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-1.5 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground" title="Log out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
              <Link to="/" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-accent">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                </span>
                <span className="font-display text-lg font-semibold">
                  Brain<span className="text-primary">Nest</span>
                </span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 hover:bg-sidebar-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.links.map((link) => (
                      link.comingSoon ? (
                        <div
                          key={link.to as string}
                          onClick={(e) => {
                            e.preventDefault();
                            toast.info("AI Syllabus Predictor is Coming Soon!");
                          }}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50 cursor-not-allowed hover:bg-sidebar-accent/50 select-none transition-colors"
                          title="Coming Soon"
                        >
                          <link.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span className="flex-1 truncate">{link.label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Coming Soon
                          </span>
                        </div>
                      ) : (
                        <Link
                          key={link.to as string}
                          to={link.to}
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          activeProps={{ className: "!bg-sidebar-accent !text-primary font-semibold" }}
                          activeOptions={{ exact: link.to === "/dashboard" }}
                        >
                          <link.icon className="h-3.5 w-3.5" />
                          <span>{link.label}</span>
                        </Link>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-sidebar-border p-4">
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-destructive hover:bg-sidebar-accent">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Top bar - mobile */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/60 bg-background/85 backdrop-blur px-5 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg border border-border p-2">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">Brain<span className="text-primary">Nest</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="h-3.5 w-3.5 text-primary" />
            {user?.coins ?? 0}
          </div>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
