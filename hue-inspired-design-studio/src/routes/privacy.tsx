import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Brain Nest" },
      { name: "description", content: "How Brain Nest collects, uses, stores and protects your personal data and uploaded documents." },
      { property: "og:title", content: "Brain Nest Privacy Policy" },
      { property: "og:description", content: "How we handle your data and study materials." },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" sections={[
      ["Data we collect", "Account details you provide (full name, email, mobile number with country code, country), documents you upload, content you generate, and basic usage information such as feature usage and coin transactions."],
      ["Why we process it", "To create and secure your account, deliver study tools, manage coins and subscriptions, provide support, and — only with your consent — send marketing messages."],
      ["Authentication and security", "Passwords are never stored in plain text. Access to private data is restricted to your account and authorized administrators."],
      ["Document uploads and AI processing", "Uploaded documents are stored privately. Relevant text is sent to our AI provider only to produce the output you request."],
      ["Third-party service providers", "We use hosting, database, authentication, AI and payment providers that process data on our behalf. The final list will be published here before launch."],
      ["Cookies and analytics", "We use essential storage needed for sign-in and preferences. Any analytics will be described here before it is enabled."],
      ["Marketing consent", "Marketing consent is optional, unchecked by default and can be withdrawn at any time."],
      ["Data retention and deletion", "You can delete documents and your account. Retention periods will be specified here before launch."],
      ["Contact", "Questions about privacy can be sent via the contact page."],
    ]} />
  ),
});
