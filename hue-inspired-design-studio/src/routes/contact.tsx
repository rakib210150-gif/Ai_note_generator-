import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/SiteLayout";
import { InquiryForm } from "@/components/InquiryForm";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — Brain Nest" },
      { name: "description", content: "Questions about Brain Nest, your account, coins or institutional plans? Send us a message." },
      { property: "og:title", content: "Contact Brain Nest" },
      { property: "og:description", content: "Get help or ask a question about Brain Nest." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <SiteLayout>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:py-20 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <PageHero label="Contact" title={<>We're here to <span className="text-gradient">help</span>.</>} intro="Send a message about your account, coins, billing or anything else." />
          <p className="mt-6 text-sm text-muted-foreground">Looking for a quick answer? Check the <Link to="/faq" className="text-primary underline">FAQ</Link> first.</p>
        </div>
        <div className="lg:col-span-3"><InquiryForm categories={["General question", "Account & login", "Coins & billing", "Technical problem", "Institutions", "Feedback"]} /></div>
      </section>
    </SiteLayout>
  );
}
