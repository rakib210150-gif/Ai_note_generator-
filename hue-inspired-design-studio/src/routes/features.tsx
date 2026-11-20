import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { PageHero, PrimaryButton, SiteLayout } from "@/components/SiteLayout";
import { features } from "@/lib/content";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Brain Nest AI Study Tools" },
      { name: "description", content: "AI notes, syllabus question prediction, real-time document editor, past-paper analysis, revision sheets, quizzes, dependency maps, and AI tutor." },
      { property: "og:title", content: "Brain Nest Features — All 12 Interactive AI Study Tools" },
      { property: "og:description", content: "Twelve AI study tools for learners in one organized workspace." },
    ],
  }),
  component: Features,
});

function Features() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 py-16 md:py-20">
        <PageHero
          label="Features"
          title={<>A complete <span className="text-gradient">learning engine</span>.</>}
          intro="Everything you need to turn study materials into understanding. Click on any feature card to directly open and use its dedicated workspace."
        />

        {/* Feature Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((i) => {
            const isComingSoon = (i as any).comingSoon;
            if (isComingSoon) {
              return (
                <div
                  key={i.id}
                  id={i.id}
                  className="panel scroll-mt-24 p-6 block opacity-75 border-dashed border-border/80 transition-all duration-300 relative cursor-not-allowed select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <i.icon className="h-6 w-6" aria-hidden />
                    </div>
                    <span className="font-mono text-xs text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                      Coming Soon
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-foreground/80">
                    {i.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {i.long}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground/90 font-mono">
                      <strong className="text-foreground/80">Status:</strong> Under active enhancement
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400/90 inline-flex items-center gap-1">
                      Feature Coming Soon ⏳
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={i.id}
                id={i.id}
                to={i.path as any}
                className="panel scroll-mt-24 p-6 group block transition-all duration-300 hover:border-primary/60 hover:shadow-glow hover:-translate-y-1 relative cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <i.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="font-mono text-xs text-primary font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    Open Tool <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {i.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {i.long}
                </p>

                {/* Required Inputs Tag */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground/90 font-mono">
                    <strong className="text-foreground/80">Inputs:</strong> {i.inputs}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 group-hover:underline">
                    Launch {i.cta} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <PrimaryButton to="/dashboard">
            Open Full Dashboard <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </section>
    </SiteLayout>
  );
}
