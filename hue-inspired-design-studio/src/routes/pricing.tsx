import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { GhostButton, PageHero, PrimaryButton, SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Brain Nest" },
      { name: "description", content: "Free, Pro ($15/mo for 5,000 monthly credits) and Platinum ($25/mo for 35,000 monthly credits) plans for Brain Nest learners." },
      { property: "og:title", content: "Brain Nest Pricing — Flexible Plans for Learners" },
      { property: "og:description", content: "Choose Free, Pro ($15/mo with 5,000 credits) or Platinum ($25/mo with 35,000 credits) to supercharge your study efficiency." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    n: "Free",
    p: "Free",
    sub: "Essential tools to kickstart your learning journey",
    f: [
      "500 starter credits after verification",
      "Basic study tools & notes generator",
      "Real-time document editor & PDF export",
      "Standard AI processing speed",
      "Daily bonus credits (+50 daily)",
    ],
    cta: "free",
  },
  {
    n: "Pro",
    p: "$15",
    period: "/month",
    hot: true,
    badge: "MOST POPULAR",
    sub: "Ideal for power learners needing regular AI study intelligence",
    f: [
      "5,000 monthly AI credits",
      "Higher usage limits & larger document uploads",
      "Adaptive quiz & exam practice generator",
      "Full interactive AI tutor access",
      "Fast priority queue processing",
      "Extra productivity & document export tools",
    ],
    cta: "pro",
  },
  {
    n: "Platinum",
    p: "$25",
    period: "/month",
    sub: "Maximum power for intensive research & exam preparation",
    f: [
      "35,000 monthly AI credits",
      "Massive document digestion & full syllabus analysis",
      "Instant priority AI processing speed",
      "Comprehensive exam simulator & mock tests",
      "Unlimited flashcards & practice questions",
      "Dedicated priority customer support",
    ],
    cta: "platinum",
  },
];

function Pricing() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <PageHero
          label="Pricing"
          title={
            <>
              Invest in your <span className="text-gradient">brain</span>.
            </>
          }
          intro="Simple, transparent plans designed for every learner. Recharge monthly credits to unlock higher speeds, larger documents, and AI-powered intelligence."
        />

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {plans.map((p) => {
            const isFeatured = Boolean(p.hot);

            return (
              <div
                key={p.n}
                className={`relative flex flex-col rounded-3xl p-8 transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none ${
                  isFeatured
                    ? "z-10 border-2 border-primary bg-card/90 shadow-[0_0_40px_-10px_oklch(0.82_0.13_185_/_0.35)] backdrop-blur-md hover:border-primary hover:shadow-[0_0_60px_-5px_oklch(0.82_0.13_185_/_0.55)] md:-translate-y-2 md:hover:-translate-y-3"
                    : "panel border border-border/80 bg-card/60 hover:-translate-y-1.5 hover:border-primary/50"
                }`}
              >
                {/* Subtle ambient cyan glow inside Pro card */}
                {isFeatured && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,_oklch(0.82_0.13_185_/_0.16),_transparent_70%)]"
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                      aria-hidden="true"
                    />

                    {/* Prominent MOST POPULAR Badge */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/70 bg-background/95 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary shadow-[0_0_20px_-3px_oklch(0.82_0.13_185_/_0.5)] backdrop-blur-sm">
                        <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                        {p.badge ?? "MOST POPULAR"}
                      </span>
                    </div>
                  </>
                )}

                {/* Plan Header */}
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{p.n}</h2>
                  {isFeatured && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
                      Featured Plan
                    </span>
                  )}
                </div>

                {/* Plan Price */}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <p className="font-display text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
                    {p.p}
                  </p>
                  {p.period && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {p.period}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.sub}</p>

                {/* Divider */}
                <div className="my-6 h-px w-full bg-border/60" />

                {/* Plan Features */}
                <ul className="flex-1 space-y-3.5" aria-label={`${p.n} plan features`}>
                  {p.f.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isFeatured ? "text-primary drop-shadow-[0_0_6px_oklch(0.82_0.13_185_/_0.6)]" : "text-primary/70"
                        }`}
                        aria-hidden="true"
                      />
                      <span className={isFeatured ? "font-medium text-foreground/95" : "text-muted-foreground"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Action */}
                <div className="mt-8 pt-2">
                  {p.cta === "free" && (
                    <div className="w-full *:flex *:w-full *:justify-center">
                      <GhostButton to="/signup">Get Started Free</GhostButton>
                    </div>
                  )}

                  {p.cta === "pro" && (
                    <div className="w-full *:flex *:w-full *:justify-center">
                      <PrimaryButton to="/signup">Get Pro — $15/mo</PrimaryButton>
                    </div>
                  )}

                  {p.cta === "platinum" && (
                    <div className="w-full *:flex *:w-full *:justify-center">
                      <GhostButton to="/signup">Get Platinum — $25/mo</GhostButton>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
