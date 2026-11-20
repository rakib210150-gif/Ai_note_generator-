import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BookOpen, Coins, FileQuestion, FileText, FolderOpen, GitBranch, GraduationCap, Layers,
  ListChecks, NotebookPen, ShieldCheck, Sparkles, Target, TrendingUp, Upload, Bot, AlertTriangle, Check,
} from "lucide-react";
import hero from "@/assets/hero-brain.jpg";
import { GhostButton, PrimaryButton, SectionLabel, SiteLayout } from "@/components/SiteLayout";
import { features } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brain Nest — AI Powered Intelligence Platform for Learners" },
      { name: "description", content: "Turn PDFs, textbooks, syllabuses and lecture notes into clear, exam-focused study materials with AI." },
      { property: "og:title", content: "Brain Nest — Your Smarter Way to Study Starts Here" },
      { property: "og:description", content: "AI-powered study and exam preparation: notes, revision, quizzes and question analysis in one workspace." },
    ],
  }),
  component: Index,
});

const values = ["Notes tailored to your study goals.", "Revision and practice in one workspace.", "Study materials organized in one place."];
const problems = [
  { t: "Lengthy textbooks", d: "Hundreds of pages, little time to find what matters." },
  { t: "Scattered materials", d: "PDFs, notes and past papers spread across devices." },
  { t: "Limited revision time", d: "Exams arrive before the reading is done." },
  { t: "Unclear priorities", d: "Hard to tell which topics deserve the most attention." },
];
const steps = [
  "Upload your study material or select a subject.",
  "Choose a chapter, syllabus, difficulty level, and output type.",
  "Let Brain Nest process your material with AI.",
  "Review, edit, save, download, or practice with your generated content.",
];

