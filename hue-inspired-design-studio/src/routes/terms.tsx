import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Brain Nest" },
      { name: "description", content: "The terms for using Brain Nest, including coins, subscriptions, AI-generated content and account rules." },
      { property: "og:title", content: "Brain Nest Terms of Service" },
      { property: "og:description", content: "Rules for using Brain Nest." },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Service" sections={[
      ["Using Brain Nest", "Brain Nest provides AI-assisted study tools. You must provide accurate account information and keep your login secure."],
      ["Your responsibilities", "Only upload material you have the right to use. Do not misuse the service, attempt to access other users' data, or abuse AI features."],
      ["AI-generated content", "AI output may contain errors or omissions and is not verified. You are responsible for checking it against reliable sources. Past-paper analysis does not predict future exams."],
      ["Coins", "Coins are used for eligible AI tools. Starter coins are promotional, granted once per verified account, and have no cash value. Costs are shown before each action."],
      ["Subscriptions, billing and refunds", "Paid plans, prices, billing cycles and refund rules will be published before paid plans launch."],
      ["Account termination", "You may close your account at any time. We may suspend accounts that break these terms."],
      ["Changes", "We may update these terms and will notify users of significant changes."],
      ["Contact", "Questions about these terms can be sent via the contact page."],
    ]} />
  ),
});
