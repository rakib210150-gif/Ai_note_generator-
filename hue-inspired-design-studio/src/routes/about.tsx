import { createFileRoute } from "@tanstack/react-router";
import { Compass, HeartHandshake, ShieldCheck } from "lucide-react";
import { GhostButton, PageHero, SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Brain Nest — Our Mission" },
      { name: "description", content: "Brain Nest makes study materials more organized, understandable and useful through AI-assisted learning." },
      { property: "og:title", content: "About Brain Nest" },
      { property: "og:description", content: "Our mission: organized, understandable, AI-assisted learning for every student." },
    ],
  }),
  component: About,
});

const values = [
  { i: Compass, t: "Clarity first", d: "Turn long, scattered materials into structured, exam-focused content learners can actually use." },
  { i: ShieldCheck, t: "Honest AI", d: "We are clear about what AI can and cannot do, and encourage learners to verify important facts." },
  { i: HeartHandshake, t: "Built for learners", d: "For school, college, university and exam-preparation students, as well as teachers and institutions." },
];

function About() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-5 py-16 md:py-20">
        <PageHero label="About" title={<>Making study materials <span className="text-gradient">work for you</span>.</>} intro="Brain Nest's mission is to make study materials more organized, understandable and useful through AI-assisted learning — helping learners save time and prepare with a clearer plan." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.t} className="panel p-6">
              <v.i className="h-7 w-7 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{v.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4"><GhostButton to="/features">Explore features</GhostButton><GhostButton to="/contact">Contact us</GhostButton></div>
      </section>
    </SiteLayout>
  );
}
