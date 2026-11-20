import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Building2, Settings2, Users } from "lucide-react";
import { PageHero, SectionLabel, SiteLayout } from "@/components/SiteLayout";
import { InquiryForm } from "@/components/InquiryForm";

export const Route = createFileRoute("/institutions")({
  head: () => ({
    meta: [
      { title: "Brain Nest for Institutions — Schools, Universities & Coaching Centers" },
      { name: "description", content: "Organization-level AI study tools, member management, usage limits and reporting for educational institutions." },
      { property: "og:title", content: "Brain Nest for Institutions" },
      { property: "og:description", content: "Bring AI-assisted study tools to your whole organization." },
    ],
  }),
  component: Institutions,
});

const perks = [
  { i: Building2, t: "For every kind of organization", d: "Schools, colleges, universities and coaching centers." },
  { i: Users, t: "Member management", d: "Invite learners and staff, and control who can do what." },
  { i: Settings2, t: "Configurable limits", d: "Set usage limits per member or group." },
  { i: BarChart3, t: "Usage & adoption reports", d: "See how your members use Brain Nest." },
];

function Institutions() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 py-16 md:py-20">
        <PageHero label="For institutions" title={<>Smarter studying, <span className="text-gradient">at scale</span>.</>} intro="Give your learners organized, syllabus-aligned AI study tools with administration, reporting and billing at the organization level." />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p) => (
            <div key={p.t} className="panel p-6">
              <p.i className="h-7 w-7 text-primary" />
              <h2 className="mt-4 font-semibold">{p.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-20 grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SectionLabel>Request a demo</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold">Talk to us about your organization.</h2>
            <p className="mt-4 text-muted-foreground">Tell us about your institution and what you need. Institutional pricing is set per organization.</p>
          </div>
          <div className="lg:col-span-3"><InquiryForm categories={["Institution demo", "Institutional pricing", "Partnership"]} defaultCategory="Institution demo" /></div>
        </div>
      </section>
    </SiteLayout>
  );
}
