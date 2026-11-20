import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { setCurrentUser } from "@/lib/store";
import { api } from "@/lib/api";
import { LogIn, BrainCircuit, AlertCircle, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Brain Nest" },
      { name: "description", content: "Log in to your Brain Nest study workspace." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Log in — Brain Nest" },
      { property: "og:description", content: "Access your Brain Nest workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Read redirect target and optional auth notice from search params
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const authNotice = searchParams.get("message");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.login(email.trim(), password);

      if (res.success && res.data?.user) {
        const u = res.data.user;
        setCurrentUser({
          id: u.id,
          name: u.name || email.split("@")[0] || "Student",
          email: u.email,
          mobileNumber: u.mobileNumber,
          country: u.country,
          coins: u.coins ?? 500,
          classLevel: u.classLevel || u.class_level || "9-10",
          createdAt: u.createdAt || new Date().toISOString(),
        });

        // Navigate to originally requested feature or dashboard
        if (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) {
          window.location.href = redirectTarget;
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        setError(
          res.message ||
            "Invalid email or password. If you do not have an account yet, please register first."
        );
        setLoading(false);
      }
    } catch (err: any) {
      setError(
        err?.message || "Unable to sign in. Please verify your credentials and try again."
      );
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-5 py-16">
        <div className="panel p-8 bg-card border border-border shadow-2xl rounded-2xl">
          <div className="flex justify-center mb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/40 bg-accent shadow-glow">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </span>
          </div>

          <h1 className="text-2xl font-bold text-center">Log In to Brain Nest</h1>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Sign in with your registered account to access your AI study tools.
          </p>

          {authNotice && (
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Sign-In Required</p>
                <p className="text-muted-foreground mt-0.5">{authNotice}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Gmail or Email Address
              </label>
              <input
                type="email"
                required
                placeholder="student@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 px-4 font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In to Workspace
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/70 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account yet?{" "}
              <Link
                to="/signup"
                search={{ redirect: redirectTarget } as any}
                className="text-primary font-semibold hover:underline"
              >
                Register here (+500 Starter Coins)
              </Link>
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