function Index() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-2 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-4 py-1.5 font-mono text-xs text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Learn Smarter. Prepare Better. Achieve More.
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            Your Smarter Way to <span className="text-gradient">Study Starts Here.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Turn PDFs, textbooks, syllabuses, and lecture notes into clear, exam-focused study materials with AI. Spend less time organizing information and more time understanding it.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PrimaryButton>Start Learning Free <ArrowRight className="h-4 w-4" /></PrimaryButton>
            <GhostButton to="/features">Explore Features</GhostButton>
          </div>
          <ul className="mt-10 space-y-3 border-t border-border pt-6">
            {values.map((v) => (
              <li key={v} className="flex items-center gap-3 text-sm"><Check className="h-4 w-4 text-primary" />{v}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-10 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 animate-ring" />
          <img src={hero} alt="Glowing wireframe brain wearing a graduation cap" width={1280} height={1024} className="relative animate-float rounded-3xl border border-border shadow-glow" />
          <div className="absolute -bottom-6 left-2 panel flex items-center gap-3 px-4 py-3 backdrop-blur sm:-left-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Chapter 7 · Short notes</p>
              <p className="font-mono text-xs text-muted-foreground">sample preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / solution */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionLabel>The problem</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Studying is hard when everything is everywhere.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {problems.map((p) => (
                <div key={p.t} className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                  <h3 className="font-semibold">{p.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel flex flex-col justify-center p-8 md:p-10">
            <SectionLabel>The solution</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold">One organized learning workspace.</h2>
            <p className="mt-4 text-muted-foreground">Brain Nest helps you summarize, structure, review and practice your own materials — so your time goes into understanding, not sorting files.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs">
              {["Summarize", "Structure", "Review", "Practice"].map((s) => (
                <span key={s} className="rounded-lg border border-primary/40 bg-accent px-3 py-2 text-accent-foreground">→ {s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionLabel>AI study toolkit</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold md:text-5xl">Every tool your brain needs, in one nest.</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((t, i) => (
            <Link key={t.title} to={t.path as any} className="panel group block p-6 hover:border-primary/60 hover:shadow-glow transition-all duration-300">
              <div className="flex items-center justify-between">
                <t.icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" aria-hidden />
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold group-hover:text-primary transition-colors">{t.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.short}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary opacity-80 group-hover:opacity-100 font-medium">Open {t.cta} <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold md:text-5xl">Four steps from pages to practice.</h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s} className="panel p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary font-mono text-sm font-bold text-primary-foreground">{i + 1}</span>
              <p className="mt-5 text-sm">{s}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-muted-foreground">Processing time depends on the size and type of your material. AI output should always be reviewed.</p>
      </section>

      {/* Syllabus + Question analysis */}
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 lg:grid-cols-2">
        <div className="panel p-8">
          <ListChecks className="h-8 w-8 text-primary" />
          <SectionLabel>Syllabus-focused</SectionLabel>
          <h2 className="mt-2 text-3xl font-bold">Learning aligned to <em className="not-italic text-primary">your</em> syllabus.</h2>
          <p className="mt-4 text-muted-foreground">Organize subjects, chapters, learning objectives and reference materials. Notes are generated against the syllabus you supply — not generic AI answers.</p>
          <div className="mt-6 space-y-2 font-mono text-xs">
            {[["Physics", "Ch 4 · Motion", "In progress"], ["Physics", "Ch 5 · Forces", "Not started"], ["Chemistry", "Ch 2 · Atoms", "Completed"]].map(([s, c, st]) => (
              <div key={c} className="flex justify-between rounded-lg border border-border bg-background/50 px-3 py-2"><span>{s} / {c}</span><span className="text-primary">{st}</span></div>
            ))}
            <p className="text-muted-foreground">sample data</p>
          </div>
        </div>
        <div className="panel p-8">
          <FileQuestion className="h-8 w-8 text-primary" />
          <SectionLabel>Previous-question analysis</SectionLabel>
          <h2 className="mt-2 text-3xl font-bold">See patterns in past papers.</h2>
          <p className="mt-4 text-muted-foreground">Upload historical examination papers to identify recurring topics, question formats and revision priorities — based only on the papers you analyze.</p>
          <div className="mt-6 flex gap-3 rounded-lg border border-chart-4/40 bg-chart-4/10 p-4 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-chart-4" />
            <p>Historical patterns do not guarantee future examination questions.</p>
          </div>
        </div>
      </section>

      {/* Workspace preview */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Study workspace</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Your dashboard, at a glance.</h2>
          </div>
          <span className="rounded-full border border-chart-4/50 px-3 py-1 font-mono text-xs text-chart-4">Sample data — illustration only</span>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="panel p-6 md:col-span-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><NotebookPen className="h-4 w-4 text-primary" /> Generated notes</div>
            <h3 className="mt-3 text-xl font-semibold">Newton's Laws of Motion — Short Notes</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• First law: a body stays at rest or in uniform motion unless acted on by a net force.</li>
              <li>• Second law: F = m·a — force equals mass times acceleration.</li>
              <li>• Third law: every action has an equal and opposite reaction.</li>
            </ul>
          </div>
          <div className="panel p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Coins className="h-4 w-4 text-primary" /> Remaining coins</div>
            <p className="mt-3 font-display text-5xl font-bold text-primary">420</p>
            <p className="mt-1 text-xs text-muted-foreground">of 500 starter coins</p>
          </div>
          <div className="panel p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><FolderOpen className="h-4 w-4 text-primary" /> Saved documents</div>
            <ul className="mt-3 space-y-2 text-sm">
              {["physics_ch4.pdf", "chem_syllabus.docx", "math_2023_paper.pdf"].map((d) => <li key={d} className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d}</li>)}
            </ul>
          </div>
          <div className="panel p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4 text-primary" /> Recent quizzes</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span>Motion — MCQ</span><span className="text-primary">8/10</span></li>
              <li className="flex justify-between"><span>Atoms — True/False</span><span className="text-primary">6/10</span></li>
            </ul>
          </div>
          <div className="panel p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-primary" /> Subject progress</div>
            {[["Physics", 60], ["Chemistry", 35], ["Math", 80]].map(([s, v]) => (
              <div key={s} className="mt-3">
                <div className="flex justify-between text-xs"><span>{s}</span><span>{v}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free coins */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="panel relative overflow-hidden p-8 md:p-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-2">
            <div>
              <Coins className="h-10 w-10 text-primary" />
              <h2 className="mt-4 text-3xl font-bold md:text-5xl">Start with <span className="text-gradient">500 Free Coins</span></h2>
              <p className="mt-4 text-muted-foreground">Create your account and receive 500 starter coins after completing the required account verification. Use your coins for eligible AI-powered study tools.</p>
              <div className="mt-8"><PrimaryButton>Get Started Free <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-6">
              <p className="font-semibold">Reward conditions</p>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />One reward per new account.</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />Granted after your email address is verified.</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />Coins can be used on eligible AI tools only.</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />Coin cost varies by feature and the size of the operation; you see the cost before confirming.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible AI */}
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 md:grid-cols-2">
        <div className="panel p-8">
          <Bot className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Responsible AI</h2>
          <p className="mt-3 text-muted-foreground">AI-generated material can contain errors or omissions. Always verify critical information against your syllabus, textbooks and teacher-provided resources.</p>
        </div>
        <div className="panel p-8">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Your documents stay private</h2>
          <p className="mt-3 text-muted-foreground">Uploaded study materials are stored privately for your account and are never shown to other users.</p>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionLabel>Pricing</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold md:text-5xl">Plans for every learner.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3 items-stretch">
          {[
            { n: "Free", p: "Free", sub: "500 starter credits", i: GraduationCap, hot: false },
            { n: "Pro", p: "$15/mo", sub: "5,000 monthly credits", i: Layers, hot: true },
            { n: "Platinum", p: "$25/mo", sub: "35,000 monthly credits", i: Sparkles, hot: false },
          ].map((p) => (
            <div
              key={p.n}
              className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none ${
                p.hot
                  ? "border-2 border-primary bg-card/90 shadow-[0_0_35px_-8px_oklch(0.82_0.13_185_/_0.35)] backdrop-blur-md hover:border-primary hover:shadow-[0_0_50px_-5px_oklch(0.82_0.13_185_/_0.55)] md:-translate-y-1.5 md:hover:-translate-y-2"
                  : "panel border border-border/80 bg-card/60 hover:-translate-y-1 hover:border-primary/50"
              }`}
            >
              {p.hot && (
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/70 bg-background/95 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary shadow-[0_0_15px_-3px_oklch(0.82_0.13_185_/_0.5)]">
                    <Sparkles className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                    MOST POPULAR
                  </span>
                </div>
              )}
              <p.i className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">{p.n}</h3>
              <p className="mt-1 font-display text-2xl font-bold text-primary">{p.p}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-6"><GhostButton to="/pricing">Compare plans</GhostButton></div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-5 py-24 text-center">
        <Upload className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-4xl font-bold md:text-6xl">Make Every Study Session <span className="text-gradient">Count.</span></h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Build your study workspace, organize your materials, and prepare with a clearer plan.</p>
        <div className="mt-8"><PrimaryButton>Create Your Free Account <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
      </section>
    </SiteLayout>
  );
}
