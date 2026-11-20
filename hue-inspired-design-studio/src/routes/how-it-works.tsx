import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, PrimaryButton, SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Brain Nest" },
      { name: "description", content: "Upload, choose, process and practise: four steps from study material to exam preparation with Brain Nest." },
      { property: "og:title", content: "How Brain Nest Works" },
      { property: "og:description", content: "Four simple steps from study material to focused revision." },
    ],
  }),
  component: How,
});

const steps = [
  { t: "Upload or select", d: "Upload your study material — PDFs, DOCX notes, syllabuses or past papers — or select a subject you already created." },
  { t: "Choose your settings", d: "Pick a chapter, syllabus, difficulty level (Beginner, Intermediate, Advanced), language and the output type you need." },
  { t: "AI processing", d: "Brain Nest processes your material with AI. You see the coin cost before you confirm, and you are never charged twice for the same request." },
  { t: "Review and practise", d: "Review, edit, save, download, or turn the result into quizzes and revision sheets. Always check AI output against your sources." },
];

function How() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-5 py-16 md:py-20">
        <PageHero label="Process" title={<>From pages to <span className="text-gradient">mastery</span>.</>} />
        <ol className="relative mt-14 space-y-8 border-l border-primary/40 pl-10">
          {steps.map((s, i) => (
            <li key={s.t} className="relative">
              <span className="absolute -left-[3.15rem] grid h-8 w-8 place-items-center rounded-full bg-gradient-primary font-mono text-xs font-bold text-primary-foreground shadow-glow">{i + 1}</span>
              <div className="panel p-6">
                <h2 className="text-xl font-semibold">{s.t}</h2>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-muted-foreground">Processing time depends on the length and type of material. We make no guarantees about speed or accuracy — AI output can contain mistakes.</p>
        <div className="mt-10"><PrimaryButton>Start Learning Free <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
      </section>
    </SiteLayout>
  );
}
