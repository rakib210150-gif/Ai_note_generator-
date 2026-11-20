import { AlertTriangle } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/SiteLayout";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <PageHero label="Legal" title={title} />
        <div className="mt-8 flex gap-3 rounded-lg border border-chart-4/40 bg-chart-4/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-chart-4" />
          <p>Draft for legal review — this text must be reviewed and finalized by the owner before launch. Last updated: October 2026.</p>
        </div>
        <div className="mt-10 space-y-8">
          {sections.map(([h, b], i) => (
            <section key={h}>
              <h2 className="text-xl font-semibold">{i + 1}. {h}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{b}</p>
            </section>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
