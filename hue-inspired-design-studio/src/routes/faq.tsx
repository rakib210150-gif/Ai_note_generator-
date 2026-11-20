import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHero, SiteLayout } from "@/components/SiteLayout";

const faqs: [string, string][] = [
  ["What does Brain Nest do?", "Brain Nest turns textbooks, PDFs, lecture notes, syllabuses and past papers into organized, exam-focused study materials: notes, revision sheets, quizzes and question analysis."],
  ["How does AI note generation work?", "You choose a subject, chapter, difficulty, language and output type, optionally upload a document, and the AI generates structured notes you can edit, save and download."],
  ["Which upload formats are supported?", "PDF and DOCX files, within size limits shown at upload. Scanned PDFs need text recognition, which will be supported once configured."],
  ["How do syllabus-based notes work?", "You enter your subjects, chapters and learning objectives. Notes are generated to match that syllabus rather than giving generic answers."],
  ["What are the 500 free coins?", "Every new account receives 500 starter coins, once, after verifying its email address. Coins are used for eligible AI tools."],
  ["How is coin usage calculated?", "Each tool and operation has its own cost, which can depend on the size of the request. You always see the cost before confirming, and every change is listed in your wallet history."],
  ["Can generated content be inaccurate?", "Yes. AI output can contain errors or omissions. Always check important information against your syllabus, textbooks and teachers."],
  ["How does previous-question analysis work?", "You upload past papers or type questions. Brain Nest groups them by topic and shows recurring formats — based only on the papers you provided."],
  ["Can you guarantee future exam questions?", "No. Historical patterns help you prioritize revision but never guarantee what will appear in a future exam."],
  ["How do I download and edit notes?", "Open any note in the Real-Time Document Editor where you can edit, format, and download as PDF or DOCX."],
  ["How do subscriptions work?", "You can start free with 500 starter coins. For higher monthly study limits, you can subscribe to Pro ($15/mo for 5,000 monthly credits) or Platinum ($25/mo for 35,000 monthly credits)."],
  ["How are uploaded documents protected?", "Documents are stored privately for your account and can only be opened by you (or your authorized institution)."],
  ["How do I reset my password?", "Use the “Forgot password” link on the login page and follow the email instructions."],
  ["How do I delete my account?", "From account settings, or by contacting support. Your data is removed according to our Privacy Policy."],
  ["How do I contact support?", "Use the contact form — we'll reply to the email you provide."],
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Brain Nest" },
      { name: "description", content: "Answers about Brain Nest AI notes, uploads, 500 free coins, coin costs, accuracy, privacy and subscriptions." },
      { property: "og:title", content: "Brain Nest FAQ" },
      { property: "og:description", content: "Frequently asked questions about Brain Nest." },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }),
    }],
  }),
  component: Faq,
});

function Faq() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <PageHero label="FAQ" title={<>Questions, <span className="text-gradient">answered</span>.</>} />
        <Accordion type="single" collapsible className="mt-12 panel px-6">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-8 text-sm text-muted-foreground">Still stuck? <Link to="/contact" className="text-primary underline">Contact support</Link>.</p>
      </section>
    </SiteLayout>
  );
}
