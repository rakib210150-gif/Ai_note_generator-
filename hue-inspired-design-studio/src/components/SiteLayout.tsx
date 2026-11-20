import { Link, type LinkProps } from "@tanstack/react-router";
import { BrainCircuit, Menu, Sparkles, X, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { isAuthenticated, getUser, logout } from "@/lib/store";

type To = NonNullable<LinkProps["to"]>;

const nav = [
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/institutions", label: "For Institutions" },
  { to: "/about", label: "About" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Brain Nest home">
      <span className="relative grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-accent">
        <BrainCircuit className="h-5 w-5 text-primary" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Brain<span className="text-primary">Nest</span>
      </span>
    </Link>
  );
}

export function PrimaryButton({ children, to = "/signup" }: { children: ReactNode; to?: To }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      {children}
    </Link>
  );
}

export function GhostButton({ children, to }: { children: ReactNode; to: To }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </Link>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">// {children}</p>;
}

export function PageHero({ label, title, intro }: { label: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <SectionLabel>{label}</SectionLabel>
      <h1 className="mt-3 text-4xl font-bold md:text-6xl">{title}</h1>
      {intro && <p className="mt-5 text-lg text-muted-foreground">{intro}</p>}
    </div>
  );
}

function AnnouncementBar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(localStorage.getItem("bn-announce-dismissed") !== "1");
  }, []);
  if (!open) return null;
  return (
    <div className="relative border-b border-primary/30 bg-accent px-10 py-2 text-center text-xs text-accent-foreground sm:text-sm">
      <Sparkles className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
      New: start with <strong>500 free coins</strong> when accounts open.{" "}
      <Link to="/faq" className="underline underline-offset-2 hover:text-primary">Learn more</Link>
      <button
        onClick={() => { localStorage.setItem("bn-announce-dismissed", "1"); setOpen(false); }}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-background/40"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

const footerCols = [
  { h: "Product", l: [{ to: "/features", t: "Features" }, { to: "/how-it-works", t: "How It Works" }, { to: "/pricing", t: "Pricing" }, { to: "/institutions", t: "Institutions" }] },
  { h: "Company", l: [{ to: "/about", t: "About" }, { to: "/contact", t: "Contact & support" }, { to: "/faq", t: "FAQ" }] },
  { h: "Legal", l: [{ to: "/privacy", t: "Privacy Policy" }, { to: "/terms", t: "Terms of Service" }] },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background blueprint">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <AnnouncementBar />
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="text-sm text-muted-foreground transition-colors hover:text-primary" activeProps={{ className: "!text-primary" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated() ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Go to Workspace
                </Link>
                <button
                  onClick={() => {
                    logout();
                    window.location.reload();
                  }}
                  className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium hover:text-primary">
                  Log In
                </Link>
                <PrimaryButton to="/signup">Get Started Free</PrimaryButton>
              </>
            )}
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-lg border border-border lg:hidden" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={menu ? "Close menu" : "Open menu"}>
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menu && (
          <nav className="border-t border-border bg-background px-5 pb-6 pt-2 lg:hidden" aria-label="Mobile">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenu(false)} className="flex min-h-12 items-center border-b border-border/50 text-base" activeProps={{ className: "text-primary" }}>
                {n.label}
              </Link>
            ))}
            {isAuthenticated() ? (
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMenu(false)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 px-4 font-semibold text-primary-foreground shadow-glow text-sm"
                >
                  <LayoutDashboard className="h-4 w-4" /> Go to Workspace
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenu(false);
                    window.location.reload();
                  }}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenu(false)} className="flex min-h-12 items-center text-base">Log In</Link>
                <div className="mt-3"><PrimaryButton to="/signup">Get Started Free</PrimaryButton></div>
              </>
            )}
          </nav>
        )}
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">AI-powered study and exam preparation platform. Learn Smarter. Prepare Better. Achieve More.</p>
          </div>
          {footerCols.map((c) => (
            <div key={c.h}>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">{c.h}</p>
              <ul className="mt-4 space-y-2">
                {c.l.map((l) => (
                  <li key={l.to}><Link to={l.to} className="text-sm text-muted-foreground hover:text-primary">{l.t}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">© 2026 Brain Nest. All rights reserved.</div>
      </footer>
    </div>
  );
}
