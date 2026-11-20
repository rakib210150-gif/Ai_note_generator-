import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Info } from "lucide-react";

type Fields = { name: string; email: string; category: string; subject: string; message: string; organization: string; consent: boolean; website: string };
const empty: Fields = { name: "", email: "", category: "", subject: "", message: "", organization: "", consent: false, website: "" };

export function validateInquiry(f: Fields) {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (!f.category) e.category = "Please choose an inquiry type.";
  if (f.subject.trim().length < 3) e.subject = "Please add a short subject.";
  if (f.message.trim().length < 10) e.message = "Your message should be at least 10 characters.";
  if (f.message.length > 2000) e.message = "Please keep your message under 2000 characters.";
  if (!f.consent) e.consent = "Please agree so we can reply to you.";
  return e;
}

const input = "mt-1.5 w-full min-h-11 rounded-lg border border-input bg-background/70 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InquiryForm({ categories, defaultCategory = "" }: { categories: string[]; defaultCategory?: string }) {
  const [f, setF] = useState<Fields>({ ...empty, category: defaultCategory });
  const [errors, setErrors] = useState<ReturnType<typeof validateInquiry>>({});
  const [done, setDone] = useState(false);
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((p) => ({ ...p, [k]: v }));

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (f.website) return; // spam honeypot
    const e = validateInquiry(f);
    setErrors(e);
    if (Object.keys(e).length === 0) setDone(true);
  }

  if (done) {
    return (
      <div className="panel p-8" role="status">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <h3 className="mt-4 text-xl font-semibold">Your details look good</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Message delivery is not connected yet, so this message was <strong>not sent</strong>. It will be saved and delivered once the support inbox is set up in the next phase.
        </p>
        <button className="mt-6 text-sm text-primary underline" onClick={() => { setF(empty); setDone(false); }}>Write another message</button>
      </div>
    );
  }

  const err = (k: keyof Fields) => errors[k] && <p id={`${k}-err`} className="mt-1 text-xs text-destructive" role="alert">{errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="panel space-y-5 p-6 md:p-8">
      <div className="flex gap-2 rounded-lg border border-border bg-accent/50 p-3 text-xs text-accent-foreground">
        <Info className="h-4 w-4 shrink-0" /> Demo form: messages are checked but not yet delivered until the support inbox is configured.
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">Full name *
          <input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby="name-err" autoComplete="name" />
          {err("name")}
        </label>
        <label className="block text-sm font-medium">Email address *
          <input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-err" autoComplete="email" />
          {err("email")}
        </label>
        <label className="block text-sm font-medium">Inquiry type *
          <select className={input} value={f.category} onChange={(e) => set("category", e.target.value)} aria-invalid={!!errors.category}>
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          {err("category")}
        </label>
        <label className="block text-sm font-medium">Organization (optional)
          <input className={input} value={f.organization} onChange={(e) => set("organization", e.target.value)} autoComplete="organization" />
        </label>
      </div>
      <label className="block text-sm font-medium">Subject *
        <input className={input} value={f.subject} onChange={(e) => set("subject", e.target.value)} aria-invalid={!!errors.subject} />
        {err("subject")}
      </label>
      <label className="block text-sm font-medium">Message *
        <textarea rows={5} className={input} value={f.message} onChange={(e) => set("message", e.target.value)} aria-invalid={!!errors.message} />
        {err("message")}
      </label>
      <input tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} aria-hidden />
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
        <span>I agree that Brain Nest may use these details to reply, as described in the <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.</span>
      </label>
      {err("consent")}
      <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow">Check & send</button>
    </form>
  );
}
