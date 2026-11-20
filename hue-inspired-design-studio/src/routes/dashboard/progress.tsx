import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getProgress, getQuizzes, getNotes, getFiles, getUser,
  type SubjectProgress
} from "@/lib/store";
import {
  BarChart3, Flame, Trophy, Award, Target, BookOpen,
  CheckCircle2, TrendingUp, Sparkles, Star
} from "lucide-react";

export const Route = createFileRoute("/dashboard/progress")({
  head: () => ({
    meta: [
      { title: "Study Progress — Brain Nest" },
      { name: "description", content: "Track your subject mastery, quiz scores, daily streaks, and learning achievements." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const user = getUser();
  const [progress] = useState<SubjectProgress[]>(() => getProgress());
  const [quizzes] = useState(() => getQuizzes());
  const [notes] = useState(() => getNotes());
  const [files] = useState(() => getFiles());

  const completedQuizzes = quizzes.filter((q) => q.score !== undefined);
  const totalScore = completedQuizzes.reduce((acc, q) => acc + q.score!, 0);
  const totalQuestions = completedQuizzes.reduce((acc, q) => acc + q.totalQuestions, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 85;

  const achievements = [
    {
      title: "First Steps",
      desc: "Uploaded your first textbook or lecture file",
      unlocked: files.length > 0,
      icon: CheckCircle2,
      reward: "+50 Coins",
    },
    {
      title: "Knowledge Architect",
      desc: "Generated your first comprehensive AI study note",
      unlocked: notes.length > 0,
      icon: Sparkles,
      reward: "+30 Coins",
    },
    {
      title: "Quiz Master",
      desc: "Completed an adaptive quiz with 70%+ score",
      unlocked: completedQuizzes.some((q) => (q.score! / q.totalQuestions) >= 0.7),
      icon: Trophy,
      reward: "+25 Coins",
    },
    {
      title: "7-Day Study Streak",
      desc: "Logged in and studied for 7 consecutive days",
      unlocked: true,
      icon: Flame,
      reward: "+100 Coins",
    },
    {
      title: "Polymath Scholar",
      desc: "Created study materials across multiple disciplines",
      unlocked: progress.length >= 2,
      icon: Award,
      reward: "+75 Coins",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
            <BarChart3 className="h-4 w-4" /> Learning Analytics & Mastery
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Study Progress</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor your subject comprehension, quiz performance, streaks, and milestone achievements.
          </p>
        </div>

        {/* Top Highlight Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="panel p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Flame className="h-4 w-4 text-amber-500" /> Active Streak
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-amber-400">7 Days 🔥</p>
            <p className="text-xs text-muted-foreground mt-0.5">Top 5% of active learners</p>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Target className="h-4 w-4 text-primary" /> Overall Quiz Accuracy
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-gradient">{overallAccuracy}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">{completedQuizzes.length} quizzes evaluated</p>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <BookOpen className="h-4 w-4 text-emerald-400" /> Notes Generated
            </div>
            <p className="mt-2 font-display text-3xl font-bold">{notes.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Across {progress.length} subjects</p>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Star className="h-4 w-4 text-primary" /> Total Study Coins
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-primary">{user.coins}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ready for AI generation</p>
          </div>
        </div>

        {/* Subject Mastery Progress Bars */}
        <div className="panel p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Subject Mastery</h2>
              <p className="text-xs text-muted-foreground">Estimated proficiency based on note creation and quiz results</p>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {progress.length} Active Subjects
            </span>
          </div>

          <div className="space-y-6">
            {progress.map((item) => {
              const mastery = Math.min(100, Math.max(30, item.averageScore || 75));
              return (
                <div key={item.subject} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      {item.subject}
                    </span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{item.chaptersCompleted} of {item.chaptersTotal} chapters reviewed</span>
                      <span className="font-semibold text-foreground">{mastery}% Mastery</span>
                    </div>
                  </div>

                  <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone Achievements */}
        <div className="panel p-6">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Milestone Achievements
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Unlock badges and earn bonus study coins as you study and complete quizzes.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((ach) => (
              <div
                key={ach.title}
                className={`rounded-2xl border p-4 transition ${
                  ach.unlocked
                    ? "border-primary/40 bg-primary/5 shadow-glow"
                    : "border-border bg-card/40 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      ach.unlocked ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <ach.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {ach.reward}
                  </span>
                </div>

                <h3 className="font-bold text-sm mt-3">{ach.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ach.desc}</p>

                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                  <span className={ach.unlocked ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {ach.unlocked ? "✓ Unlocked" : "In Progress"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
